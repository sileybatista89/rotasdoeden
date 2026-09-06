import { describe, expect, it } from "vitest";
import {
  buildIdempotencyKey,
  checkBudget,
  decideRetry,
  isAgentType,
  isExecutable,
  resolvePolicy,
  sanitizePayload,
  stableStringify,
  summarize,
  type PolicyRow,
} from "../../supabase/functions/_shared/agents/core";

const policies: PolicyRow[] = [
  { agent_type: "content", action_key: "create_draft", level: "free" },
  { agent_type: "content", action_key: "publish", level: "approval_required" },
  { agent_type: "content", action_key: "delete_content", level: "forbidden" },
  { agent_type: "conversion", action_key: "execute_payment", level: "forbidden" },
];

describe("agent type validation", () => {
  it("accepts the four agents", () => {
    for (const a of ["content", "discovery", "acquisition", "conversion"]) {
      expect(isAgentType(a)).toBe(true);
    }
  });
  it("rejects anything else", () => {
    expect(isAgentType("orchestrator")).toBe(false);
    expect(isAgentType("admin")).toBe(false);
    expect(isAgentType(null)).toBe(false);
  });
});

describe("policy resolution", () => {
  it("returns the configured level", () => {
    expect(resolvePolicy(policies, "content", "create_draft")).toBe("free");
    expect(resolvePolicy(policies, "content", "publish")).toBe("approval_required");
    expect(resolvePolicy(policies, "content", "delete_content")).toBe("forbidden");
    expect(resolvePolicy(policies, "conversion", "execute_payment")).toBe("forbidden");
  });
  it("denies unknown actions by default", () => {
    expect(resolvePolicy(policies, "content", "wire_money")).toBe("forbidden");
    expect(resolvePolicy(policies, "discovery", "create_draft")).toBe("forbidden");
  });
});

describe("idempotency", () => {
  it("is stable regardless of key order", () => {
    const a = buildIdempotencyKey("content", "create_draft", { b: 2, a: 1 });
    const b = buildIdempotencyKey("content", "create_draft", { a: 1, b: 2 });
    expect(a).toBe(b);
  });
  it("differs per agent, task and payload", () => {
    const base = buildIdempotencyKey("content", "create_draft", { topic: "praias" });
    expect(base).not.toBe(buildIdempotencyKey("discovery", "create_draft", { topic: "praias" }));
    expect(base).not.toBe(buildIdempotencyKey("content", "publish", { topic: "praias" }));
    expect(base).not.toBe(buildIdempotencyKey("content", "create_draft", { topic: "trilhos" }));
  });
  it("serialises nested structures deterministically", () => {
    expect(stableStringify({ z: [1, { y: 2, x: 3 }] })).toBe('{"z":[1,{"x":3,"y":2}]}');
  });
  it("only allows execution from pending or queued", () => {
    expect(isExecutable("pending")).toBe(true);
    expect(isExecutable("queued")).toBe(true);
    expect(isExecutable("running")).toBe(false);
    expect(isExecutable("completed")).toBe(false);
    expect(isExecutable("waiting_approval")).toBe(false);
    expect(isExecutable("permanently_failed")).toBe(false);
  });
});

describe("retries", () => {
  it("retries with growing backoff up to the limit", () => {
    const first = decideRetry(0, 3);
    expect(first.shouldRetry).toBe(true);
    expect(first.nextStatus).toBe("failed");
    const second = decideRetry(1, 3);
    expect(second.delayMs).toBeGreaterThan(first.delayMs);
  });
  it("stops permanently after max retries", () => {
    const last = decideRetry(3, 3);
    expect(last.shouldRetry).toBe(false);
    expect(last.nextStatus).toBe("permanently_failed");
  });
  it("never retries a permanent error", () => {
    const d = decideRetry(0, 3, true);
    expect(d.shouldRetry).toBe(false);
    expect(d.nextStatus).toBe("permanently_failed");
  });
  it("caps the backoff delay", () => {
    expect(decideRetry(9, 10).delayMs).toBeLessThanOrEqual(15 * 60_000);
  });
});

describe("cost limits", () => {
  const totals = { daily: 1, monthly: 5 };
  it("blocks while paused", () => {
    expect(checkBudget({ dailyLimit: 10, monthlyLimit: 100, paused: true }, totals))
      .toEqual({ allowed: false, reason: "paused" });
  });
  it("blocks when no limit is configured", () => {
    expect(checkBudget({ dailyLimit: 0, monthlyLimit: 0, paused: false }, totals))
      .toEqual({ allowed: false, reason: "daily_limit" });
  });
  it("blocks when the daily limit is reached", () => {
    expect(checkBudget({ dailyLimit: 1, monthlyLimit: 100, paused: false }, totals))
      .toEqual({ allowed: false, reason: "daily_limit" });
  });
  it("blocks when the monthly limit is reached", () => {
    expect(checkBudget({ dailyLimit: 10, monthlyLimit: 5, paused: false }, totals))
      .toEqual({ allowed: false, reason: "monthly_limit" });
  });
  it("allows within limits", () => {
    expect(checkBudget({ dailyLimit: 10, monthlyLimit: 100, paused: false }, totals))
      .toEqual({ allowed: true });
  });
});

describe("data protection", () => {
  it("redacts secrets and personal data", () => {
    const clean = sanitizePayload({
      topic: "praias",
      email: "pessoa@exemplo.com",
      nested: { api_key: "sk-123", phone: "+351000", id_document_url: "https://x" },
    }) as Record<string, unknown>;
    expect(clean.topic).toBe("praias");
    expect(clean.email).toBe("[redacted]");
    expect((clean.nested as Record<string, unknown>).api_key).toBe("[redacted]");
    expect((clean.nested as Record<string, unknown>).phone).toBe("[redacted]");
    expect((clean.nested as Record<string, unknown>).id_document_url).toBe("[redacted]");
  });
  it("truncates summaries and never leaks secrets into logs", () => {
    expect(summarize("x".repeat(2000)).length).toBe(500);
    expect(summarize({ secret: "abc" })).toContain("[redacted]");
  });
});
