// Tool layer skeleton. No business tool is implemented in Phase 2A.
// Every future tool must be registered here so that argument validation,
// policy authorisation and execution logging are impossible to bypass.

import type { AgentType, PermissionLevel, PolicyRow } from "./core.ts";
import { resolvePolicy } from "./core.ts";

export interface ToolContext {
  agentType: AgentType;
  taskId: string | null;
  policies: PolicyRow[];
  log: (entry: { tool: string; ok: boolean; error?: string }) => void;
}

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  /** Policy action this tool maps to. */
  actionKey: string;
  description: string;
  /** Returns null when valid, or an error message. */
  validate: (args: unknown) => string | null;
  execute: (args: TArgs, ctx: ToolContext) => Promise<TResult>;
}

const registry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition) {
  if (registry.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
  registry.set(tool.name, tool);
}

export function listTools(): string[] {
  return [...registry.keys()];
}

export type ToolOutcome =
  | { ok: true; result: unknown }
  | { ok: false; error: string; reason: "unknown_tool" | "invalid_args" | "forbidden" | "needs_approval" | "failed" };

export async function runTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const tool = registry.get(name);
  if (!tool) return { ok: false, error: `Unknown tool: ${name}`, reason: "unknown_tool" };

  const invalid = tool.validate(args);
  if (invalid) {
    ctx.log({ tool: name, ok: false, error: invalid });
    return { ok: false, error: invalid, reason: "invalid_args" };
  }

  const level: PermissionLevel = resolvePolicy(ctx.policies, ctx.agentType, tool.actionKey);
  if (level === "forbidden") {
    ctx.log({ tool: name, ok: false, error: "forbidden" });
    return { ok: false, error: `Action not allowed: ${tool.actionKey}`, reason: "forbidden" };
  }
  if (level === "approval_required") {
    ctx.log({ tool: name, ok: false, error: "needs_approval" });
    return { ok: false, error: `Action requires approval: ${tool.actionKey}`, reason: "needs_approval" };
  }

  try {
    const result = await tool.execute(args, ctx);
    ctx.log({ tool: name, ok: true });
    return { ok: true, result };
  } catch (error) {
    const message = (error as Error).message;
    ctx.log({ tool: name, ok: false, error: message });
    return { ok: false, error: message, reason: "failed" };
  }
}
