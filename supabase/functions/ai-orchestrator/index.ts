// Generic orchestrator for the Rotas do Éden agent system.
// It owns queueing, policy, budget, idempotency, leases, retries, timeouts,
// approvals, bounded chaining, runs, costs, auditing and notifications.
// It contains NO agent-specific business logic.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  AGENT_TYPES,
  buildIdempotencyKey,
  canChain,
  checkBudget,
  decideRetry,
  isAgentType,
  isExecutable,
  resolvePolicy,
  sanitizePayload,
  summarize,
  type AgentType,
  type PolicyRow,
} from "../_shared/agents/core.ts";
import { providerStatus } from "../_shared/agents/providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = (): SupabaseClient =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const AGENT_FUNCTIONS: Record<AgentType, string> = {
  content: "ai-content",
  discovery: "ai-discovery",
  acquisition: "ai-acquisition",
  conversion: "ai-conversion",
};

interface OrchestratorLimits {
  leaseTimeoutMinutes: number;
  maxChainDepth: number;
  maxChildrenPerTask: number;
  taskTimeoutMs: number;
}

const FALLBACK_LIMITS: OrchestratorLimits = {
  leaseTimeoutMinutes: 10,
  maxChainDepth: 3,
  maxChildrenPerTask: 5,
  taskTimeoutMs: 110_000,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** system = cron/service call, admin = signed-in administrator, otherwise denied. */
async function authorize(
  req: Request,
): Promise<{ kind: "system" } | { kind: "admin"; userId: string; token: string } | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (token === SERVICE_ROLE_KEY) return { kind: "system" };

  const db = admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: isAdmin } = await db.rpc("is_admin", { _user_id: data.user.id });
  return isAdmin === true ? { kind: "admin", userId: data.user.id, token } : null;
}

async function loadPolicies(db: SupabaseClient): Promise<PolicyRow[]> {
  const { data } = await db.from("agent_policies").select("agent_type, action_key, level");
  return (data ?? []) as PolicyRow[];
}

async function loadLimits(db: SupabaseClient): Promise<OrchestratorLimits> {
  const { data } = await db.from("agent_config").select("value").eq("key", "orchestrator_limits").maybeSingle();
  const value = (data?.value ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  return {
    leaseTimeoutMinutes: num(value.lease_timeout_minutes, FALLBACK_LIMITS.leaseTimeoutMinutes),
    maxChainDepth: num(value.max_chain_depth, FALLBACK_LIMITS.maxChainDepth),
    maxChildrenPerTask: num(value.max_children_per_task, FALLBACK_LIMITS.maxChildrenPerTask),
    taskTimeoutMs: num(value.task_timeout_ms, FALLBACK_LIMITS.taskTimeoutMs),
  };
}

async function notifyAdmins(db: SupabaseClient, title: string, body: string, dedupe: string) {
  const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
  for (const row of admins ?? []) {
    const userId = (row as { user_id: string }).user_id;
    await db.from("notifications").insert({
      user_id: userId,
      type: "ai_agent",
      title,
      body,
      link: "/admin",
      entity_type: "agent_task",
      dedupe_key: `${dedupe}:${userId}`,
    });
  }
}

async function budgetVerdict(db: SupabaseClient, agentType: AgentType) {
  const { data: globalSettings } = await db
    .from("agent_settings").select("daily_limit, monthly_limit, paused").eq("scope", "global").maybeSingle();
  if (globalSettings?.paused) return { allowed: false as const, reason: "paused" as const, scope: "global" };

  const { data: agentSettings } = await db
    .from("agent_settings").select("daily_limit, monthly_limit, paused")
    .eq("scope", "agent").eq("agent_type", agentType).maybeSingle();

  const { data: globalTotals } = await db.rpc("agent_cost_totals", { _agent: null });
  const { data: agentTotals } = await db.rpc("agent_cost_totals", { _agent: agentType });
  const g = (globalTotals as { daily_total: number; monthly_total: number }[] | null)?.[0];
  const a = (agentTotals as { daily_total: number; monthly_total: number }[] | null)?.[0];

  const globalVerdict = checkBudget(
    {
      dailyLimit: Number(globalSettings?.daily_limit ?? 0),
      monthlyLimit: Number(globalSettings?.monthly_limit ?? 0),
      paused: Boolean(globalSettings?.paused),
    },
    { daily: Number(g?.daily_total ?? 0), monthly: Number(g?.monthly_total ?? 0) },
  );
  if (!globalVerdict.allowed) return { ...globalVerdict, scope: "global" };

  const agentVerdict = checkBudget(
    {
      dailyLimit: Number(agentSettings?.daily_limit ?? 0),
      monthlyLimit: Number(agentSettings?.monthly_limit ?? 0),
      paused: Boolean(agentSettings?.paused ?? true),
    },
    { daily: Number(a?.daily_total ?? 0), monthly: Number(a?.monthly_total ?? 0) },
  );
  return { ...agentVerdict, scope: "agent" };
}

async function ancestryOf(db: SupabaseClient, taskId: string | null, max = 10): Promise<string[]> {
  const chain: string[] = [];
  let current = taskId;
  for (let i = 0; i < max && current; i++) {
    const { data } = await db
      .from("agent_tasks").select("agent_type, task_type, parent_task_id").eq("id", current).maybeSingle();
    if (!data) break;
    chain.push(`${data.agent_type}:${data.task_type}`);
    current = data.parent_task_id as string | null;
  }
  return chain;
}

async function createTask(
  db: SupabaseClient,
  body: Record<string, unknown>,
  createdBy: string | null,
  limits: OrchestratorLimits,
) {
  const agentType = body.agent_type;
  const taskType = String(body.task_type ?? "").trim();
  if (!isAgentType(agentType)) return json({ error: `Invalid agent_type. Allowed: ${AGENT_TYPES.join(", ")}` }, 400);
  if (!taskType) return json({ error: "task_type is required" }, 400);

  const policies = await loadPolicies(db);
  const level = resolvePolicy(policies, agentType, taskType);
  if (level === "forbidden") return json({ error: `Action forbidden for ${agentType}: ${taskType}` }, 403);

  const payload = sanitizePayload(body.payload ?? {});
  const idempotencyKey = String(body.idempotency_key ?? buildIdempotencyKey(agentType, taskType, payload));

  const { data: existing } = await db
    .from("agent_tasks").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return json({ task: existing, deduplicated: true });

  // ---- bounded chaining -------------------------------------------------
  let depth = 0;
  const parentTaskId = (body.parent_task_id as string | undefined) ?? null;
  if (parentTaskId) {
    const { data: parent } = await db
      .from("agent_tasks").select("id, depth, agent_type, task_type").eq("id", parentTaskId).maybeSingle();
    if (!parent) return json({ error: "parent_task_id not found" }, 400);
    const { count: children } = await db
      .from("agent_tasks").select("id", { count: "exact", head: true }).eq("parent_task_id", parentTaskId);
    const verdict = canChain(
      {
        id: parent.id as string,
        depth: Number(parent.depth ?? 0),
        agent_type: String(parent.agent_type),
        task_type: String(parent.task_type),
        ancestry: await ancestryOf(db, parentTaskId),
      },
      { agent_type: agentType, task_type: taskType },
      Number(children ?? 0),
      { maxDepth: limits.maxChainDepth, maxChildren: limits.maxChildrenPerTask },
    );
    if (!verdict.allowed) return json({ error: `Chaining blocked: ${verdict.reason}`, reason: verdict.reason }, 409);
    depth = Number(parent.depth ?? 0) + 1;
  }

  const { data, error } = await db.from("agent_tasks").insert({
    agent_type: agentType,
    task_type: taskType,
    priority: Number(body.priority ?? 100),
    status: level === "approval_required" ? "waiting_approval" : "pending",
    payload,
    idempotency_key: idempotencyKey,
    max_retries: Number(body.max_retries ?? 3),
    scheduled_for: body.scheduled_for ?? new Date().toISOString(),
    created_by: createdBy,
    parent_task_id: parentTaskId,
    depth,
    max_cost_per_run: Number(body.max_cost_per_run ?? 0),
  }).select().single();
  if (error) return json({ error: error.message }, 400);

  if (level === "approval_required") {
    await db.from("agent_approvals").insert({
      task_id: data.id,
      agent_type: agentType,
      action_type: taskType,
      description: `Ação que exige aprovação: ${taskType}`,
      payload,
    });
    await notifyAdmins(db, "Aprovação pendente de um agente IA", `${agentType}: ${taskType}`, `agent-approval:${data.id}`);
  }
  return json({ task: data, policy: level });
}

async function callAgent(agentType: AgentType, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${AGENT_FUNCTIONS[agentType]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await res.json().catch(() => ({}));
    return { res, result };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw Object.assign(new Error(`Agente excedeu o tempo limite (${timeoutMs} ms)`), {
        code: "timeout",
        permanent: false,
      });
    }
    throw Object.assign(new Error((error as Error).message), { code: "network_error", permanent: false });
  } finally {
    clearTimeout(timer);
  }
}

async function runNext(db: SupabaseClient, limit: number, limits: OrchestratorLimits) {
  // Lease recovery first: never let a crashed run hold a task forever.
  const { data: recovered } = await db.rpc("agent_recover_stuck_tasks", {
    _timeout_minutes: limits.leaseTimeoutMinutes,
  });

  const { data: claimed, error } = await db.rpc("agent_claim_task", { _limit: limit });
  if (error) return json({ error: error.message }, 400);

  const tasks = (claimed ?? []) as Record<string, unknown>[];
  const outcomes: unknown[] = [];

  for (const task of tasks) {
    const agentType = task.agent_type as AgentType;
    const taskId = task.id as string;
    const attempt = Number(task.retry_count ?? 0) + 1;
    const startedAt = Date.now();

    const verdict = await budgetVerdict(db, agentType);
    if (!verdict.allowed) {
      await db.from("agent_tasks").update({
        status: "failed",
        last_error: `budget_blocked:${verdict.reason}`,
        failed_at: new Date().toISOString(),
        locked_at: null,
        scheduled_for: new Date(Date.now() + 15 * 60_000).toISOString(),
      }).eq("id", taskId);
      await db.from("agent_runs").insert({
        task_id: taskId, agent_type: agentType, attempt, status: "blocked",
        input_summary: summarize(task.payload), error_code: `budget_${verdict.reason}`,
        error_message: `Bloqueado pelo limite de custo (${verdict.scope})`,
        completed_at: new Date().toISOString(), duration_ms: Date.now() - startedAt,
      });
      await notifyAdmins(db, "Agente IA bloqueado por limite de custo", `${agentType}: ${verdict.reason}`, `agent-budget:${taskId}:${attempt}`);
      outcomes.push({ task_id: taskId, status: "blocked", reason: verdict.reason });
      continue;
    }

    try {
      const { res, result } = await callAgent(
        agentType,
        { task_id: taskId, task_type: task.task_type, payload: task.payload, attempt },
        limits.taskTimeoutMs,
      );
      const durationMs = Date.now() - startedAt;

      if (!res.ok || result?.ok === false) {
        throw Object.assign(new Error(result?.error ?? `Agent returned ${res.status}`), {
          permanent: result?.permanent === true,
          code: result?.code ?? `http_${res.status}`,
        });
      }

      const cost = Number(result?.estimated_cost ?? 0);
      const perRunLimit = Number(task.max_cost_per_run ?? 0);
      const overRunLimit = perRunLimit > 0 && cost > perRunLimit;

      const { data: run } = await db.from("agent_runs").insert({
        task_id: taskId, agent_type: agentType, attempt, status: "completed",
        model_provider: result?.provider ?? null, model_name: result?.model ?? null,
        input_summary: summarize(task.payload), output_summary: summarize(result?.result ?? result),
        tool_calls_count: Number(result?.tool_calls_count ?? 0),
        input_tokens: Number(result?.input_tokens ?? 0), output_tokens: Number(result?.output_tokens ?? 0),
        estimated_cost: cost,
        duration_ms: durationMs, completed_at: new Date().toISOString(),
      }).select("id").maybeSingle();

      if (cost > 0) {
        await db.from("agent_costs").insert({
          run_id: run?.id ?? null,
          task_id: taskId, agent_type: agentType,
          provider: result?.provider ?? "unknown", model: result?.model ?? "unknown",
          input_tokens: Number(result?.input_tokens ?? 0), output_tokens: Number(result?.output_tokens ?? 0),
          estimated_cost: cost,
        });
      }

      await db.from("agent_tasks").update({
        status: "completed",
        result: sanitizePayload(result?.result ?? null),
        completed_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
      }).eq("id", taskId);

      if (overRunLimit) {
        await notifyAdmins(
          db,
          "Execução de agente acima do limite por execução",
          `${agentType}: custo ${cost} > limite ${perRunLimit}`,
          `agent-run-limit:${taskId}:${attempt}`,
        );
      }
      outcomes.push({ task_id: taskId, status: "completed", run_id: run?.id ?? null, over_run_limit: overRunLimit });
    } catch (error) {
      const err = error as Error & { permanent?: boolean; code?: string };
      const decision = decideRetry(Number(task.retry_count ?? 0), Number(task.max_retries ?? 3), err.permanent === true);
      await db.from("agent_runs").insert({
        task_id: taskId, agent_type: agentType, attempt, status: "failed",
        input_summary: summarize(task.payload), error_code: err.code ?? "agent_error",
        error_message: summarize(err.message, 1000),
        duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString(),
      });
      await db.from("agent_tasks").update({
        status: decision.nextStatus,
        last_error: summarize(err.message, 1000),
        failed_at: new Date().toISOString(),
        locked_at: null,
        scheduled_for: new Date(Date.now() + decision.delayMs).toISOString(),
      }).eq("id", taskId);
      if (!decision.shouldRetry) {
        await notifyAdmins(db, "Tarefa de agente IA falhou definitivamente", `${agentType}: ${task.task_type} — ${summarize(err.message, 200)}`, `agent-failed:${taskId}`);
      }
      outcomes.push({ task_id: taskId, status: decision.nextStatus, retry_in_ms: decision.delayMs, code: err.code });
    }
  }

  return json({ claimed: tasks.length, recovered: (recovered as unknown[] | null)?.length ?? 0, outcomes });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = await authorize(req);
  if (!caller) return json({ error: "Not authorized" }, 403);

  const db = admin();
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = String(body.action ?? "status");
  const limits = await loadLimits(db);

  switch (action) {
    case "status": {
      const { count: pending } = await db.from("agent_tasks").select("id", { count: "exact", head: true }).in("status", ["pending", "queued"]);
      const { count: approvals } = await db.from("agent_approvals").select("id", { count: "exact", head: true }).eq("status", "pending");
      const { data: totals } = await db.rpc("agent_cost_totals", { _agent: null });
      return json({
        ok: true, phase: "3", providers: providerStatus(), limits,
        pending_tasks: pending ?? 0, pending_approvals: approvals ?? 0,
        cost_totals: (totals as unknown[])?.[0] ?? null,
      });
    }
    case "create_task":
      return await createTask(db, body, caller.kind === "admin" ? caller.userId : null, limits);
    case "run_next":
      return await runNext(db, Math.min(Number(body.limit ?? 1), 5), limits);
    case "recover_stuck": {
      const { data, error } = await db.rpc("agent_recover_stuck_tasks", {
        _timeout_minutes: Number(body.timeout_minutes ?? limits.leaseTimeoutMinutes),
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, recovered: data ?? [] });
    }
    case "review_approval": {
      if (caller.kind !== "admin") return json({ error: "Only admins may review approvals" }, 403);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${caller.token}` } },
      });
      const { error } = await userClient.rpc("agent_review_approval", {
        _approval_id: body.approval_id,
        _approve: body.approve === true,
        _reason: body.reason ?? null,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    case "cancel_task": {
      if (caller.kind !== "admin") return json({ error: "Only admins may cancel tasks" }, 403);
      const { data: task } = await db.from("agent_tasks").select("status").eq("id", body.task_id).maybeSingle();
      if (!task) return json({ error: "Task not found" }, 404);
      if (!isExecutable(task.status) && task.status !== "waiting_approval" && task.status !== "failed") {
        return json({ error: `Task cannot be cancelled in status ${task.status}` }, 400);
      }
      await db.from("agent_tasks").update({ status: "cancelled", locked_at: null }).eq("id", body.task_id);
      await db.from("admin_audit_log").insert({
        admin_id: caller.userId, action: "cancelar_tarefa_agente", entity_type: "agent_tasks",
        entity_id: body.task_id, details: {},
      });
      return json({ ok: true });
    }
    default:
      return json({ error: `Unknown action: ${action}` }, 400);
  }
});
