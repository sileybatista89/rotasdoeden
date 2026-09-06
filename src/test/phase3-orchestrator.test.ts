import { describe, expect, it, vi } from "vitest";
import {
  buildIdempotencyKey,
  canChain,
  checkBudget,
  decideRetry,
  isAgentType,
  isExecutable,
} from "../../supabase/functions/_shared/agents/core";
import { registerTool, runTool, type ToolContext } from "../../supabase/functions/_shared/agents/tools";
import type { PolicyRow } from "../../supabase/functions/_shared/agents/core";
import type { ToolOutcome } from "../../supabase/functions/_shared/agents/tools";

type ToolFailure = Extract<ToolOutcome, { ok: false }>;
const asFailure = (outcome: ToolOutcome): ToolFailure => {
  if (outcome.ok) throw new Error("expected the tool to fail");
  return outcome as ToolFailure;
};

const policies: PolicyRow[] = [
  { agent_type: "discovery", action_key: "t_free", level: "free" },
  { agent_type: "discovery", action_key: "t_approval", level: "approval_required" },
  { agent_type: "discovery", action_key: "t_forbidden", level: "forbidden" },
];

function ctx(): ToolContext {
  return { agentType: "discovery", taskId: "task-test", policies, log: vi.fn() };
}

registerTool({
  name: "test_ok",
  actionKey: "t_free",
  description: "ok",
  validate: (a) => (a && typeof a === "object" ? null : "args must be an object"),
  execute: () => Promise.resolve({ done: true }),
});
registerTool({
  name: "test_forbidden",
  actionKey: "t_forbidden",
  description: "forbidden",
  validate: () => null,
  execute: () => Promise.resolve({}),
});
registerTool({
  name: "test_approval",
  actionKey: "t_approval",
  description: "approval",
  validate: () => null,
  execute: () => Promise.resolve({}),
});
registerTool({
  name: "test_boom",
  actionKey: "t_free",
  description: "boom",
  validate: () => null,
  execute: () => Promise.reject(new Error("provider unavailable")),
});

describe("1-3. task and agent validation", () => {
  it("accepts a valid agent and rejects an invalid one", () => {
    expect(isAgentType("discovery")).toBe(true);
    expect(isAgentType("marketing")).toBe(false);
  });
  it("only executes tasks that are pending or queued", () => {
    expect(isExecutable("pending")).toBe(true);
    expect(isExecutable("queued")).toBe(true);
    expect(isExecutable("running")).toBe(false);
    expect(isExecutable("completed")).toBe(false);
  });
});

describe("4-5. missing / unavailable provider", () => {
  it("surfaces a tool failure instead of inventing a result", async () => {
    const outcome = await runTool("test_boom", {}, ctx());
    expect(asFailure(outcome).reason).toBe("failed");
    expect(asFailure(outcome).error).toContain("provider unavailable");
  });
  it("denies unknown tools by default", async () => {
    const outcome = await runTool("does_not_exist", {}, ctx());
    expect(outcome.ok).toBe(false);
  });
});

describe("6-8. timeout, retry and permanent failure", () => {
  it("retries with growing backoff", () => {
    const first = decideRetry(0, 3);
    const second = decideRetry(1, 3);
    expect(first.shouldRetry).toBe(true);
    expect(second.delayMs).toBeGreaterThan(first.delayMs);
  });
  it("stops after max retries", () => {
    const decision = decideRetry(3, 3);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.nextStatus).toBe("permanently_failed");
  });
  it("treats a permanent error as terminal immediately", () => {
    const decision = decideRetry(0, 3, true);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.nextStatus).toBe("permanently_failed");
  });
});

describe("9 & 13. idempotency and duplicate tasks", () => {
  it("produces the same key for the same logical task", () => {
    const a = buildIdempotencyKey("discovery", "discover_opportunities", { countries: ["PT", "FR"], limit: 50 });
    const b = buildIdempotencyKey("discovery", "discover_opportunities", { limit: 50, countries: ["PT", "FR"] });
    expect(a).toBe(b);
  });
  it("differs when the payload differs", () => {
    const a = buildIdempotencyKey("discovery", "discover_opportunities", { limit: 50 });
    const b = buildIdempotencyKey("discovery", "discover_opportunities", { limit: 10 });
    expect(a).not.toBe(b);
  });
});

describe("10-11. budget limits", () => {
  it("blocks when the limit is zero", () => {
    expect(checkBudget({ dailyLimit: 0, monthlyLimit: 0, paused: false }, { daily: 0, monthly: 0 })).toEqual({
      allowed: false,
      reason: "daily_limit",
    });
  });
  it("blocks when paused", () => {
    expect(checkBudget({ dailyLimit: 10, monthlyLimit: 100, paused: true }, { daily: 0, monthly: 0 }).allowed).toBe(false);
  });
  it("blocks when the monthly total is reached", () => {
    const verdict = checkBudget({ dailyLimit: 10, monthlyLimit: 100, paused: false }, { daily: 1, monthly: 100 });
    expect(verdict).toEqual({ allowed: false, reason: "monthly_limit" });
  });
  it("allows inside the limits", () => {
    expect(checkBudget({ dailyLimit: 10, monthlyLimit: 100, paused: false }, { daily: 1, monthly: 5 }).allowed).toBe(true);
  });
});

describe("18. unauthorized access", () => {
  it("refuses a forbidden action", async () => {
    const outcome = await runTool("test_forbidden", {}, ctx());
    expect(asFailure(outcome).reason).toBe("forbidden");
  });
  it("refuses an action that needs approval", async () => {
    const outcome = await runTool("test_approval", {}, ctx());
    expect(asFailure(outcome).reason).toBe("needs_approval");
  });
  it("validates arguments before running anything", async () => {
    const outcome = await runTool("test_ok", "not-an-object", ctx());
    expect(asFailure(outcome).reason).toBe("invalid_args");
  });
  it("runs an allowed, valid tool", async () => {
    const outcome = await runTool("test_ok", {}, ctx());
    expect(outcome.ok).toBe(true);
  });
});

describe("24-25. bounded chaining", () => {
  const limits = { maxDepth: 3, maxChildren: 5 };
  const parent = { id: "p1", depth: 1, agent_type: "discovery", task_type: "discover_opportunities", ancestry: ["discovery:discover_opportunities"] };

  it("allows a child inside the limits", () => {
    expect(canChain(parent, { agent_type: "content", task_type: "draft_article" }, 0, limits)).toEqual({ allowed: true });
  });
  it("blocks beyond max depth", () => {
    expect(canChain({ ...parent, depth: 3 }, { agent_type: "content", task_type: "draft_article" }, 0, limits))
      .toEqual({ allowed: false, reason: "max_depth" });
  });
  it("blocks beyond max children", () => {
    expect(canChain(parent, { agent_type: "content", task_type: "draft_article" }, 5, limits))
      .toEqual({ allowed: false, reason: "max_children" });
  });
  it("blocks self replication", () => {
    expect(canChain(parent, { agent_type: "discovery", task_type: "discover_opportunities" }, 0, limits))
      .toEqual({ allowed: false, reason: "self_replication" });
  });
  it("blocks cycles in the ancestry", () => {
    expect(canChain({ ...parent, ancestry: ["discovery:discover_opportunities", "content:draft_article"] }, { agent_type: "content", task_type: "draft_article" }, 0, limits))
      .toEqual({ allowed: false, reason: "cycle" });
  });
});
