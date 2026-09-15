/**
 * Fase 6 — porta pública do assistente de conversão.
 *
 * Responsabilidades: sessão anónima por token opaco, limites de uso,
 * persistência das mensagens e dos pedidos de orçamento, e chamada ao agente.
 * Nunca devolve custos, margens, tarifas de fornecedor nem dados de outros
 * visitantes. Não cria reservas nem pagamentos.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  AI_DISCLOSURE,
  allowsLead,
  CONVERSION_LIMITS,
  isConversionIntent,
  isMessageAcceptable,
  mergeIntent,
  NO_DATA_FALLBACK,
  validateLead,
  type ConversionIntent,
} from "../_shared/agents/conversion.ts";

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

const isHexToken = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

/** Limite por sessão, em memória da instância: chega para travar abuso trivial. */
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < CONVERSION_LIMITS.rateWindowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > CONVERSION_LIMITS.maxRequestsPerWindow;
}

async function loadConversation(client: SupabaseClient, tokenHash: string) {
  const { data } = await client.from("conversion_conversations")
    .select("id, status, intent, message_count, language").eq("session_token_hash", tokenHash).maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const client = db();
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "message");
  const providedToken = isHexToken(body.session_token) ? body.session_token : null;

  // --------------------------------------------------------------- start ---
  if (action === "start") {
    const token = newToken();
    const attribution = (body.attribution && typeof body.attribution === "object")
      ? body.attribution as Record<string, unknown>
      : {};
    const visitorId = isHexToken(body.visitor_id) ? null : (typeof body.visitor_id === "string" ? body.visitor_id : null);

    const { data, error } = await client.from("conversion_conversations").insert({
      session_token_hash: await sha256(token),
      visitor_id: visitorId,
      language: String(body.language ?? "pt").slice(0, 10),
      attribution,
    }).select("id").single();
    if (error) return json({ error: "Não foi possível iniciar a conversa." }, 400);

    await client.from("conversion_messages").insert({
      conversation_id: data.id,
      role: "assistant",
      content: AI_DISCLOSURE,
      grounded: true,
    });
    await client.from("conversion_conversations")
      .update({ message_count: 1, last_message_at: new Date().toISOString() }).eq("id", data.id);

    return json({
      session_token: token,
      intent: "inspiracao",
      messages: [{ role: "assistant", content: AI_DISCLOSURE }],
    });
  }

  if (!providedToken) return json({ error: "Sessão inválida." }, 404);
  const tokenHash = await sha256(providedToken);
  const conversation = await loadConversation(client, tokenHash);
  if (!conversation) return json({ error: "Sessão inválida." }, 404);

  // -------------------------------------------------------------- history --
  if (action === "history") {
    const { data } = await client.from("conversion_messages")
      .select("role, content, created_at").eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }).limit(100);
    return json({ intent: conversation.intent, status: conversation.status, messages: data ?? [] });
  }

  // -------------------------------------------------------------- message --
  if (action !== "message") return json({ error: `Ação desconhecida: ${action}` }, 400);

  if (rateLimited(tokenHash)) return json({ error: "Demasiados pedidos. Tenta daqui a pouco." }, 429);
  if (conversation.status !== "aberta") return json({ error: "Esta conversa já foi encerrada." }, 409);
  if (Number(conversation.message_count) >= CONVERSION_LIMITS.maxMessagesPerConversation) {
    return json({ error: "Conversa demasiado longa. Pede à equipa para continuar por email." }, 409);
  }

  const message = String(body.message ?? "");
  const acceptable = isMessageAcceptable(message);
  if (!acceptable.ok) return json({ error: acceptable.error }, 400);

  const currentIntent: ConversionIntent = isConversionIntent(conversation.intent) ? conversation.intent : "inspiracao";

  await client.from("conversion_messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: message.slice(0, CONVERSION_LIMITS.maxMessageChars),
  });

  const { data: history } = await client.from("conversion_messages")
    .select("role, content").eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false }).limit(CONVERSION_LIMITS.historyTurns);

  const agentRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-conversion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      message,
      current_intent: currentIntent,
      history: (history ?? []).reverse().filter((h) => h.role !== "system"),
    }),
  }).catch(() => null);

  const agent = agentRes ? await agentRes.json().catch(() => null) : null;
  const ok = Boolean(agentRes?.ok && agent?.ok);
  const reply: string = ok ? String(agent.result?.reply ?? NO_DATA_FALLBACK) : NO_DATA_FALLBACK;
  const intent = ok && isConversionIntent(agent.intent)
    ? mergeIntent(currentIntent, agent.intent)
    : currentIntent;

  await client.from("conversion_messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: reply,
    intent,
    tools_used: ok ? (agent.tools_used ?? []) : [],
    grounded: ok ? agent.result?.grounded === true : false,
    input_tokens: ok ? Number(agent.input_tokens ?? 0) : 0,
    output_tokens: ok ? Number(agent.output_tokens ?? 0) : 0,
    estimated_cost: ok ? Number(agent.estimated_cost ?? 0) : 0,
  });

  await client.from("conversion_conversations").update({
    intent,
    message_count: Number(conversation.message_count) + 2,
    last_message_at: new Date().toISOString(),
  }).eq("id", conversation.id);

  // O lead só é gravado quando a intenção o justifica e o contacto é válido.
  let leadCreated = false;
  const leadCandidate = ok ? agent.result?.lead : null;
  if (leadCandidate && allowsLead(intent)) {
    const validated = validateLead(leadCandidate);
    if (validated.valid) {
      const { data: existing } = await client.from("conversion_leads")
        .select("id").eq("conversation_id", conversation.id).maybeSingle();
      const payload = {
        ...validated.lead,
        conversation_id: conversation.id,
        intent: intent === "intencao_reserva" ? "intencao_reserva" : "pedido_orcamento",
      };
      const { error } = existing
        ? await client.from("conversion_leads").update(payload).eq("id", existing.id)
        : await client.from("conversion_leads").insert(payload);
      leadCreated = !error;
    }
  }

  return json({ reply, intent, lead_created: leadCreated, degraded: !ok });
});
