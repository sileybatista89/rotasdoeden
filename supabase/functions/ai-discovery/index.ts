// Discovery Agent V1 — finds and structures international tourism demand
// opportunities related to São Tomé e Príncipe.
// Only the orchestrator (service role) may call this function.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { summarize } from "../_shared/agents/core.ts";
import { registerTool, runTool, type ToolContext } from "../_shared/agents/tools.ts";
import { getProvider, ProviderError, type ProviderName } from "../_shared/agents/providers.ts";
import { buildSource, SourceUnavailableError } from "../_shared/agents/sources.ts";
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  cacheKey,
  competitionComponent,
  computeConfidenceScore,
  computeOpportunityScore,
  DEFAULT_WEIGHTS,
  dedupeSignals,
  isLowConfidence,
  parseClassifications,
  resolveBatchLimit,
  round2,
  validateOpportunity,
  volumeComponent,
  type DiscoverySignal,
  type EvidenceType,
  type IntentClassification,
  type ScoreWeights,
  type StructuredOpportunity,
} from "../_shared/agents/discovery.ts";

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

function fail(code: string, message: string, permanent = true, status = 200) {
  return json({ ok: false, code, error: message, permanent }, status);
}

// ---------------------------------------------------------------- tools -----
// Tools never receive secrets: they read them from the environment themselves
// through the shared source/provider layers.

interface DiscoveryToolContext extends ToolContext {
  client: SupabaseClient;
  runtime: {
    weights: ScoreWeights;
    batchLimit: number;
    cacheTtlHours: number;
    provider: ProviderName;
    classifyModel: string;
    synthesisModel: string;
    usage: { inputTokens: number; outputTokens: number; estimatedCost: number; providerCalls: number };
  };
}

registerTool({
  name: "search_console_data",
  actionKey: "search_console_data",
  description: "Lê sinais de pesquisa observados (Search Console) ou sinais manuais explícitos.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (a.source_kind && typeof a.source_kind !== "string") return "source_kind must be a string";
    if (a.limit !== undefined && (!Number.isFinite(Number(a.limit)) || Number(a.limit) <= 0)) {
      return "limit must be a positive number";
    }
    if (a.signals !== undefined && !Array.isArray(a.signals)) return "signals must be an array";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as DiscoveryToolContext;
    const a = (args ?? {}) as Record<string, unknown>;
    const kind = String(a.source_kind ?? "google_search_console");
    const limit = Math.min(Number(a.limit ?? c.runtime.batchLimit), c.runtime.batchLimit);
    const source = buildSource(kind, {
      apiKey: Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY") ?? undefined,
      siteUrl: String(a.site_url ?? "https://www.rotasdoeden.com/"),
      signals: (a.signals ?? []) as DiscoverySignal[],
    });

    const request = {
      kind,
      limit,
      countries: (a.countries ?? null) as unknown,
      start_date: (a.start_date ?? null) as unknown,
      end_date: (a.end_date ?? null) as unknown,
    };
    const key = cacheKey(source.name, request);

    if (kind !== "manual_input") {
      const { data: cached } = await c.client.rpc("discovery_cache_get", { _key: key });
      const hit = (cached as { response: unknown; expired: boolean; created_at: string }[] | null)?.[0];
      if (hit && !hit.expired) {
        const payload = hit.response as { signals: DiscoverySignal[]; collected_at: string; limitations: string[] };
        return { ...payload, source: source.name, cache: { hit: true, expired: false, created_at: hit.created_at } };
      }
      if (hit && hit.expired) {
        // Expired cache is never presented as current data; we refetch below.
        await c.client.from("discovery_cache").delete().eq("cache_key", key);
      }
    }

    const result = await source.fetchSignals({
      countries: (a.countries as string[] | undefined) ?? undefined,
      startDate: a.start_date ? String(a.start_date) : undefined,
      endDate: a.end_date ? String(a.end_date) : undefined,
      limit,
    });

    if (kind !== "manual_input") {
      await c.client.rpc("discovery_cache_put", {
        _key: key,
        _source: source.name,
        _request: request,
        _response: result,
        _ttl_hours: c.runtime.cacheTtlHours,
      });
    }
    return { ...result, cache: { hit: false, expired: false } };
  },
});

registerTool({
  name: "classify_intent",
  actionKey: "classify_intent",
  description: "Classifica a intenção turística dos sinais através do fornecedor de IA (interpretação).",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || !Array.isArray(a.signals) || a.signals.length === 0) return "signals must be a non-empty array";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as DiscoveryToolContext;
    const signals = ((args as Record<string, unknown>).signals as DiscoverySignal[]).slice(0, c.runtime.batchLimit);
    const provider = getProvider(c.runtime.provider);
    if (!provider.isConfigured()) {
      throw new ProviderError(
        `Fornecedor de IA indisponível: ${c.runtime.provider}`,
        "provider_not_configured",
        undefined,
        true,
      );
    }

    const prompt = [
      "Sinais de pesquisa observados (query, país, impressões, cliques, posição média):",
      JSON.stringify(
        signals.map((s) => ({
          query: s.query,
          country: s.country,
          impressions: s.impressions ?? null,
          clicks: s.clicks ?? null,
          position: s.position ?? null,
        })),
      ),
      "Devolve o array JSON com a classificação de cada query.",
    ].join("\n");

    const generated = await provider.generate({
      model: c.runtime.classifyModel,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 4096,
      timeoutMs: 90_000,
    });

    c.runtime.usage.inputTokens += generated.inputTokens;
    c.runtime.usage.outputTokens += generated.outputTokens;
    c.runtime.usage.estimatedCost += generated.estimatedCost;
    c.runtime.usage.providerCalls += 1;

    const classifications = parseClassifications(generated.text);
    return { classifications, provider: generated.provider, model: generated.model };
  },
});

registerTool({
  name: "analyze_market",
  actionKey: "analyze_market",
  description: "Agrega os sinais classificados por mercado/país, sem inventar dados.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || !Array.isArray(a.opportunities)) return "opportunities must be an array";
    return null;
  },
  execute: (args) => {
    const rows = (args as Record<string, unknown>).opportunities as StructuredOpportunity[];
    const byCountry = new Map<string, { country: string; queries: number; impressions: number; avg_score: number }>();
    for (const row of rows) {
      const entry = byCountry.get(row.country) ?? { country: row.country, queries: 0, impressions: 0, avg_score: 0 };
      const impressions = Number((row.metrics as Record<string, unknown>)?.impressions ?? 0);
      entry.queries += 1;
      entry.impressions += Number.isFinite(impressions) ? impressions : 0;
      entry.avg_score += row.opportunity_score;
      byCountry.set(row.country, entry);
    }
    const markets = [...byCountry.values()].map((m) => ({
      ...m,
      avg_score: m.queries ? round2(m.avg_score / m.queries) : 0,
    })).sort((a, b) => b.avg_score - a.avg_score);
    return Promise.resolve({ markets, evidence_type: "interpreted" as EvidenceType });
  },
});

registerTool({
  name: "score_opportunity",
  actionKey: "score_opportunity",
  description: "Calcula de forma determinística o opportunity score e o confidence score.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (!a.signal || typeof a.signal !== "object") return "signal is required";
    return null;
  },
  execute: (args, ctx) => {
    const c = ctx as DiscoveryToolContext;
    const a = args as { signal: DiscoverySignal; classification?: IntentClassification | null };
    return Promise.resolve(scoreSignal(a.signal, a.classification ?? null, c.runtime.weights));
  },
});

registerTool({
  name: "save_opportunity",
  actionKey: "save_opportunity",
  description: "Grava (ou atualiza, deduplicando) uma oportunidade estruturada.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    const validation = validateOpportunity(a as Partial<StructuredOpportunity>);
    return validation.valid ? null : validation.errors.join("; ");
  },
  execute: async (args, ctx) => {
    const c = ctx as DiscoveryToolContext;
    const payload = { ...(args as Record<string, unknown>), task_id: c.taskId };
    const { data, error } = await c.client.rpc("discovery_save_opportunity", { _payload: payload });
    if (error) throw new Error(error.message);
    return { id: data as string };
  },
});

// --------------------------------------------------------------- scoring ----

export function scoreSignal(
  signal: DiscoverySignal,
  classification: IntentClassification | null,
  weights: ScoreWeights,
) {
  const scoreResult = computeOpportunityScore(
    {
      travel_intent: classification?.travel_intent ?? null,
      stp_relevance: classification?.stp_relevance ?? null,
      volume: volumeComponent(signal.impressions),
      potential_value: classification?.potential_value ?? null,
      competition: competitionComponent(signal.position),
      seasonality: classification?.seasonality ?? null,
    },
    weights,
  );

  const collectedAt = signal.collected_at ? Date.parse(signal.collected_at) : Date.now();
  const ageDays = Math.max(0, (Date.now() - (Number.isFinite(collectedAt) ? collectedAt : Date.now())) / 86_400_000);
  const confidence = computeConfidenceScore({
    sourceQuality: signal.source === "google_search_console" ? 0.9 : 0.5,
    ageDays,
    sampleSize: Number(signal.impressions ?? 0),
    consistency: classification ? Math.min(1, (classification.intent_confidence ?? 0) / 100) : 0.3,
    extrapolation: scoreResult.missing.length / 6,
  });

  return {
    opportunity_score: scoreResult.score,
    confidence_score: confidence,
    missing_components: scoreResult.missing,
    applied_weights: scoreResult.applied_weights,
    low_confidence: isLowConfidence(confidence),
  };
}

// ------------------------------------------------------------------ run -----

async function loadConfig(client: SupabaseClient) {
  const { data } = await client.from("agent_config").select("key, value");
  const map = new Map((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  const weights = { ...DEFAULT_WEIGHTS, ...((map.get("discovery_score_weights") as Partial<ScoreWeights>) ?? {}) };
  const limits = (map.get("discovery_limits") as Record<string, unknown>) ?? {};
  return {
    weights,
    batchLimit: resolveBatchLimit(limits.max_signals_per_run, 50),
    cacheTtlHours: Number(limits.cache_ttl_hours ?? 24) || 24,
  };
}

function pickProvider(requested?: string): ProviderName | null {
  const order: ProviderName[] = requested
    ? ([requested as ProviderName, "openai", "lovable", "google"].filter(
        (v, i, arr) => arr.indexOf(v) === i,
      ) as ProviderName[])
    : ["openai", "lovable", "google"];
  for (const name of order) {
    if (getProvider(name).isConfigured()) return name;
  }
  return null;
}

async function runDiscovery(body: Record<string, unknown>) {
  const client = db();
  const taskId = (body.task_id as string) ?? null;
  const payload = (body.payload ?? {}) as Record<string, unknown>;
  const config = await loadConfig(client);

  const provider = pickProvider(payload.provider as string | undefined);
  if (!provider) {
    return fail(
      "provider_not_configured",
      "Nenhum fornecedor de IA está configurado (OPENAI_API_KEY / LOVABLE_API_KEY / GEMINI_API_KEY).",
      true,
    );
  }

  const runtime: DiscoveryToolContext["runtime"] = {
    weights: config.weights,
    batchLimit: resolveBatchLimit(payload.max_signals ?? config.batchLimit, config.batchLimit),
    cacheTtlHours: config.cacheTtlHours,
    provider,
    classifyModel: String(payload.classify_model ?? defaultModel(provider, "classify")),
    synthesisModel: String(payload.synthesis_model ?? defaultModel(provider, "synthesis")),
    usage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0, providerCalls: 0 },
  };

  const { data: policies } = await client.from("agent_policies").select("agent_type, action_key, level");
  const toolLog: { tool: string; ok: boolean; error?: string }[] = [];
  const ctx: DiscoveryToolContext = {
    agentType: "discovery",
    taskId,
    policies: (policies ?? []) as ToolContext["policies"],
    log: (entry) => toolLog.push(entry),
    client,
    runtime,
  };

  // 1. OBSERVED signals
  const sourceKind = String(payload.source_kind ?? (Array.isArray(payload.signals) ? "manual_input" : "google_search_console"));
  const signalsOutcome = await runTool(
    "search_console_data",
    {
      source_kind: sourceKind,
      limit: runtime.batchLimit,
      countries: payload.countries,
      start_date: payload.start_date,
      end_date: payload.end_date,
      site_url: payload.site_url,
      signals: payload.signals,
    },
    ctx,
  );
  if (!signalsOutcome.ok) {
    const permanent = signalsOutcome.reason !== "failed";
    return fail(`signals_${signalsOutcome.reason}`, signalsOutcome.error, permanent);
  }
  const sourceResult = signalsOutcome.result as {
    source: string;
    signals: DiscoverySignal[];
    limitations: string[];
    cache: { hit: boolean; expired: boolean };
  };
  const signals = dedupeSignals(sourceResult.signals ?? []).slice(0, runtime.batchLimit);
  if (signals.length === 0) {
    return json({
      ok: true,
      agent_type: "discovery",
      provider,
      model: runtime.classifyModel,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      tool_calls_count: toolLog.length,
      result: { saved: 0, note: "A fonte não devolveu sinais no período pedido.", limitations: sourceResult.limitations },
    });
  }

  // 2. INTERPRETED classification
  const classifyOutcome = await runTool("classify_intent", { signals }, ctx);
  if (!classifyOutcome.ok) {
    const permanent = classifyOutcome.reason !== "failed";
    return fail(`classify_${classifyOutcome.reason}`, classifyOutcome.error, permanent);
  }
  const { classifications } = classifyOutcome.result as { classifications: IntentClassification[] };
  const byQuery = new Map(classifications.map((row) => [row.query.toLowerCase(), row]));

  // 3. deterministic scoring + persistence
  const saved: StructuredOpportunity[] = [];
  const skipped: { query: string; errors: string[] }[] = [];
  const defaultLanguage = String(payload.default_language ?? "und");

  for (const signal of signals) {
    const classification = byQuery.get(signal.query.toLowerCase()) ?? null;
    const scoreOutcome = await runTool("score_opportunity", { signal, classification }, ctx);
    if (!scoreOutcome.ok) {
      skipped.push({ query: signal.query, errors: [scoreOutcome.error] });
      continue;
    }
    const scores = scoreOutcome.result as ReturnType<typeof scoreSignal>;

    const evidence: EvidenceType = classification ? "interpreted" : "observed";
    const opportunity: StructuredOpportunity = {
      market: (payload.market as string | undefined) ?? signal.country ?? null,
      country: signal.country,
      language: classification?.language ?? signal.language ?? defaultLanguage,
      query: signal.query,
      intent: classification?.intent ?? null,
      intent_confidence: classification?.intent_confidence ?? null,
      category: classification?.category ?? null,
      season: classification?.season ?? null,
      source: signal.source ?? sourceResult.source,
      source_reference: {
        ...(signal.source_reference ?? {}),
        collected_at: signal.collected_at ?? null,
        cache_hit: sourceResult.cache?.hit ?? false,
        limitations: sourceResult.limitations,
      },
      metrics: {
        impressions: signal.impressions ?? null,
        clicks: signal.clicks ?? null,
        position: signal.position ?? null,
        ctr: signal.ctr ?? null,
        period_start: signal.period_start ?? null,
        period_end: signal.period_end ?? null,
        missing_components: scores.missing_components,
        applied_weights: scores.applied_weights,
      },
      evidence_type: evidence,
      opportunity_score: scores.opportunity_score,
      confidence_score: scores.confidence_score,
      rationale: classification?.rationale ?? null,
      recommended_action: scores.low_confidence
        ? "Confiança baixa: recolher mais dados antes de agir."
        : "Avaliar conteúdo/oferta para esta procura.",
    };

    const validation = validateOpportunity(opportunity);
    if (!validation.valid) {
      skipped.push({ query: signal.query, errors: validation.errors });
      continue;
    }
    const saveOutcome = await runTool("save_opportunity", opportunity, ctx);
    if (!saveOutcome.ok) {
      skipped.push({ query: signal.query, errors: [saveOutcome.error] });
      continue;
    }
    saved.push(opportunity);
  }

  const marketOutcome = await runTool("analyze_market", { opportunities: saved }, ctx);
  const markets = marketOutcome.ok ? (marketOutcome.result as { markets: unknown[] }).markets : [];

  return json({
    ok: true,
    agent_type: "discovery",
    provider,
    model: runtime.classifyModel,
    input_tokens: runtime.usage.inputTokens,
    output_tokens: runtime.usage.outputTokens,
    estimated_cost: Math.round(runtime.usage.estimatedCost * 1e6) / 1e6,
    tool_calls_count: toolLog.length,
    result: {
      source: sourceResult.source,
      cache: sourceResult.cache,
      signals: signals.length,
      saved: saved.length,
      skipped,
      markets,
      limitations: sourceResult.limitations,
      top: saved
        .slice()
        .sort((a, b) => b.opportunity_score - a.opportunity_score)
        .slice(0, 10)
        .map((o) => ({
          query: o.query,
          country: o.country,
          opportunity_score: o.opportunity_score,
          confidence_score: o.confidence_score,
          evidence_type: o.evidence_type,
        })),
    },
  });
}

function defaultModel(provider: ProviderName, kind: "classify" | "synthesis"): string {
  if (provider === "openai") return kind === "classify" ? "gpt-5.4-mini" : "gpt-5.5";
  if (provider === "google") return kind === "classify" ? "gemini-3.6-flash" : "gemini-3.1-pro-preview";
  return kind === "classify" ? "google/gemini-3.6-flash" : "openai/gpt-5.5";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Not authorized", permanent: true }, 403);
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const taskType = String((body as Record<string, unknown>).task_type ?? "discover_opportunities");

  try {
    switch (taskType) {
      case "discover_opportunities":
        return await runDiscovery(body as Record<string, unknown>);
      default:
        return fail("unknown_task_type", `Discovery não suporta o task_type: ${taskType}`, true);
    }
  } catch (error) {
    if (error instanceof SourceUnavailableError) {
      return fail(error.code, error.message, error.permanent);
    }
    if (error instanceof ProviderError) {
      return fail(error.code, summarize(error.message, 500), error.permanent);
    }
    return fail("discovery_error", summarize((error as Error).message, 500), false);
  }
});
