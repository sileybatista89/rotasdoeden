/**
 * Fase 7G — Leitura pública de uma cotação, apenas por token opaco.
 *
 * Não requer conta. Devolve exclusivamente o payload sanitizado:
 * nunca custos, tarifas de fornecedor, margens, markup nem política.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { hashPublicToken, isExpired, sanitizeQuoteForCustomer } from "../_shared/quote-engine.ts";

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

// Limite simples em memória por instância: trava tentativas de adivinhar tokens.
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (rateLimited(ip)) return json({ error: "Demasiados pedidos. Tenta novamente daqui a pouco." }, 429);

    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "Cotação não encontrada." }, 404);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const hash = await hashPublicToken(token);
    const { data: quote } = await admin.from("travel_quotes").select("*").eq("public_token_hash", hash).maybeSingle();
    if (!quote) return json({ error: "Cotação não encontrada." }, 404);

    if (isExpired(quote.public_token_expires_at)) return json({ error: "Esta ligação expirou." }, 410);
    if (["cancelled", "superseded"].includes(quote.status)) return json({ error: "Cotação não disponível." }, 410);

    const { data: version } = await admin.from("travel_quote_versions").select("*")
      .eq("id", quote.current_version_id).maybeSingle();
    if (!version) return json({ error: "Cotação não disponível." }, 410);

    const { data: items } = await admin.from("travel_quote_items").select("*")
      .eq("quote_version_id", version.id).order("line_order");

    let productName: string | null = null;
    if (quote.product_id) {
      const { data: p } = await admin.from("travel_products").select("name").eq("id", quote.product_id).maybeSingle();
      productName = p?.name ?? null;
    }

    const payload = sanitizeQuoteForCustomer({ quote, version, items: items ?? [], productName });
    return json({ quote: payload, expired: isExpired(version.valid_until) });
  } catch (e) {
    console.error("quote-public error", (e as Error)?.name ?? "error");
    return json({ error: "Erro inesperado." }, 500);
  }
});

// deploy touch
