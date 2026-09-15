/**
 * Fase 8 — porta pública do configurador de pacote (Rotas Essencial).
 *
 * Responsabilidades: servir o catálogo editorial, guardar a configuração do
 * visitante por token opaco e registar o pedido de proposta.
 *
 * Esta função NÃO calcula preços, não cria cotações, não reserva, não cobra,
 * não contacta fornecedores e não emite voos. O preço continua a ser produzido
 * exclusivamente pelo Quote Engine a partir do Pricing Engine, já existentes.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  BUILDER_LIMITS,
  isValidContactEmail,
  sanitizeSelections,
  validateBuilderConfig,
} from "../_shared/package-builder.ts";

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

  return rows.map((r) => ({
    ...r,
    // Um ponto editorial sem serviço/componente real fica como inspiração.
    service_id: r.service_id && bookableServices.has(r.service_id) ? r.service_id : null,
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

  // --------------------------------------------------------------- save ----
  if (action === "save") {
    const productSlug = str(body.product_slug, 80) ?? "rotas-essencial";
    const { data: product } = await client
      .from("travel_products")
      .select("id, minimum_days, maximum_days, status, current_version_id")
      .eq("slug", productSlug).maybeSingle();
    if (!product) return json({ error: "Produto inexistente." }, 404);
    if (product.status === "archived") return json({ error: "Este produto já não está disponível." }, 409);

    const selections = sanitizeSelections(body.selections);
    const durationDays = int(body.duration_days, product.minimum_days);
    const errors = validateBuilderConfig({
      durationDays,
      minimumDays: product.minimum_days,
      maximumDays: product.maximum_days,
      adults: int(body.adults, 2),
      children: int(body.children, 0),
      rooms: int(body.rooms, 1),
      selections,
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
