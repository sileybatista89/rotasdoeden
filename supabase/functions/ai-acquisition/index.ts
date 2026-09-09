// Acquisition Agent V1 — turns ACCEPTED discovery opportunities into DRAFT
// acquisition plans, optional content asset requests and DRAFT campaigns.
// It never publishes, never spends, never contacts anyone outside the platform.
// Only the orchestrator (service role) may call this function.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { summarize } from "../_shared/agents/core.ts";
import { registerTool, runTool, type ToolContext } from "../_shared/agents/tools.ts";
import { getProvider, ProviderError, type ProviderName } from "../_shared/agents/providers.ts";
import {
  ACQUISITION_SYSTEM_PROMPT,
  assessCapacity,
  canExecuteChannel,
  CHANNELS,
  checkCampaignBudget,
  checkOpportunityEligibility,
  decideFromScore,
  deriveFactors,
  DEFAULT_WEIGHTS,
  getChannel,
  parseAnalysis,
  planDedupKey,
  resolveMarketState,
  resolvePlanBatchLimit,
  scoreAcquisition,
  type CapacityResult,
  type ScoreWeights,
} from "../_shared/agents/acquisition.ts";

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

function fail(code: string, message: string, permanent = true) {
  return json({ ok: false, code, error: message, permanent });
}

interface AcquisitionRuntime {
  provider: ProviderName;
  analysisModel: string;
  weights: ScoreWeights;
  minConfidence: number;
  maxPlansPerRun: number;
  budget: { campaign_budget_cap: number; period_budget_cap: number; total_budget_cap: number };
  usage: { inputTokens: number; outputTokens: number; estimatedCost: number; providerCalls: number };
}

interface AcqContext extends ToolContext {
  client: SupabaseClient;
  runtime: AcquisitionRuntime;
}

// ---------------------------------------------------------------- tools -----

registerTool({
  name: "acq_get_opportunity",
  actionKey: "read_data",
  description: "Lê uma oportunidade de Discovery e valida a elegibilidade para aquisição.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a.opportunity_id !== "string" || !a.opportunity_id) return "opportunity_id is required";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const id = String((args as Record<string, unknown>).opportunity_id);
    const { data, error } = await c.client
      .from("discovery_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { opportunity: null, eligibility: { eligible: false, reason: "Oportunidade inexistente." } };
    const evidence = Array.isArray((data as { evidence?: unknown[] }).evidence)
      ? ((data as { evidence: unknown[] }).evidence)
      : [];
    let eligibility = checkOpportunityEligibility(data as never, new Date(), c.runtime.minConfidence);
    if (eligibility.eligible && evidence.length === 0) {
      eligibility = { eligible: false, reason: "Oportunidade sem evidência." };
    }
    return { opportunity: data, evidence, eligibility };
  },
});

registerTool({
  name: "acq_get_capacity",
  actionKey: "read_data",
  description: "Lê a capacidade real: guias publicados, serviços aprovados, territórios, idiomas e reservas.",
  validate: () => null,
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const language = ((args as Record<string, unknown>)?.language as string | undefined) ?? null;
    const [{ data: guides }, { data: services }, { data: districts }, { count: bookings }] = await Promise.all([
      c.client.from("professional_profiles").select("id, languages").eq("status", "published").limit(500),
      c.client
        .from("services")
        .select("id, price, languages")
        .eq("moderation_status", "approved")
        .limit(500),
      c.client.from("districts").select("id").limit(100),
      c.client.from("bookings").select("id", { count: "exact", head: true }).eq("payment_status", "paid"),
    ]);

    const languages = new Set<string>();
    for (const row of guides ?? []) {
      for (const lang of ((row as { languages?: string[] | null }).languages ?? [])) languages.add(String(lang));
    }
    for (const row of services ?? []) {
      for (const lang of ((row as { languages?: string[] | null }).languages ?? [])) languages.add(String(lang));
    }
    const prices = (services ?? [])
      .map((s) => Number((s as { price?: number | null }).price ?? 0))
      .filter((p) => p > 0);

    const capacity = assessCapacity({
      publishedGuides: (guides ?? []).length,
      approvedServices: (services ?? []).length,
      districts: (districts ?? []).length,
      languages: [...languages],
      pastBookings: bookings ?? 0,
      targetLanguage: language,
    });
    return {
      capacity,
      averageServicePrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    };
  },
});

registerTool({
  name: "acq_get_market_signals",
  actionKey: "read_attribution",
  description: "Lê sinais observados (Discovery + atribuição first-party) para o mercado.",
  validate: () => null,
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const a = (args ?? {}) as { market?: string | null; country?: string | null };
    const [{ data: events }, { data: bookings }] = await Promise.all([
      c.client.from("traffic_events").select("id, value").limit(1000),
      c.client.from("bookings").select("id, attribution").eq("payment_status", "paid").limit(500),
    ]);
    const observedClicks = (events ?? []).length;
    const bookingsFromMarket = (bookings ?? []).filter((b) => {
      const attribution = ((b as { attribution?: Record<string, string> | null }).attribution ?? {});
      const value = `${attribution.utm_campaign ?? ""} ${attribution.language ?? ""}`.toLowerCase();
      return a.market ? value.includes(String(a.market).toLowerCase()) : false;
    }).length;
    return { observedClicks, bookingsFromMarket, country: a.country ?? null };
  },
});

registerTool({
  name: "acq_analyze",
  actionKey: "draft_plan",
  description: "Produz a hipótese, público, mensagem e oferta a partir de dados reais.",
  validate: (args) => ((args as Record<string, unknown>)?.brief ? null : "brief is required"),
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const brief = (args as { brief: Record<string, unknown> }).brief;
    const provider = getProvider(c.runtime.provider);
    if (!provider.isConfigured()) {
      throw new ProviderError(
        `Fornecedor de IA indisponível: ${c.runtime.provider}`,
        "provider_not_configured",
        undefined,
        true,
      );
    }
    const result = await provider.generate({
      model: c.runtime.analysisModel,
      system: ACQUISITION_SYSTEM_PROMPT,
      prompt: JSON.stringify(brief),
      maxOutputTokens: 2048,
      timeoutMs: 90_000,
    });
    c.runtime.usage.inputTokens += result.inputTokens;
    c.runtime.usage.outputTokens += result.outputTokens;
    c.runtime.usage.estimatedCost += result.estimatedCost;
    c.runtime.usage.providerCalls += 1;
    return { analysis: parseAnalysis(result.text, String(brief.language ?? "pt")), model: result.model };
  },
});

registerTool({
  name: "acq_save_plan",
  actionKey: "draft_plan",
  description: "Grava o plano de aquisição SEMPRE como rascunho, com deduplicação.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (!a.market) return "market is required";
    if (a.status && a.status !== "rascunho") return "agent can only create drafts";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const { data, error } = await c.client.rpc("acquisition_save_plan", { _payload: args });
    if (error) throw new Error(error.message);
    return data as Record<string, unknown>;
  },
});

registerTool({
  name: "acq_request_asset",
  actionKey: "request_asset",
  description: "Pede um ativo ao Agente de Conteúdo criando uma tarefa filha (rascunho).",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a?.plan_id || !a?.asset_type) return "plan_id and asset_type are required";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const a = args as {
      plan_id: string;
      asset_type: string;
      purpose?: string;
      language?: string;
      opportunity_id?: string | null;
      content_type?: string;
    };

    // Reuse an approved content item before asking for new work.
    if (a.opportunity_id) {
      const { data: existing } = await c.client
        .from("content_items")
        .select("id, status")
        .eq("discovery_opportunity_id", a.opportunity_id)
        .in("status", ["approved", "published"])
        .limit(1);
      const reuse = (existing ?? [])[0] as { id: string } | undefined;
      if (reuse) {
        const { data } = await c.client.rpc("acquisition_request_asset", {
          _payload: {
            plan_id: a.plan_id,
            asset_type: a.asset_type,
            purpose: a.purpose ?? null,
            language: a.language ?? null,
            status: "reutilizado",
            note: "Conteúdo aprovado existente reutilizado.",
          },
        });
        await c.client
          .from("acquisition_assets")
          .update({ content_id: reuse.id })
          .eq("id", (data as { asset_id: string }).asset_id);
        return { ...(data as Record<string, unknown>), reused_content_id: reuse.id };
      }
    }

    const { data, error } = await c.client.rpc("acquisition_request_asset", {
      _payload: {
        plan_id: a.plan_id,
        asset_type: a.asset_type,
        purpose: a.purpose ?? null,
        language: a.language ?? null,
        status: "solicitado",
      },
    });
    if (error) throw new Error(error.message);
    const assetId = (data as { asset_id: string; created: boolean }).asset_id;
    if (!(data as { created: boolean }).created) return data as Record<string, unknown>;

    // Child task for the Content Agent, through the existing task system.
    const { data: task, error: taskError } = await c.client
      .from("agent_tasks")
      .insert({
        agent_type: "content",
        task_type: "create_draft",
        status: "pending",
        parent_task_id: c.taskId,
        payload: {
          opportunity_id: a.opportunity_id ?? null,
          content_type: a.content_type ?? "landing_page",
          language: a.language ?? "pt",
          requested_by: "acquisition",
          acquisition_asset_id: assetId,
        },
        idempotency_key: `acquisition_asset:${assetId}`,
      })
      .select("id")
      .maybeSingle();
    if (taskError && !String(taskError.message).includes("duplicate")) {
      throw new Error(taskError.message);
    }
    if (task?.id) {
      await c.client.from("acquisition_assets").update({ requested_task_id: task.id }).eq("id", assetId);
    }
    return { ...(data as Record<string, unknown>), child_task_id: task?.id ?? null };
  },
});

registerTool({
  name: "acq_draft_campaign",
  actionKey: "draft_campaign",
  description: "Cria uma campanha APENAS como rascunho, sempre com orçamento zero.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a?.plan_id || !a?.channel) return "plan_id and channel are required";
    if (a.status && a.status !== "rascunho") return "agent can only create draft campaigns";
    if (Number(a.requested_budget ?? 0) > 0) return "budget is not authorised";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as AcqContext;
    const a = args as { plan_id: string; channel: string; name?: string; stop_conditions?: unknown };
    const budget = checkCampaignBudget(1, c.runtime.budget, 0, 0);
    if (budget.allowed) {
      // Defensive: in this phase every cap is zero, so this must never happen.
      throw new Error("budget_guard_inconsistent");
    }
    const { data, error } = await c.client.rpc("acquisition_save_campaign_draft", {
      _payload: {
        plan_id: a.plan_id,
        channel: a.channel,
        name: a.name ?? null,
        stop_conditions: a.stop_conditions ?? {
          sem_medicao: true,
          orcamento_zero: true,
          requer_aprovacao_humana: true,
        },
      },
    });
    if (error) throw new Error(error.message);
    return { ...(data as Record<string, unknown>), executable: canExecuteChannel() };
  },
});

// ------------------------------------------------------------------- run ----

async function loadConfig(client: SupabaseClient) {
  const { data } = await client.from("agent_config").select("key, value");
  const map = new Map((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return {
    weights: (map.get("acquisition_score_weights") as Partial<ScoreWeights>) ?? {},
    limits: (map.get("acquisition_limits") as Record<string, unknown>) ?? {},
    models: (map.get("acquisition_models") as Record<string, unknown>) ?? {},
  };
}

function pickProvider(requested?: string): ProviderName | null {
  if (requested) {
    const name = requested as ProviderName;
    return getProvider(name).isConfigured() ? name : null;
  }
  // Classification/scoring work: cheapest configured provider first.
  for (const name of ["lovable", "google", "openai"] as ProviderName[]) {
    if (getProvider(name).isConfigured()) return name;
  }
  return null;
}

function defaultModel(provider: ProviderName): string {
  if (provider === "openai") return "gpt-5.4-mini";
  if (provider === "google") return "gemini-3.6-flash";
  return "google/gemini-3.6-flash";
}

async function runAcquisition(body: Record<string, unknown>) {
  const client = db();
  const taskId = (body.task_id as string) ?? null;
  const runId = (body.run_id as string) ?? null;
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  const provider = pickProvider(payload.provider as string | undefined);
  if (!provider) {
    return fail(
      "provider_not_configured",
      "Nenhum fornecedor de IA está configurado (LOVABLE_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY).",
      true,
    );
  }

  const config = await loadConfig(client);
  const limits = config.limits as Record<string, number>;
  const runtime: AcquisitionRuntime = {
    provider,
    analysisModel: String(payload.model ?? config.models.analysis_model ?? defaultModel(provider)),
    weights: { ...DEFAULT_WEIGHTS, ...(config.weights as ScoreWeights) },
    minConfidence: Number(limits.min_confidence ?? 0.5),
    maxPlansPerRun: resolvePlanBatchLimit(
      payload.max_plans as number | undefined,
      Number(limits.max_plans_per_run ?? 3),
    ),
    budget: {
      campaign_budget_cap: Number(limits.campaign_budget_cap ?? 0),
      period_budget_cap: Number(limits.period_budget_cap ?? 0),
      total_budget_cap: Number(limits.total_budget_cap ?? 0),
    },
    usage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0, providerCalls: 0 },
  };

  const { data: policies } = await client.from("agent_policies").select("agent_type, action_key, level");
  const toolLog: { tool: string; ok: boolean; error?: string }[] = [];
  const ctx: AcqContext = {
    agentType: "acquisition",
    taskId,
    policies: (policies ?? []) as ToolContext["policies"],
    log: (entry) => toolLog.push(entry),
    client,
    runtime,
  };

  const respond = (result: unknown) =>
    json({
      ok: true,
      agent_type: "acquisition",
      provider,
      model: runtime.analysisModel,
      input_tokens: runtime.usage.inputTokens,
      output_tokens: runtime.usage.outputTokens,
      estimated_cost: Math.round(runtime.usage.estimatedCost * 1e6) / 1e6,
      tool_calls_count: toolLog.length,
      result,
    });

  // 1. Which accepted opportunities are we allowed to work on?
  let opportunityIds: string[] = [];
  if (typeof payload.opportunity_id === "string" && payload.opportunity_id) {
    opportunityIds = [payload.opportunity_id];
  } else {
    const { data } = await client
      .from("discovery_opportunities")
      .select("id")
      .eq("status", "aceite")
      .order("created_at", { ascending: false })
      .limit(runtime.maxPlansPerRun);
    opportunityIds = (data ?? []).map((r: { id: string }) => r.id);
  }

  if (opportunityIds.length === 0) {
    return respond({
      analyzed: 0,
      plans_created: 0,
      note: "Sem oportunidades aceites para aquisição.",
    });
  }

  const processed: Record<string, unknown>[] = [];
  let plansCreated = 0;

  for (const opportunityId of opportunityIds.slice(0, runtime.maxPlansPerRun)) {
    const oppOutcome = await runTool("acq_get_opportunity", { opportunity_id: opportunityId }, ctx);
    if (!oppOutcome.ok) {
      processed.push({ opportunity_id: opportunityId, skipped: oppOutcome.error });
      continue;
    }
    const { opportunity, evidence, eligibility } = oppOutcome.result as {
      opportunity: Record<string, unknown> | null;
      evidence: unknown[];
      eligibility: { eligible: boolean; reason?: string };
    };
    if (!eligibility.eligible) {
      processed.push({ opportunity_id: opportunityId, eligible: false, reason: eligibility.reason });
      continue;
    }

    const language = String(opportunity?.language ?? "pt");
    const market = String(opportunity?.market ?? opportunity?.country ?? "desconhecido");

    // 2. Real capacity
    const capOutcome = await runTool("acq_get_capacity", { language }, ctx);
    if (!capOutcome.ok) {
      processed.push({ opportunity_id: opportunityId, skipped: capOutcome.error });
      continue;
    }
    const { capacity, averageServicePrice } = capOutcome.result as {
      capacity: CapacityResult;
      averageServicePrice: number | null;
    };

    // 3. Observed signals
    const signalsOutcome = await runTool("acq_get_market_signals", { market, country: opportunity?.country }, ctx);
    const signals = signalsOutcome.ok
      ? (signalsOutcome.result as { observedClicks: number; bookingsFromMarket: number })
      : { observedClicks: 0, bookingsFromMarket: 0 };

    const observedSignals = evidence.length + signals.observedClicks;
    const marketState = resolveMarketState({
      observedSignals,
      bookings: signals.bookingsFromMarket,
      servingCapacity: capacity.sufficient ? 1 : 0,
    });

    // 4. Deterministic score. Confidence multiplies the total.
    const factors = deriveFactors({
      opportunityScore: Number(opportunity?.score ?? 0),
      intent: (opportunity?.intent as string) ?? null,
      country: (opportunity?.country as string) ?? null,
      observedSignals,
      observedClicks: signals.observedClicks,
      bookingsFromMarket: signals.bookingsFromMarket,
      capacity,
      seasonMatch: null,
      averageServicePrice,
    });
    const confidence = Number(opportunity?.confidence_score ?? 0);
    const scored = scoreAcquisition(factors, confidence, runtime.weights);
    let decision = decideFromScore(scored, marketState, runtime.minConfidence);
    const rationaleParts: string[] = [];
    if (!capacity.sufficient) {
      decision = decision === "descartar" ? "descartar" : "esperar";
      rationaleParts.push(`Capacidade insuficiente: ${capacity.reasons.join(" ")}`);
    }

    // 5. Analysis (only when it is worth planning)
    let analysis = null as ReturnType<typeof parseAnalysis> | null;
    if (decision !== "descartar") {
      const analysisOutcome = await runTool(
        "acq_analyze",
        {
          brief: {
            market,
            language,
            country: opportunity?.country ?? null,
            query: opportunity?.query ?? null,
            intent: opportunity?.intent ?? null,
            evidence,
            capacity: capacity.snapshot,
            capacity_sufficient: capacity.sufficient,
            market_state: marketState,
            score: scored.score,
            available_channels: CHANNELS,
            limitations: [
              "Sem Keyword Planner: volume de mercado limitado à evidência observada.",
              "Sem integrações de anúncios: nenhum canal pago pode ser executado.",
            ],
          },
        },
        ctx,
      );
      if (!analysisOutcome.ok) {
        if (analysisOutcome.reason === "failed") {
          return fail("analysis_failed", analysisOutcome.error, false);
        }
        processed.push({ opportunity_id: opportunityId, skipped: analysisOutcome.error });
        continue;
      }
      analysis = (analysisOutcome.result as { analysis: ReturnType<typeof parseAnalysis> }).analysis;
    }

    // 6. Channel: organic only, since no paid channel is connected.
    const channel = decision === "perseguir" ? "seo" : "landing_page";
    const channelInfo = getChannel(channel);

    rationaleParts.push(
      `Score ${scored.score} (confiança ${scored.confidence}), estado de mercado "${marketState}".`,
    );

    const saveOutcome = await runTool(
      "acq_save_plan",
      {
        discovery_opportunity_id: opportunityId,
        market,
        country: opportunity?.country ?? null,
        language,
        channel,
        market_state: marketState,
        hypothesis: analysis?.hypothesis ?? null,
        audience: analysis?.audience ?? {},
        message: analysis?.message ?? {},
        offer: analysis?.offer ?? {},
        objective: analysis?.objective ?? null,
        target_metric: analysis?.target_metric ?? {},
        estimated_cost: 0,
        acquisition_score: scored.score,
        confidence_score: scored.confidence,
        score_breakdown: { ...scored.breakdown, factors, weights: runtime.weights },
        evidence,
        rationale: rationaleParts.join(" "),
        decision,
        status: "rascunho",
        task_id: taskId,
        run_id: runId,
        dedupe_key: planDedupKey(opportunityId, market, language, channel),
      },
      ctx,
    );
    if (!saveOutcome.ok) {
      processed.push({ opportunity_id: opportunityId, skipped: saveOutcome.error });
      continue;
    }
    const saved = saveOutcome.result as { plan_id: string; created: boolean; duplicate: boolean };
    if (saved.created) plansCreated += 1;

    // 7. Optional asset requests + draft campaign — only for pursued plans.
    const assets: unknown[] = [];
    let campaign: unknown = null;
    if (saved.created && decision === "perseguir") {
      for (const asset of analysis?.assets ?? []) {
        if (!channelInfo?.canRequestContent) break;
        const assetOutcome = await runTool(
          "acq_request_asset",
          {
            plan_id: saved.plan_id,
            asset_type: asset.asset_type,
            purpose: asset.purpose ?? null,
            language: asset.language ?? language,
            opportunity_id: opportunityId,
            content_type: asset.asset_type === "seo_article" ? "seo_article" : "landing_page",
          },
          ctx,
        );
        assets.push(assetOutcome.ok ? assetOutcome.result : { error: assetOutcome.error });
      }

      const campaignOutcome = await runTool(
        "acq_draft_campaign",
        { plan_id: saved.plan_id, channel, name: `${market} · ${channelInfo?.label ?? channel}` },
        ctx,
      );
      campaign = campaignOutcome.ok ? campaignOutcome.result : { error: campaignOutcome.error };
    }

    processed.push({
      opportunity_id: opportunityId,
      plan_id: saved.plan_id,
      created: saved.created,
      duplicate: saved.duplicate,
      decision,
      score: scored.score,
      confidence: scored.confidence,
      market_state: marketState,
      capacity_sufficient: capacity.sufficient,
      channel,
      assets,
      campaign,
    });
  }

  return respond({
    analyzed: processed.length,
    plans_created: plansCreated,
    processed,
    status: "draft",
    spending: 0,
    external_actions: 0,
    note: "Planos criados apenas como rascunho. Publicação, gasto e execução continuam impossíveis nesta fase.",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Not authorized", permanent: true }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const taskType = String(body.task_type ?? "analyze_opportunities");

  try {
    switch (taskType) {
      case "analyze_opportunities":
      case "draft_plan":
        return await runAcquisition(body);
      default:
        return fail("unknown_task_type", `Acquisition não suporta o task_type: ${taskType}`, true);
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      return fail(error.code, summarize(error.message, 500), error.permanent);
    }
    return fail("acquisition_error", summarize((error as Error).message, 500), false);
  }
});
