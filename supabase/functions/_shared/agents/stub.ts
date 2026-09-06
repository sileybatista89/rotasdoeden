// Shared handler for the Phase 2A agent stubs.
// Only the orchestrator (service role) may call these functions.
// They perform no AI call, no external call and no data change.

import type { AgentType } from "./core.ts";
import { summarize } from "./core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function handleAgentStub(req: Request, agentType: AgentType): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return new Response(JSON.stringify({ ok: false, error: "Not authorized", permanent: true }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  return new Response(
    JSON.stringify({
      ok: true,
      agent_type: agentType,
      phase: "2A",
      provider: null,
      model: null,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      tool_calls_count: 0,
      result: {
        note: "Agente ainda não implementado (Fase 2A: apenas fundação).",
        received_task_type: summarize(body?.task_type ?? null, 100),
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
