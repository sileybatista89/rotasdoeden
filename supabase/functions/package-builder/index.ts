/**
 * Fase 8 — porta pública do configurador de pacote (Rotas Essencial).
 *
 * Responsabilidades: servir o catálogo editorial, guardar a configuração do
 * visitante por token opaco e registar o pedido de proposta.
 *
 * Calcula apenas o preço de referência indicativo ("desde X") delegando no
 * Pricing Engine existente. Não cria cotações, não reserva, não cobra, não
 * contacta fornecedores e não emite voos: a proposta comercial continua a ser
 * produzida exclusivamente pelo Quote Engine.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  BUILDER_LIMITS,
  isValidContactEmail,
  normalizeBuilderProduct,
  sanitizeSelections,
  validateBuilderConfig,
} from "../_shared/package-builder.ts";
import {
  computeBaseline,
  normalizeBaselineConfig,
  publicBaseline,
} from "../_shared/price-baseline.ts";
import type {
  PricingComponentInput,
  PricingPolicyVersion,
  RateCandidate,
} from "../_shared/pricing-engine.ts";

/** Os quatro produtos oficiais. Nenhum outro slug é servido publicamente. */
const PUBLIC_PRODUCT_SLUGS = ["rotas-essencial", "rotas-explorar", "rotas-imersao", "rotas-a-medida"];

const PRODUCT_FIELDS =
  "id, slug, name, description, product_type, minimum_days, maximum_days, minimum_nights, maximum_nights, status, current_version_id, builder_config";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = (): SupabaseClient =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isHexToken = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
const str = (v: unknown, max = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown, fallback: number) => (Number.isInteger(Number(v)) ? Number(v) : fallback);

/** Só o que o visitante pode ver. Nunca custos, tarifas, fornecedores ou margens. */
async function publicCatalog(client: SupabaseClient) {
  const { data: items } = await client
    .from("experience_catalog_items")
    .select("id, slug, name, category, island, short_description, image_url, typical_duration_hours, service_id, package_component_id")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  const rows = items ?? [];
  const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))] as string[];
  let bookableServices = new Set<string>();
  if (serviceIds.length > 0) {
    const { data: services } = await client
      .from("services").select("id").in("id", serviceIds)
      .eq("is_active", true).eq("moderation_status", "approved");
    bookableServices = new Set((services ?? []).map((s) => s.id as string));
  }

  // Um componente só conta como oferta real com fornecedor, aprovação e tarifa
  // confirmada e válida. Caso contrário o local continua a ser inspiração.
  const componentIds = [...new Set(rows.map((r) => r.package_component_id).filter(Boolean))] as string[];
  let readyComponents = new Set<string>();
  if (componentIds.length > 0) {
    const { data: components } = await client
      .from("package_components").select("id, supplier_id")
      .in("id", componentIds).eq("status", "approved");
    const approved = (components ?? []).filter((c) => c.supplier_id).map((c) => c.id as string);
    if (approved.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: rates } = await client
        .from("component_rates")
        .select("component_id, valid_until")
        .in("component_id", approved)
        .eq("status", "confirmed")
        .eq("validity_unknown", false)
        .neq("rate_kind", "market_observed_price")
        .not("source_type", "is", null)
        .not("observed_at", "is", null)
        .or(`valid_until.is.null,valid_until.gte.${today}`);
      readyComponents = new Set((rates ?? []).map((r) => r.component_id as string));
    }
  }

  return rows.map((r) => ({
    ...r,
    // Um ponto editorial sem serviço/componente real fica como inspiração.
    service_id: r.service_id && bookableServices.has(r.service_id) ? r.service_id : null,
    package_component_id: r.package_component_id && readyComponents.has(r.package_component_id)
      ? r.package_component_id
      : null,
  }));
}

function publicConfig(row: Record<string, any>) {
  return {
    id: row.id,
    duration_days: row.duration_days,
    adults: row.adults,
    children: row.children,
    rooms: row.rooms,
    start_date: row.start_date,
    selections: row.selections ?? [],
    status: row.status,
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    notes: row.notes,
  };
}

/** Idade máxima do baseline guardado antes de ser recalculado. */
const BASELINE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function mapPolicy(row: Record<string, any>): PricingPolicyVersion {
  return {
    id: row.id,
    policyId: row.policy_id,
    versionNumber: row.version_number,
    status: row.status,
    baseCurrency: row.base_currency,
    marginMode: row.margin_mode,
    minMarginPct: Number(row.min_margin_pct),
    targetMarginPct: Number(row.target_margin_pct),
    componentRules: row.component_rules ?? {},
    flightProtection: row.flight_protection ?? { method: "percentage", value: 0 },
    fees: row.fees ?? [],
    supplements: row.supplements ?? [],
    operationalCosts: row.operational_costs ?? [],
    roundingMode: row.rounding_mode,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  };
}

/**
 * Recalcula o "desde €X" do produto a partir dos dados reais e guarda a
 * proveniência. Nunca inventa componentes nem preenche falhas com zero.
 */
async function recomputeBaseline(client: SupabaseClient, product: Record<string, any>) {
  const config = normalizeBaselineConfig(product.builder_config);
  if (!config) return null;

  const { data: policyRow } = await client
    .from("pricing_policy_versions").select("*").eq("status", "active").maybeSingle();

  const { data: compRows } = await client
    .from("package_components")
    .select("id, name, component_type, supplier_id")
    .eq("status", "approved")
    .in("component_type", config.required);

  const approved = (compRows ?? []).filter((c) => c.supplier_id);
  let rates: Record<string, any>[] = [];
  if (approved.length > 0) {
    const { data } = await client
      .from("component_rates").select("*").in("component_id", approved.map((c) => c.id));
    rates = data ?? [];
  }

  const components: PricingComponentInput[] = approved.map((c) => ({
    id: c.id,
    name: c.name,
    componentType: c.component_type,
    rates: rates.filter((r) => r.component_id === c.id).map((r): RateCandidate => ({
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

  const durationDays = product.minimum_days ?? 5;
  const nights = product.minimum_nights ?? Math.max(durationDays - 1, 1);

  const result = computeBaseline({
    policy: policyRow ? mapPolicy(policyRow) : null,
    config,
    durationDays,
    nights,
    components,
    referenceDate: new Date().toISOString().slice(0, 10),
  });

  const row = {
    product_id: product.id,
    status: result.status,
    currency: result.currency,
    price_per_person: result.pricePerPerson,
    price_total: result.priceTotal,
    duration_days: result.durationDays,
    nights: result.nights,
    adults: result.adults,
    rooms: result.rooms,
    basis: result.basis,
    commercial_state: result.commercialState,
    policy_version_id: result.policyVersionId,
    breakdown: result.breakdown,
    missing_components: result.missing,
    source_rate_ids: result.sourceRateIds,
    blocked_reason: result.blockedReason,
    computed_at: new Date().toISOString(),
    expires_at: result.expiresAt,
  };

  const { data } = await client
    .from("product_price_baselines")
    .upsert(row, { onConflict: "product_id" })
    .select("*").maybeSingle();
  return data ?? row;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const client = db();
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const token = isHexToken(body.session_token) ? body.session_token : null;

  // ------------------------------------------------------------- catalog ---
  if (action === "catalog") {
    return json({ items: await publicCatalog(client) });
  }

  // ------------------------------------------------------------- product ---
  if (action === "product") {
    const slug = str(body.product_slug, 80) ?? "";
    if (!PUBLIC_PRODUCT_SLUGS.includes(slug)) return json({ error: "Produto inexistente." }, 404);
    const { data: product } = await client
      .from("travel_products").select(PRODUCT_FIELDS).eq("slug", slug).maybeSingle();
    if (!product || product.status === "archived") return json({ error: "Produto inexistente." }, 404);
    return json({ product: normalizeBuilderProduct(product) });
  }

  // ------------------------------------------------------------ baseline ---
  // "Desde €X": valor indicativo calculado pelo Pricing Engine. O visitante
  // nunca recebe custo interno, margem, fornecedor ou proveniência interna.
  if (action === "baseline") {
    const slug = str(body.product_slug, 80) ?? "";
    if (!PUBLIC_PRODUCT_SLUGS.includes(slug)) return json({ error: "Produto inexistente." }, 404);
    const { data: product } = await client
      .from("travel_products").select(PRODUCT_FIELDS).eq("slug", slug).maybeSingle();
    if (!product || product.status === "archived") return json({ error: "Produto inexistente." }, 404);

    const { data: stored } = await client
      .from("product_price_baselines").select("*").eq("product_id", product.id).maybeSingle();

    const expired = stored?.expires_at != null && Date.parse(stored.expires_at) < Date.now();
    const old = !stored || Date.now() - Date.parse(stored.computed_at) > BASELINE_MAX_AGE_MS;
    const fresh = expired || old ? await recomputeBaseline(client, product) : stored;
    if (!fresh) return json({ baseline: null });

    const row = fresh as Record<string, any>;
    return json({
      baseline: publicBaseline({
        status: row.status,
        currency: row.currency,
        price_per_person: row.price_per_person == null ? null : Number(row.price_per_person),
        commercial_state: row.commercial_state,
        duration_days: row.duration_days,
        adults: row.adults,
        computed_at: row.computed_at,
        expires_at: row.expires_at,
      }),
    });
  }

  // --------------------------------------------------------------- save ----
  if (action === "save") {
    const productSlug = str(body.product_slug, 80) ?? "rotas-essencial";
    if (!PUBLIC_PRODUCT_SLUGS.includes(productSlug)) return json({ error: "Produto inexistente." }, 404);
    const { data: product } = await client
      .from("travel_products")
      .select(PRODUCT_FIELDS)
      .eq("slug", productSlug).maybeSingle();
    if (!product) return json({ error: "Produto inexistente." }, 404);
    if (product.status === "archived") return json({ error: "Este produto já não está disponível." }, 409);

    const rules = normalizeBuilderProduct(product);
    const selections = sanitizeSelections(body.selections);
    const durationDays = int(body.duration_days, rules.minimum_days);
    const errors = validateBuilderConfig({
      durationDays,
      minimumDays: rules.minimum_days,
      maximumDays: rules.maximum_days,
      adults: int(body.adults, 2),
      children: int(body.children, 0),
      rooms: int(body.rooms, 1),
      selections,
      maxSelectionsPerDay: rules.max_selections_per_day,
    });
    if (errors.length > 0) return json({ error: errors.join(" ") }, 400);

    const payload = {
      product_id: product.id,
      product_version_id: product.current_version_id,
      duration_days: durationDays,
      adults: int(body.adults, 2),
      children: int(body.children, 0),
      rooms: int(body.rooms, 1),
      start_date: str(body.start_date, 10),
      selections,
      visitor_id: str(body.visitor_id, 60),
      notes: str(body.notes, BUILDER_LIMITS.maxNotesLength),
    };

    if (token) {
      const hash = await sha256(token);
      const { data: existing } = await client.from("package_builder_configs")
        .select("id, status").eq("session_token_hash", hash).maybeSingle();
      if (existing) {
        if (existing.status === "arquivado") return json({ error: "Esta configuração foi arquivada." }, 409);
        const { data, error } = await client.from("package_builder_configs")
          .update(payload).eq("id", existing.id).select("*").single();
        if (error) return json({ error: "Não foi possível guardar as escolhas." }, 400);
        return json({ session_token: token, config: publicConfig(data) });
      }
    }

    const fresh = token ?? newToken();
    const { data, error } = await client.from("package_builder_configs")
      .insert({ ...payload, session_token_hash: await sha256(fresh) })
      .select("*").single();
    if (error) return json({ error: "Não foi possível guardar as escolhas." }, 400);
    return json({ session_token: fresh, config: publicConfig(data) });
  }

  // ---------------------------------------------------------------- get ----
  if (action === "get") {
    if (!token) return json({ error: "Sessão inválida." }, 404);
    const { data } = await client.from("package_builder_configs")
      .select("*").eq("session_token_hash", await sha256(token)).maybeSingle();
    if (!data) return json({ error: "Sessão inválida." }, 404);
    return json({ config: publicConfig(data) });
  }

  // ------------------------------------------------------------- submit ----
  if (action === "submit") {
    if (!token) return json({ error: "Sessão inválida." }, 404);
    const hash = await sha256(token);
    const { data: existing } = await client.from("package_builder_configs")
      .select("*").eq("session_token_hash", hash).maybeSingle();
    if (!existing) return json({ error: "Sessão inválida." }, 404);
    if (existing.status === "arquivado") return json({ error: "Esta configuração foi arquivada." }, 409);

    const email = str(body.contact_email, BUILDER_LIMITS.maxContactLength);
    const name = str(body.contact_name, BUILDER_LIMITS.maxContactLength);
    if (!name || !isValidContactEmail(email)) {
      return json({ error: "Indique o nome e um email válido para receber a proposta." }, 400);
    }

    const { data, error } = await client.from("package_builder_configs").update({
      contact_name: name,
      contact_email: email,
      contact_phone: str(body.contact_phone, 40),
      notes: str(body.notes, BUILDER_LIMITS.maxNotesLength) ?? existing.notes,
      status: existing.status === "rascunho" ? "submetido" : existing.status,
      submitted_at: existing.submitted_at ?? new Date().toISOString(),
    }).eq("id", existing.id).select("*").single();
    if (error) return json({ error: "Não foi possível enviar o pedido." }, 400);

    // O preço não é calculado aqui: a equipa produz a proposta com o Quote Engine.
    return json({
      config: publicConfig(data),
      message: "Pedido registado. A equipa prepara a proposta com preços confirmados e envia por email.",
    });
  }

  return json({ error: "Ação desconhecida." }, 400);
});
