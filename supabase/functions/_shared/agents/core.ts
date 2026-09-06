// Pure, dependency-free logic of the agent foundation.
// Deno (edge functions) and vitest both import this file directly.

export const AGENT_TYPES = ["content", "discovery", "acquisition", "conversion"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export type PermissionLevel = "free" | "approval_required" | "forbidden";

export type TaskStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "permanently_failed"
  | "cancelled";

export interface PolicyRow {
  agent_type: string;
  action_key: string;
  level: PermissionLevel;
}

export interface CostLimits {
  dailyLimit: number;
  monthlyLimit: number;
  paused: boolean;
}

export interface CostTotals {
  daily: number;
  monthly: number;
}

export function isAgentType(value: unknown): value is AgentType {
  return typeof value === "string" && (AGENT_TYPES as readonly string[]).includes(value);
}

/** Deterministic key so the same logical task is never queued (or run) twice. */
export function buildIdempotencyKey(
  agentType: string,
  taskType: string,
  payload: unknown,
): string {
  return `${agentType}:${taskType}:${stableStringify(payload)}`;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/** Never execute a task that is already finished or already in flight. */
export function isExecutable(status: TaskStatus): boolean {
  return status === "pending" || status === "queued";
}

export function resolvePolicy(
  policies: PolicyRow[],
  agentType: string,
  actionKey: string,
): PermissionLevel {
  const match = policies.find(
    (p) => p.agent_type === agentType && p.action_key === actionKey,
  );
  // Unknown actions are denied by default — never fail open.
  return match?.level ?? "forbidden";
}

export interface RetryDecision {
  shouldRetry: boolean;
  nextStatus: Extract<TaskStatus, "failed" | "permanently_failed">;
  nextRetryCount: number;
  delayMs: number;
}

/** Bounded retry with exponential backoff. Never infinite. */
export function decideRetry(
  retryCount: number,
  maxRetries: number,
  permanent = false,
): RetryDecision {
  const nextRetryCount = retryCount + 1;
  if (permanent || nextRetryCount > maxRetries) {
    return { shouldRetry: false, nextStatus: "permanently_failed", nextRetryCount, delayMs: 0 };
  }
  return {
    shouldRetry: true,
    nextStatus: "failed",
    nextRetryCount,
    delayMs: Math.min(60_000 * 2 ** (nextRetryCount - 1), 15 * 60_000),
  };
}

export type BudgetVerdict =
  | { allowed: true }
  | { allowed: false; reason: "paused" | "daily_limit" | "monthly_limit" };

/** Checked BEFORE any AI call. A zero limit means "not authorised yet". */
export function checkBudget(limits: CostLimits, totals: CostTotals): BudgetVerdict {
  if (limits.paused) return { allowed: false, reason: "paused" };
  if (limits.dailyLimit <= 0 || totals.daily >= limits.dailyLimit) {
    return { allowed: false, reason: "daily_limit" };
  }
  if (limits.monthlyLimit <= 0 || totals.monthly >= limits.monthlyLimit) {
    return { allowed: false, reason: "monthly_limit" };
  }
  return { allowed: true };
}

/** Strip anything that must never travel to a model or a log. */
const SENSITIVE_KEYS = [
  "password", "token", "secret", "api_key", "apikey", "authorization",
  "email", "phone", "document_url", "id_document_url", "credential_url",
];

export function sanitizePayload(payload: unknown, depth = 0): unknown {
  if (depth > 6 || payload === null || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.map((v) => sanitizePayload(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.includes(key.toLowerCase())
      ? "[redacted]"
      : sanitizePayload(value, depth + 1);
  }
  return out;
}

export function summarize(value: unknown, max = 500): string {
  const text = typeof value === "string" ? value : JSON.stringify(sanitizePayload(value) ?? null);
  return (text ?? "").slice(0, max);
}
