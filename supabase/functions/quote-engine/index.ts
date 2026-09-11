/**
 * Fase 7G — Quote Engine (server-side, apenas administradores).
 *
 * Ações: create, reprice, get, issue_token.
 *
 * O preço NUNCA vem do cliente: é sempre recalculado aqui pelo Pricing Engine
 * partilhado (Fase 7D) a partir de custos guardados na base de dados.
 * A cotação não cria reserva, não cobra, não cria order Duffel, não emite bilhete.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  calculatePricing,
  type PricingComponentInput,
  type PricingPolicyVersion,
  type RateCandidate,
} from "../_shared/pricing-engine.ts";
import {
  comparePrices,
  evaluateConfirmability,
  generatePublicToken,
  hashPublicToken,
  quoteIdempotencyKey,
  rejectForbiddenClientInput,
  resolveQuoteValidity,
  sanitizeCriteria,
  validateCriteria,
} from "../_shared/quote-engine.ts";

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

interface LoadedContext {
  policy: PricingPolicyVersion | null;
  components: PricingComponentInput[];
  rateRows: Record<string, any>[];
  compRows: Record<string, any>[];
}

async function loadPricingContext(admin: any, componentIds: string[]): Promise<LoadedContext> {
  const { data: versionRow } = await admin
    .from("pricing_policy_versions").select("*").eq("status", "active").maybeSingle();

  const policy: PricingPolicyVersion | null = versionRow
    ? {
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
      }
    : null;

  let compRows: Record<string, any>[] = [];
  let rateRows: Record<string, any>[] = [];
  if (componentIds.length > 0) {
    const { data: c } = await admin
      .from("package_components").select("id, name, component_type, supplier_id, status").in("id", componentIds);
    compRows = c ?? [];
    const { data: r } = await admin.from("component_rates").select("*").in("component_id", componentIds);
    rateRows = r ?? [];
  }

  const components: PricingComponentInput[] = compRows.map((c) => ({
    id: c.id,
    name: c.name,
    componentType: c.component_type,
    rates: rateRows.filter((r) => r.component_id === c.id).map((r): RateCandidate => ({
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

  return { policy, components, rateRows, compRows };
}

function flightSnapshotOf(offer: Record<string, any> | null) {
  if (!offer) return null;
  const slices = Array.isArray(offer.slices) ? offer.slices : [];
  return {
    provider: offer.provider,
    provider_offer_id: offer.provider_offer_id,
    airline: offer.owner_name ?? offer.owner_carrier ?? null,
    departure_date: slices[0]?.segments?.[0]?.departingAt ?? null,
    return_date: slices[1]?.segments?.[0]?.departingAt ?? null,
    total_amount: Number(offer.total_amount),
    currency: offer.total_currency,
    hold_capable: offer.hold_capable,
    requires_instant_payment: offer.requires_instant_payment,
    expires_at: offer.expires_at,
  };
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

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // O cliente nunca envia preço, custo, margem, markup ou política.
    const forbidden = rejectForbiddenClientInput(body);
    if (forbidden.length > 0) {
      return json({ error: `Campos não permitidos no pedido: ${forbidden.join(", ")}`, code: "forbidden_input" }, 400);
    }

    // ============ CREATE ============
    if (action === "create") {
      const criteria = sanitizeCriteria(body.criteria ?? {});
      const criteriaErrors = validateCriteria(criteria);
      if (criteriaErrors.length > 0) return json({ error: criteriaErrors.join(" "), code: "invalid_criteria" }, 400);

      const componentIds: string[] = Array.isArray(body.component_ids)
        ? body.component_ids.filter((v: unknown) => typeof v === "string").slice(0, 200)
        : [];
      const productVersionId: string | null = typeof body.product_version_id === "string" ? body.product_version_id : null;
      const flightProviderOfferId: string | null =
        typeof body.flight_provider_offer_id === "string" ? body.flight_provider_offer_id : null;

      // produto / versão
      let productRow: Record<string, any> | null = null;
      let versionRow: Record<string, any> | null = null;
      if (productVersionId) {
        const { data: v } = await admin.from("travel_product_versions").select("*").eq("id", productVersionId).maybeSingle();
        if (!v) return json({ error: "Versão do produto inexistente.", code: "invalid_product_version" }, 404);
        versionRow = v;
        const { data: p } = await admin.from("travel_products").select("*").eq("id", v.product_id).maybeSingle();
        productRow = p ?? null;
        if (v.status === "archived" || productRow?.status === "archived") {
          return json({ error: "A versão do produto está arquivada.", code: "product_archived" }, 409);
        }
      }

      // voo (opcional)
      let flightOffer: Record<string, any> | null = null;
      if (flightProviderOfferId) {
        const { data: o } = await admin.from("flight_offers").select("*")
          .eq("provider_offer_id", flightProviderOfferId).maybeSingle();
        if (!o) return json({ error: "Oferta de voo inexistente.", code: "flight_offer_not_found" }, 404);
        flightOffer = o;
      }

      const { policy, components, rateRows } = await loadPricingContext(admin, componentIds);
      if (!policy) return json({ error: "Não existe política de preços ativa.", code: "no_active_policy" }, 409);

      const idempotencyKey = quoteIdempotencyKey({
        productVersionId,
        criteria,
        componentIds,
        flightOfferId: flightProviderOfferId,
        policyVersionId: policy.id,
      });

      const { data: existing } = await admin.from("travel_quotes").select("*")
        .eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing && body.force !== true) {
        const { data: ver } = await admin.from("travel_quote_versions").select("*")
          .eq("id", existing.current_version_id).maybeSingle();
        return json({ quote: existing, version: ver, idempotent: true });
      }

      const referenceDate = criteria.departureDate ?? new Date().toISOString().slice(0, 10);
      const nights = criteria.nights ?? Math.max(criteria.durationDays - 1, 0);

      const result = calculatePricing({
        policy,
        productId: productRow?.id ?? null,
        productVersionId,
        durationDays: criteria.durationDays,
        nights,
        adults: criteria.adults,
        children: criteria.children ?? 0,
        rooms: criteria.rooms ?? 1,
        referenceDate,
        components,
        flightCost: flightOffer
          ? {
              amount: Number(flightOffer.total_amount),
              currency: flightOffer.total_currency,
              confirmed: flightOffer.status === "active",
            }
          : null,
      });

      const { data: calcRow } = await admin.from("pricing_calculations").insert({
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        product_id: result.productId,
        product_version_id: result.productVersionId,
        calculation_kind: "commercial",
        status: result.status,
        currency: result.currency,
        cost_total: result.costTotal,
        markup_total: result.markupTotal,
        gross_margin_pct: result.grossMarginPct,
        subtotal: result.subtotal,
        final_price: result.finalPrice,
        input: { componentIds, criteria, flightProviderOfferId },
        result: result as unknown as Record<string, unknown>,
        warnings: result.warnings,
        validation_errors: result.validationErrors,
        created_by: user.id,
      }).select("id").single();

      const usedRateIds = new Set(result.components.map((c) => c.rateId).filter(Boolean) as string[]);
      const usedRates = rateRows.filter((r) => usedRateIds.has(r.id));

      const validity = resolveQuoteValidity({
        operatorValidUntil: typeof body.valid_until === "string" ? body.valid_until : null,
        flightExpiresAt: flightOffer?.expires_at ?? null,
        rateValidUntil: usedRates.map((r) => r.valid_until),
      });

      const confirmability = evaluateConfirmability({
        pricingStatus: result.status,
        validationErrors: result.validationErrors,
        productStatus: versionRow?.status ?? null,
        policyActive: policy.status === "active",
        flight: flightOffer ? { present: true, expiresAt: flightOffer.expires_at, expired: flightOffer.status === "expired" } : null,
        rates: usedRates.map((r) => ({ validityUnknown: r.validity_unknown, validUntil: r.valid_until, status: r.status })),
        validUntil: validity.validUntil,
      });

      const { data: quote, error: quoteError } = await admin.from("travel_quotes").insert({
        product_id: productRow?.id ?? null,
        product_version_id: productVersionId,
        status: "calculated",
        sale_currency: result.currency,
        channel: typeof body.channel === "string" && ["admin", "public", "agent"].includes(body.channel) ? body.channel : "admin",
        visitor_id: typeof body.visitor_id === "string" ? body.visitor_id : null,
        attribution: body.attribution && typeof body.attribution === "object" ? body.attribution : {},
        customer_name: typeof body.customer_name === "string" ? body.customer_name.slice(0, 120) : null,
        customer_email: typeof body.customer_email === "string" ? body.customer_email.slice(0, 160) : null,
        idempotency_key: body.force === true ? `${idempotencyKey}_${Date.now()}` : idempotencyKey,
        expires_at: validity.validUntil,
        version_count: 1,
        created_by: user.id,
      }).select("*").single();
      if (quoteError) return json({ error: quoteError.message }, 500);

      const { data: version, error: versionError } = await admin.from("travel_quote_versions").insert({
        quote_id: quote.id,
        version_number: 1,
        status: "calculated",
        customer_criteria: criteria as unknown as Record<string, unknown>,
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        pricing_calculation_id: calcRow?.id ?? null,
        pricing_status: result.status,
        total_cost: result.costTotal,
        total_price: result.finalPrice,
        cost_currency: result.currency,
        sale_currency: result.currency,
        flight_offer_id: flightOffer?.id ?? null,
        flight_provider_offer_id: flightOffer?.provider_offer_id ?? null,
        flight_expires_at: flightOffer?.expires_at ?? null,
        flight_snapshot: flightSnapshotOf(flightOffer),
        valid_until: validity.validUntil,
        validity_limited_by: validity.limitedBy,
        confirmable: confirmability.confirmable,
        blocking_reasons: confirmability.blockingReasons,
        warnings: result.warnings,
        change_reason: "Cotação inicial",
        created_by: user.id,
      }).select("*").single();
      if (versionError) return json({ error: versionError.message }, 500);

      const items = result.components.map((line, i) => {
        const rate = rateRows.find((r) => r.id === line.rateId);
        return {
          quote_version_id: version.id,
          line_order: i,
          component_id: line.componentId,
          rate_id: line.rateId,
          supplier_id: rate?.supplier_id ?? null,
          display_name: line.name,
          component_type: line.componentType,
          quantity: line.quantity,
          unit: line.unit,
          unit_cost: line.unitPrice,
          total_cost: line.cost,
          rule_mode: line.ruleMode,
          rule_pct: line.rulePct,
          selling_price: line.sellPrice,
          currency: line.currency,
          rate_kind: line.rateKind,
          rate_status: rate?.status ?? null,
          source_type: rate?.source_type ?? null,
          source_reference: rate?.source_reference ?? null,
          rate_valid_from: rate?.valid_from ?? null,
          rate_valid_until: rate?.valid_until ?? null,
          validity_unknown: rate?.validity_unknown ?? false,
          cancellation_type: rate?.cancellation_type ?? null,
          cancellation_summary: rate?.cancellation_summary ?? null,
          estimated: line.estimated,
          notes: line.notes,
        };
      });
      if (items.length > 0) await admin.from("travel_quote_items").insert(items);

      await admin.from("travel_quotes").update({ current_version_id: version.id }).eq("id", quote.id);
      await admin.from("admin_audit_log").insert({
        admin_id: user.id, action: "quote_created", entity_type: "travel_quote", entity_id: quote.id,
        details: { quote_number: quote.quote_number, version: 1, price: result.finalPrice, status: result.status },
      });

      return json({
        quote: { ...quote, current_version_id: version.id },
        version,
        items,
        pricing: { status: result.status, warnings: result.warnings, validation_errors: result.validationErrors },
        confirmable: confirmability.confirmable,
        blocking_reasons: confirmability.blockingReasons,
      });
    }

    // ============ REPRICE ============
    if (action === "reprice") {
      const quoteId = String(body.quote_id ?? "");
      const { data: quote } = await admin.from("travel_quotes").select("*").eq("id", quoteId).maybeSingle();
      if (!quote) return json({ error: "Cotação inexistente.", code: "quote_not_found" }, 404);
      if (["cancelled", "accepted"].includes(quote.status)) {
        return json({ error: "Esta cotação já não pode ser recalculada.", code: "invalid_state" }, 409);
      }
      const { data: current } = await admin.from("travel_quote_versions").select("*")
        .eq("id", quote.current_version_id).maybeSingle();
      if (!current) return json({ error: "Versão atual inexistente.", code: "version_not_found" }, 404);

      const { data: currentItems } = await admin.from("travel_quote_items").select("component_id")
        .eq("quote_version_id", current.id);
      const componentIds = [...new Set((currentItems ?? []).map((i: any) => i.component_id).filter(Boolean))] as string[];

      // 1. voo — reconsulta antes de qualquer cálculo
      let flightOffer: Record<string, any> | null = null;
      let flightNote: string | null = null;
      if (current.flight_provider_offer_id) {
        const refreshRes = await fetch(`${supabaseUrl}/functions/v1/flight-engine`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json", apikey: anonKey },
          body: JSON.stringify({ action: "refresh_offer", provider_offer_id: current.flight_provider_offer_id }),
        });
        const refreshBody = await refreshRes.json().catch(() => ({}));
        if (!refreshRes.ok) {
          flightNote = `Reconsulta de voo indisponível: ${refreshBody.code ?? "erro"}.`;
        } else {
          flightNote = `Voo: ${refreshBody.reprice?.status ?? "desconhecido"}.`;
        }
        const { data: o } = await admin.from("flight_offers").select("*")
          .eq("provider_offer_id", current.flight_provider_offer_id).maybeSingle();
        flightOffer = o ?? null;
      }

      const { policy, components, rateRows } = await loadPricingContext(admin, componentIds);
      if (!policy) return json({ error: "Não existe política de preços ativa.", code: "no_active_policy" }, 409);

      const criteria = sanitizeCriteria(current.customer_criteria ?? {});
      const referenceDate = criteria.departureDate ?? new Date().toISOString().slice(0, 10);
      const result = calculatePricing({
        policy,
        productId: quote.product_id,
        productVersionId: quote.product_version_id,
        durationDays: criteria.durationDays,
        nights: criteria.nights ?? Math.max(criteria.durationDays - 1, 0),
        adults: criteria.adults,
        children: criteria.children ?? 0,
        rooms: criteria.rooms ?? 1,
        referenceDate,
        components,
        flightCost: flightOffer
          ? { amount: Number(flightOffer.total_amount), currency: flightOffer.total_currency, confirmed: flightOffer.status === "active" }
          : null,
      });

      const comparison = comparePrices(Number(current.total_price), result.finalPrice);
      const policyChanged = current.policy_version_id !== policy.id;

      if (!comparison.changed && !policyChanged && body.force !== true) {
        await admin.from("admin_audit_log").insert({
          admin_id: user.id, action: "quote_repriced_unchanged", entity_type: "travel_quote", entity_id: quote.id,
          details: { price: result.finalPrice, flight: flightNote },
        });
        return json({ changed: false, message: "Sem alteração.", comparison, flight: flightNote });
      }

      // 2. nova versão — a anterior nunca é sobrescrita
      const { data: calcRow } = await admin.from("pricing_calculations").insert({
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        product_id: result.productId,
        product_version_id: result.productVersionId,
        calculation_kind: "commercial",
        status: result.status,
        currency: result.currency,
        cost_total: result.costTotal,
        markup_total: result.markupTotal,
        gross_margin_pct: result.grossMarginPct,
        subtotal: result.subtotal,
        final_price: result.finalPrice,
        input: { componentIds, criteria, reprice_of: current.id },
        result: result as unknown as Record<string, unknown>,
        warnings: result.warnings,
        validation_errors: result.validationErrors,
        created_by: user.id,
      }).select("id").single();

      const usedRateIds = new Set(result.components.map((c) => c.rateId).filter(Boolean) as string[]);
      const usedRates = rateRows.filter((r) => usedRateIds.has(r.id));
      const validity = resolveQuoteValidity({
        operatorValidUntil: typeof body.valid_until === "string" ? body.valid_until : null,
        flightExpiresAt: flightOffer?.expires_at ?? null,
        rateValidUntil: usedRates.map((r) => r.valid_until),
      });
      const confirmability = evaluateConfirmability({
        pricingStatus: result.status,
        validationErrors: result.validationErrors,
        policyActive: policy.status === "active",
        flight: flightOffer ? { present: true, expiresAt: flightOffer.expires_at, expired: flightOffer.status === "expired" } : null,
        rates: usedRates.map((r) => ({ validityUnknown: r.validity_unknown, validUntil: r.valid_until, status: r.status })),
        validUntil: validity.validUntil,
      });

      const reasonParts = [
        comparison.changed ? `Preço alterado de ${comparison.previousPrice} para ${comparison.newPrice} (${comparison.difference >= 0 ? "+" : ""}${comparison.difference}).` : null,
        policyChanged ? "Política de preços alterada." : null,
        flightNote,
      ].filter(Boolean);

      const { data: newVersion, error: nvError } = await admin.from("travel_quote_versions").insert({
        quote_id: quote.id,
        version_number: Number(current.version_number) + 1,
        status: "calculated",
        customer_criteria: current.customer_criteria,
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        pricing_calculation_id: calcRow?.id ?? null,
        pricing_status: result.status,
        total_cost: result.costTotal,
        total_price: result.finalPrice,
        cost_currency: result.currency,
        sale_currency: result.currency,
        flight_offer_id: flightOffer?.id ?? null,
        flight_provider_offer_id: flightOffer?.provider_offer_id ?? null,
        flight_expires_at: flightOffer?.expires_at ?? null,
        flight_snapshot: flightSnapshotOf(flightOffer),
        valid_until: validity.validUntil,
        validity_limited_by: validity.limitedBy,
        confirmable: confirmability.confirmable,
        blocking_reasons: confirmability.blockingReasons,
        warnings: result.warnings,
        change_reason: reasonParts.join(" ") || "Recálculo",
        previous_version_id: current.id,
        previous_price: Number(current.total_price),
        price_difference: comparison.difference,
        created_by: user.id,
      }).select("*").single();
      if (nvError) return json({ error: nvError.message }, 500);

      const items = result.components.map((line, i) => {
        const rate = rateRows.find((r) => r.id === line.rateId);
        return {
          quote_version_id: newVersion.id,
          line_order: i,
          component_id: line.componentId,
          rate_id: line.rateId,
          supplier_id: rate?.supplier_id ?? null,
          display_name: line.name,
          component_type: line.componentType,
          quantity: line.quantity,
          unit: line.unit,
          unit_cost: line.unitPrice,
          total_cost: line.cost,
          rule_mode: line.ruleMode,
          rule_pct: line.rulePct,
          selling_price: line.sellPrice,
          currency: line.currency,
          rate_kind: line.rateKind,
          rate_status: rate?.status ?? null,
          source_type: rate?.source_type ?? null,
          source_reference: rate?.source_reference ?? null,
          rate_valid_from: rate?.valid_from ?? null,
          rate_valid_until: rate?.valid_until ?? null,
          validity_unknown: rate?.validity_unknown ?? false,
          cancellation_type: rate?.cancellation_type ?? null,
          cancellation_summary: rate?.cancellation_summary ?? null,
          estimated: line.estimated,
          notes: line.notes,
        };
      });
      if (items.length > 0) await admin.from("travel_quote_items").insert(items);

      await admin.from("travel_quote_versions")
        .update({ status: "superseded", superseded_at: new Date().toISOString() }).eq("id", current.id);
      await admin.from("travel_quotes").update({
        current_version_id: newVersion.id,
        version_count: Number(quote.version_count ?? 1) + 1,
        status: "calculated",
        expires_at: validity.validUntil,
        sale_currency: result.currency,
      }).eq("id", quote.id);

      await admin.from("admin_audit_log").insert({
        admin_id: user.id, action: "quote_new_version", entity_type: "travel_quote", entity_id: quote.id,
        details: {
          version: newVersion.version_number,
          previous_price: comparison.previousPrice,
          new_price: comparison.newPrice,
          difference: comparison.difference,
          reason: reasonParts.join(" "),
          valid_until: validity.validUntil,
        },
      });

      return json({ changed: true, comparison, version: newVersion, items, flight: flightNote });
    }

    // ============ REVALIDATE (Fase 7I) ============
    // Revalidação final server-side. NUNCA reutiliza cegamente o preço antigo:
    // reconsulta o voo, recarrega tarifas e política e recalcula tudo.
    if (action === "revalidate") {
      const quoteId = String(body.quote_id ?? "");
      const { data: quote } = await admin.from("travel_quotes").select("*").eq("id", quoteId).maybeSingle();
      if (!quote) return json({ error: "Cotação inexistente.", code: "quote_not_found" }, 404);
      if (quote.status === "cancelled") return json({ error: "Cotação cancelada.", code: "quote_cancelled" }, 409);

      const baseVersionId = quote.accepted_version_id ?? quote.current_version_id;
      const { data: current } = await admin.from("travel_quote_versions").select("*").eq("id", baseVersionId).maybeSingle();
      if (!current) return json({ error: "Versão inexistente.", code: "version_not_found" }, 404);

      const recordRevalidation = async (row: Record<string, unknown>) => {
        const { data } = await admin.from("quote_revalidations").insert({
          quote_id: quote.id, quote_version_id: current.id, created_by: user.id, ...row,
        }).select("*").single();
        await admin.from("travel_quotes").update({ last_revalidated_at: new Date().toISOString() }).eq("id", quote.id);
        await admin.from("admin_audit_log").insert({
          admin_id: user.id, action: `quote_revalidation_${row.outcome}`, entity_type: "travel_quote", entity_id: quote.id,
          details: { version: current.version_number, ...row },
        });
        return data;
      };

      if (quote.current_version_id !== current.id) {
        const rec = await recordRevalidation({ outcome: "blocked", blocking_reasons: ["Existe uma versão mais recente desta cotação."] });
        return json({ ok: false, outcome: "blocked", code: "quote_superseded", reasons: ["Existe uma versão mais recente desta cotação."], revalidation: rec }, 409);
      }

      // produto / versão do produto
      let productVersionStatus: string | null = null;
      if (quote.product_version_id) {
        const { data: pv } = await admin.from("travel_product_versions").select("status").eq("id", quote.product_version_id).maybeSingle();
        productVersionStatus = pv?.status ?? null;
      }

      const { data: currentItems } = await admin.from("travel_quote_items").select("component_id")
        .eq("quote_version_id", current.id);
      const componentIds = [...new Set((currentItems ?? []).map((i: any) => i.component_id).filter(Boolean))] as string[];

      // voo: refresh/reprice apenas para VALIDAR — nunca hold, order ou bilhete
      let flightOffer: Record<string, any> | null = null;
      let flightNote: string | null = null;
      let flightAvailable = true;
      if (current.flight_provider_offer_id) {
        const refreshRes = await fetch(`${supabaseUrl}/functions/v1/flight-engine`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json", apikey: anonKey },
          body: JSON.stringify({ action: "refresh_offer", provider_offer_id: current.flight_provider_offer_id }),
        });
        const refreshBody = await refreshRes.json().catch(() => ({}));
        if (!refreshRes.ok) {
          flightAvailable = false;
          flightNote = `Reconsulta de voo indisponível: ${refreshBody.code ?? "erro"}.`;
        } else {
          flightNote = `Voo: ${refreshBody.reprice?.status ?? "desconhecido"}.`;
          if (refreshBody.reprice?.status === "unavailable") flightAvailable = false;
        }
        const { data: o } = await admin.from("flight_offers").select("*")
          .eq("provider_offer_id", current.flight_provider_offer_id).maybeSingle();
        flightOffer = o ?? null;
        if (!flightOffer) flightAvailable = false;
      }

      const { policy, components, rateRows } = await loadPricingContext(admin, componentIds);
      if (!policy) {
        const rec = await recordRevalidation({ outcome: "blocked", blocking_reasons: ["Não existe política de preços ativa."], flight_note: flightNote });
        return json({ ok: false, outcome: "blocked", code: "no_active_policy", reasons: ["Não existe política de preços ativa."], revalidation: rec }, 409);
      }

      const criteria = sanitizeCriteria(current.customer_criteria ?? {});
      const referenceDate = criteria.departureDate ?? new Date().toISOString().slice(0, 10);
      const result = calculatePricing({
        policy,
        productId: quote.product_id,
        productVersionId: quote.product_version_id,
        durationDays: criteria.durationDays,
        nights: criteria.nights ?? Math.max(criteria.durationDays - 1, 0),
        adults: criteria.adults,
        children: criteria.children ?? 0,
        rooms: criteria.rooms ?? 1,
        referenceDate,
        components,
        flightCost: flightOffer
          ? { amount: Number(flightOffer.total_amount), currency: flightOffer.total_currency, confirmed: flightOffer.status === "active" }
          : null,
      });

      const usedRateIds = new Set(result.components.map((c) => c.rateId).filter(Boolean) as string[]);
      const usedRates = rateRows.filter((r) => usedRateIds.has(r.id));
      const validity = resolveQuoteValidity({
        operatorValidUntil: null,
        flightExpiresAt: flightOffer?.expires_at ?? null,
        rateValidUntil: usedRates.map((r) => r.valid_until),
      });
      const confirmability = evaluateConfirmability({
        pricingStatus: result.status,
        validationErrors: result.validationErrors,
        productStatus: productVersionStatus,
        policyActive: policy.status === "active",
        flight: flightOffer ? { present: true, expiresAt: flightOffer.expires_at, expired: flightOffer.status === "expired" } : null,
        rates: usedRates.map((r) => ({ validityUnknown: r.validity_unknown, validUntil: r.valid_until, status: r.status })),
        validUntil: validity.validUntil,
      });

      const decision = evaluateRevalidation({
        previousPrice: Number(current.total_price),
        newPrice: result.finalPrice,
        pricingStatus: result.status,
        policyActive: policy.status === "active",
        blockingReasons: confirmability.blockingReasons,
        flightPresent: Boolean(current.flight_provider_offer_id),
        flightAvailable,
        flightExpired: flightOffer ? flightOffer.status === "expired" : false,
        marginBelowMinimum: result.grossMarginPct < Number(policy.minMarginPct),
      });

      const { data: calcRow } = await admin.from("pricing_calculations").insert({
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        product_id: result.productId,
        product_version_id: result.productVersionId,
        calculation_kind: "commercial",
        status: result.status,
        currency: result.currency,
        cost_total: result.costTotal,
        markup_total: result.markupTotal,
        gross_margin_pct: result.grossMarginPct,
        subtotal: result.subtotal,
        final_price: result.finalPrice,
        input: { componentIds, criteria, revalidation_of: current.id },
        result: result as unknown as Record<string, unknown>,
        warnings: result.warnings,
        validation_errors: result.validationErrors,
        created_by: user.id,
      }).select("id").single();

      const baseRow = {
        previous_price: Number(current.total_price),
        new_price: result.finalPrice,
        price_difference: decision.difference,
        price_difference_pct: decision.differencePct,
        currency: result.currency,
        pricing_status: result.status,
        pricing_calculation_id: calcRow?.id ?? null,
        warnings: result.warnings,
        flight_note: flightNote,
        flight_status: flightOffer?.status ?? null,
      };

      if (decision.outcome === "blocked") {
        const rec = await recordRevalidation({ ...baseRow, outcome: "blocked", blocking_reasons: decision.reasons });
        return json({ ok: false, outcome: "blocked", code: "revalidation_blocked", reasons: decision.reasons, revalidation: rec }, 409);
      }

      if (!decision.changed) {
        const rec = await recordRevalidation({ ...baseRow, outcome: "unchanged", blocking_reasons: [] });
        return json({
          ok: true, outcome: "unchanged", changed: false, decision,
          version: current, confirmed_price: Number(current.total_price),
          currency: current.sale_currency, revalidation: rec, flight: flightNote,
        });
      }

      // Houve alteração: a versão anterior permanece intacta e nasce uma nova.
      const reason = `Revalidação: preço alterado de ${decision.difference >= 0 ? "" : ""}${current.total_price} para ${result.finalPrice} (${decision.difference >= 0 ? "+" : ""}${decision.difference}). ${flightNote ?? ""}`.trim();
      const { data: newVersion, error: nvError } = await admin.from("travel_quote_versions").insert({
        quote_id: quote.id,
        version_number: Number(current.version_number) + 1,
        status: "calculated",
        customer_criteria: current.customer_criteria,
        policy_id: policy.policyId,
        policy_version_id: policy.id,
        policy_version_number: policy.versionNumber,
        pricing_calculation_id: calcRow?.id ?? null,
        pricing_status: result.status,
        total_cost: result.costTotal,
        total_price: result.finalPrice,
        cost_currency: result.currency,
        sale_currency: result.currency,
        flight_offer_id: flightOffer?.id ?? null,
        flight_provider_offer_id: flightOffer?.provider_offer_id ?? null,
        flight_expires_at: flightOffer?.expires_at ?? null,
        flight_snapshot: flightSnapshotOf(flightOffer),
        valid_until: validity.validUntil,
        validity_limited_by: validity.limitedBy,
        confirmable: confirmability.confirmable,
        blocking_reasons: confirmability.blockingReasons,
        warnings: result.warnings,
        change_reason: reason,
        previous_version_id: current.id,
        previous_price: Number(current.total_price),
        price_difference: decision.difference,
        created_by: user.id,
      }).select("*").single();
      if (nvError) return json({ error: nvError.message }, 500);

      const newItems = result.components.map((line, i) => {
        const rate = rateRows.find((r) => r.id === line.rateId);
        return {
          quote_version_id: newVersion.id,
          line_order: i,
          component_id: line.componentId,
          rate_id: line.rateId,
          supplier_id: rate?.supplier_id ?? null,
          display_name: line.name,
          component_type: line.componentType,
          quantity: line.quantity,
          unit: line.unit,
          unit_cost: line.unitPrice,
          total_cost: line.cost,
          rule_mode: line.ruleMode,
          rule_pct: line.rulePct,
          selling_price: line.sellPrice,
          currency: line.currency,
          rate_kind: line.rateKind,
          rate_status: rate?.status ?? null,
          source_type: rate?.source_type ?? null,
          source_reference: rate?.source_reference ?? null,
          rate_valid_from: rate?.valid_from ?? null,
          rate_valid_until: rate?.valid_until ?? null,
          validity_unknown: rate?.validity_unknown ?? false,
          cancellation_type: rate?.cancellation_type ?? null,
          cancellation_summary: rate?.cancellation_summary ?? null,
          estimated: line.estimated,
          notes: line.notes,
        };
      });
      if (newItems.length > 0) await admin.from("travel_quote_items").insert(newItems);

      await admin.from("travel_quote_versions")
        .update({ status: "superseded", superseded_at: new Date().toISOString() }).eq("id", current.id);

      const requiresReacceptance = decision.requiresReacceptance;
      await admin.from("travel_quotes").update({
        current_version_id: newVersion.id,
        version_count: Number(quote.version_count ?? 1) + 1,
        status: requiresReacceptance ? "calculated" : quote.status,
        accepted_version_id: requiresReacceptance ? quote.accepted_version_id : newVersion.id,
        requires_reacceptance: requiresReacceptance,
        expires_at: validity.validUntil,
        sale_currency: result.currency,
      }).eq("id", quote.id);

      const rec = await recordRevalidation({
        ...baseRow,
        outcome: decision.outcome,
        new_quote_version_id: newVersion.id,
        blocking_reasons: decision.reasons,
        requires_reacceptance: requiresReacceptance,
      });

      return json({
        ok: !requiresReacceptance,
        outcome: decision.outcome,
        changed: true,
        decision,
        version: newVersion,
        confirmed_price: result.finalPrice,
        currency: result.currency,
        requires_reacceptance: requiresReacceptance,
        revalidation: rec,
        flight: flightNote,
      }, requiresReacceptance ? 409 : 200);
    }

    // ============ GET ============
    if (action === "get") {
      const quoteId = String(body.quote_id ?? "");
      const { data: quote } = await admin.from("travel_quotes").select("*").eq("id", quoteId).maybeSingle();
      if (!quote) return json({ error: "Cotação inexistente.", code: "quote_not_found" }, 404);
      const { data: versions } = await admin.from("travel_quote_versions").select("*")
        .eq("quote_id", quoteId).order("version_number", { ascending: false });
      const { data: items } = await admin.from("travel_quote_items").select("*")
        .eq("quote_version_id", quote.current_version_id).order("line_order");
      return json({ quote, versions: versions ?? [], items: items ?? [] });
    }

    // ============ ISSUE TOKEN ============
    if (action === "issue_token") {
      const quoteId = String(body.quote_id ?? "");
      const { data: quote } = await admin.from("travel_quotes").select("*").eq("id", quoteId).maybeSingle();
      if (!quote) return json({ error: "Cotação inexistente.", code: "quote_not_found" }, 404);
      if (["cancelled", "expired"].includes(quote.status)) {
        return json({ error: "Cotação sem estado válido para partilha.", code: "invalid_state" }, 409);
      }
      const token = generatePublicToken();
      const hash = await hashPublicToken(token);
      const expires = quote.expires_at ?? new Date(Date.now() + 7 * 864e5).toISOString();
      await admin.from("travel_quotes")
        .update({ public_token_hash: hash, public_token_expires_at: expires }).eq("id", quoteId);
      await admin.from("admin_audit_log").insert({
        admin_id: user.id, action: "quote_token_issued", entity_type: "travel_quote", entity_id: quoteId,
        details: { expires_at: expires },
      });
      // O token só é devolvido uma vez: na base de dados fica apenas o resumo criptográfico.
      return json({ token, expires_at: expires });
    }

    return json({ error: "Ação não suportada.", code: "unsupported_action" }, 400);
  } catch (e) {
    console.error("quote-engine error", (e as Error)?.name ?? "error");
    return json({ error: "Erro inesperado no motor de cotações." }, 500);
  }
});

// deploy touch
