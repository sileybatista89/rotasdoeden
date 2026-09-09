/**
 * Fase 7D — Pricing Engine server-side.
 * Só administradores podem invocar. O preço é sempre recalculado aqui a partir
 * dos custos guardados na base de dados: nunca se aceita preço, margem ou
 * política enviados pelo cliente.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  calculatePricing,
  type PricingComponentInput,
  type PricingPolicyVersion,
  type RateCandidate,
} from "../_shared/pricing-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const componentIds: string[] = Array.isArray(body.component_ids)
      ? body.component_ids.filter((v: unknown) => typeof v === "string").slice(0, 200)
      : [];
    const durationDays = Number(body.duration_days ?? 0);
    const nights = Number(body.nights ?? Math.max(durationDays - 1, 0));
    const adults = Number(body.adults ?? 0);
    const children = Number(body.children ?? 0);
    const rooms = Number(body.rooms ?? 1);
    const referenceDate = typeof body.reference_date === "string"
      ? body.reference_date
      : new Date().toISOString().slice(0, 10);
    const persist = body.persist === true;

    // Política: apenas a versão ATIVA na base de dados. Nunca vinda do cliente.
    const { data: versionRow, error: versionError } = await admin
      .from("pricing_policy_versions")
      .select("*")
      .eq("status", "active")
      .maybeSingle();
    if (versionError) return json({ error: versionError.message }, 500);
    if (!versionRow) return json({ error: "Não existe política de preços ativa." }, 409);

    const policy: PricingPolicyVersion = {
      id: versionRow.id,
      policyId: versionRow.policy_id,
      versionNumber: versionRow.version_number,
      status: versionRow.status,
      baseCurrency: versionRow.base_currency,
      marginMode: versionRow.margin_mode,
      minMarginPct: Number(versionRow.min_margin_pct),
      targetMarginPct: Number(versionRow.target_margin_pct),
      componentRules: versionRow.component_rules ?? {},
      flightProtection: versionRow.flight_protection ?? { method: "percentage", value: 0 },
      fees: versionRow.fees ?? [],
      supplements: versionRow.supplements ?? [],
      operationalCosts: versionRow.operational_costs ?? [],
      roundingMode: versionRow.rounding_mode,
      validFrom: versionRow.valid_from,
      validUntil: versionRow.valid_until,
    };

    let components: PricingComponentInput[] = [];
    if (componentIds.length > 0) {
      const { data: compRows, error: compError } = await admin
        .from("package_components")
        .select("id, name, component_type")
        .in("id", componentIds);
      if (compError) return json({ error: compError.message }, 500);

      const { data: rateRows, error: rateError } = await admin
        .from("component_rates")
        .select("*")
        .in("component_id", componentIds);
      if (rateError) return json({ error: rateError.message }, 500);

      components = (compRows ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        componentType: c.component_type,
        rates: (rateRows ?? [])
          .filter((r) => r.component_id === c.id)
          .map((r): RateCandidate => ({
            id: r.id,
            kind: r.rate_kind,
            status: r.status,
            price: Number(r.price),
            currency: r.currency,
            unit: r.unit,
            quantity: Number(r.quantity ?? 1),
            occupancyAdults: r.occupancy_adults,
            occupancyChildren: r.occupancy_children,
            occupancyTotal: r.occupancy_total,
            validFrom: r.valid_from,
            validUntil: r.valid_until,
            validityUnknown: r.validity_unknown,
            sourceType: r.source_type,
            observedAt: r.observed_at,
          })),
      }));
    }

    const result = calculatePricing({
      policy,
      productId: typeof body.product_id === "string" ? body.product_id : null,
      productVersionId: typeof body.product_version_id === "string" ? body.product_version_id : null,
      durationDays,
      nights,
      adults,
      children,
      rooms,
      referenceDate,
      components,
    });

    if (persist) {
      await admin.from("pricing_calculations").insert({
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        product_id: result.productId,
        product_version_id: result.productVersionId,
        calculation_kind: "simulation",
        status: result.status,
        currency: result.currency,
        cost_total: result.costTotal,
        markup_total: result.markupTotal,
        gross_margin_pct: result.grossMarginPct,
        subtotal: result.subtotal,
        final_price: result.finalPrice,
        input: { componentIds, durationDays, nights, adults, children, rooms, referenceDate },
        result: result as unknown as Record<string, unknown>,
        warnings: result.warnings,
        validation_errors: result.validationErrors,
        created_by: user.id,
      });
    }

    return json({ result });
  } catch (e) {
    console.error("pricing-engine error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
