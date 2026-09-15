/**
 * Fase 6 — Conversion Agent.
 *
 * Só o orquestrador ou a função `conversion-chat` (service role) podem chamar.
 * O agente lê dados reais da base, classifica a intenção e devolve uma resposta
 * já sanitizada. Não escreve nada: quem persiste é quem o chamou.
 *
 * Proibido: pagar, reservar, criar orders de voo, emitir bilhetes, contactar
 * fornecedores, alterar preços, margens ou políticas.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getProvider, ProviderError } from "../_shared/agents/providers.ts";
import {
  AI_DISCLOSURE,
  buildGroundingBlock,
  classifyIntent,
  CONVERSION_LIMITS,
  CONVERSION_SYSTEM_PROMPT,
  hasRealData,
  HUMAN_HANDOFF,
  isConversionIntent,
  isMessageAcceptable,
  mergeIntent,
  NO_DATA_FALLBACK,
  parseAgentOutput,
  sanitizeReply,
  validateLead,
  type ConversionIntent,
  type GroundingContext,
} from "../_shared/agents/conversion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "google/gemini-3.8-flash";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Leitura — e só leitura — dos dados reais que sustentam a resposta. */
async function loadGrounding(db: SupabaseClient, quoteId: string | null): Promise<GroundingContext> {
  const [products, versions, experiences, guides] = await Promise.all([
    db.from("travel_products").select("id, name, summary, min_days, max_days, is_active"),
    db.from("travel_product_versions").select("product_id").eq("status", "published"),
    db.from("services").select("title, district").eq("status", "aprovado").eq("is_active", true).limit(20),
    db.from("professional_profiles").select("display_name, specialty")
      .eq("verification_status", "verified").limit(20),
  ]);

  const publishedIds = new Set((versions.data ?? []).map((v: { product_id: string }) => v.product_id));

  let quote: GroundingContext["quote"] = null;
  if (quoteId) {
    const { data: q } = await db.from("travel_quotes")
      .select("reference, status, current_version_id").eq("id", quoteId).maybeSingle();
    if (q?.current_version_id) {
      const { data: v } = await db.from("travel_quote_versions")
        .select("total_price, currency").eq("id", q.current_version_id).maybeSingle();
      if (v) {
        quote = {
          reference: String(q.reference),
          status: String(q.status),
          total_price: Number(v.total_price),
          currency: String(v.currency),
        };
      }
    }
  }

  return {
    products: (products.data ?? [])
      .filter((p: Record<string, unknown>) => p.is_active !== false && publishedIds.has(p.id as string))
      .map((p: Record<string, unknown>) => ({
        name: String(p.name),
        summary: (p.summary as string) ?? null,
        min_days: (p.min_days as number) ?? null,
        max_days: (p.max_days as number) ?? null,
      })),
    experiences: (experiences.data ?? []).map((e: Record<string, unknown>) => ({
      title: String(e.title),
      district: (e.district as string) ?? null,
    })),
    guides: (guides.data ?? []).map((g: Record<string, unknown>) => ({
      name: String(g.display_name ?? ""),
      specialty: (g.specialty as string) ?? null,
    })).filter((g) => g.name),
    quote,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed", permanent: true }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Not authorized", permanent: true }, 403);
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const message = String(body.message ?? "");
  const acceptable = isMessageAcceptable(message);
  if (!acceptable.ok) return json({ ok: false, code: "invalid_message", error: acceptable.error, permanent: true }, 400);

  const previousIntent: ConversionIntent = isConversionIntent(body.current_intent) ? body.current_intent : "inspiracao";
  const history = Array.isArray(body.history)
    ? (body.history as { role: string; content: string }[]).slice(-CONVERSION_LIMITS.historyTurns)
    : [];
  const quoteId = typeof body.quote_id === "string" ? body.quote_id : null;

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const grounding = await loadGrounding(db, quoteId);
  const toolsUsed = ["list_published_products", "list_active_experiences", "list_verified_guides"];
  if (quoteId) toolsUsed.push("get_quote_summary");

  const heuristicIntent = mergeIntent(previousIntent, classifyIntent(message));

  const provider = getProvider("lovable");
  if (!provider.isConfigured()) {
    return json({
      ok: true,
      agent_type: "conversion",
      provider: null,
      model: null,
      intent: heuristicIntent,
      result: {
        reply: NO_DATA_FALLBACK,
        lead: null,
        handoff: true,
        grounded: false,
        disclosure: AI_DISCLOSURE,
      },
      tools_used: toolsUsed,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
    });
  }

  const conversation = history
    .map((h) => `${h.role === "assistant" ? "Assistente" : "Visitante"}: ${h.content}`)
    .join("\n");

  const prompt = [
    buildGroundingBlock(grounding),
    "",
    conversation ? `HISTÓRICO:\n${conversation}` : "HISTÓRICO: (início da conversa)",
    "",
    `MENSAGEM DO VISITANTE: ${message}`,
    "",
    `Intenção detetada por regras: ${heuristicIntent}.`,
    hasRealData(grounding)
      ? ""
      : "ATENÇÃO: não existe nenhum pacote, experiência ou guia confirmado na base. Não afirmes nada sobre oferta; assume a lacuna e propõe registar o pedido.",
  ].join("\n");

  try {
    const result = await provider.generate({
      model: MODEL,
      system: CONVERSION_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 700,
      timeoutMs: 45_000,
    });

    const decision = parseAgentOutput(result.text, heuristicIntent);
    const intent = mergeIntent(heuristicIntent, decision.intent);
    const sanitized = sanitizeReply(decision.reply, { hasQuote: Boolean(grounding.quote) });
    const validated = decision.lead ? validateLead(decision.lead) : null;

    return json({
      ok: true,
      agent_type: "conversion",
      provider: result.provider,
      model: result.model,
      intent,
      result: {
        reply: decision.handoff ? `${sanitized.text}\n\n${HUMAN_HANDOFF}` : sanitized.text,
        lead: validated?.valid ? validated.lead : null,
        handoff: decision.handoff,
        grounded: !sanitized.blocked && hasRealData(grounding),
        sanitizer_reasons: sanitized.reasons,
      },
      tools_used: toolsUsed,
      tool_calls_count: toolsUsed.length,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      estimated_cost: result.estimatedCost,
    });
  } catch (error) {
    const err = error as ProviderError;
    return json({
      ok: false,
      code: err.code ?? "agent_error",
      error: err.message,
      permanent: err.permanent !== false,
    }, 502);
  }
});
