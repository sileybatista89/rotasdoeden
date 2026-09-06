// Content Agent V1 — turns ACCEPTED discovery opportunities into sourced,
// quality-checked content drafts. It never publishes and never invents facts.
// Only the orchestrator (service role) may call this function.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { summarize } from "../_shared/agents/core.ts";
import { registerTool, runTool, type ToolContext } from "../_shared/agents/tools.ts";
import { getProvider, ProviderError, type ProviderName } from "../_shared/agents/providers.ts";
import {
  AGENT_FORBIDDEN_STATUSES,
  checkOpportunityEligibility,
  contentCacheKey,
  contentDedupKey,
  countWords,
  draftText,
  DRAFT_SYSTEM_PROMPT,
  isContentType,
  OUTLINE_SYSTEM_PROMPT,
  parseDraft,
  parseOutline,
  qualityCheck,
  resolveContentBatchLimit,
  slugify,
  type ContentDraft,
  type ContentSource,
  type ContentType,
  type QualityConfig,
} from "../_shared/agents/content.ts";

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

/** Routes that really exist on the public site. Anything else is an invented link. */
const ALLOWED_INTERNAL_PREFIXES = [
  "/", "/guias", "/experiencias", "/parceiros", "/sobre-sao-tome",
  "/seja-parceiro", "/guia-parceiro", "/legal", "/auth",
];

interface ContentRuntime {
  provider: ProviderName;
  outlineModel: string;
  draftModel: string;
  cacheTtlHours: number;
  maxItemsPerRun: number;
  limits: Record<string, unknown>;
  contentTypes: Record<string, { requires_seo?: boolean; min_words?: number; requires_image?: boolean }>;
  knownEntities: string[];
  usage: { inputTokens: number; outputTokens: number; estimatedCost: number; providerCalls: number };
}

interface ContentToolContext extends ToolContext {
  client: SupabaseClient;
  runtime: ContentRuntime;
}

// ---------------------------------------------------------------- tools -----

registerTool({
  name: "get_discovery_opportunity",
  actionKey: "research",
  description: "Lê uma oportunidade de Discovery e verifica se está aceite e válida.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a.opportunity_id !== "string" || !a.opportunity_id) return "opportunity_id is required";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as ContentToolContext;
    const id = String((args as Record<string, unknown>).opportunity_id);
    const { data, error } = await c.client
      .from("discovery_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const verdict = checkOpportunityEligibility(data as never);
    return { opportunity: data, eligibility: verdict };
  },
});

registerTool({
  name: "get_destination_data",
  actionKey: "research",
  description: "Lê distritos e localidades reais de São Tomé e Príncipe (dados internos).",
  validate: () => null,
  execute: async (_args, ctx) => {
    const c = ctx as ContentToolContext;
    const [{ data: districts }, { data: localities }] = await Promise.all([
      c.client.from("districts").select("id, name, island").order("name"),
      c.client.from("localities").select("id, name, district_id").order("name").limit(200),
    ]);
    return {
      districts: districts ?? [],
      localities: localities ?? [],
      sources: (districts ?? []).map((d: { id: string; name: string }) => ({
        scope: "internal" as const,
        source_table: "districts",
        source_record_id: d.id,
        title: d.name,
        evidence_type: "observed" as const,
      })),
    };
  },
});

registerTool({
  name: "get_partner_data",
  actionKey: "research",
  description: "Lê guias e parceiros reais já verificados e publicáveis.",
  validate: () => null,
  execute: async (_args, ctx) => {
    const c = ctx as ContentToolContext;
    const { data, error } = await c.client
      .from("professional_profiles")
      .select("id, display_name, professional_type, bio, district_id, languages, status")
      .eq("status", "published")
      .limit(50);
    if (error) throw new Error(error.message);
    return {
      partners: data ?? [],
      sources: (data ?? []).map((p: { id: string; display_name: string }) => ({
        scope: "internal" as const,
        source_table: "professional_profiles",
        source_record_id: p.id,
        title: p.display_name,
        evidence_type: "observed" as const,
      })),
    };
  },
});

registerTool({
  name: "get_experience_data",
  actionKey: "research",
  description: "Lê experiências/serviços reais já aprovados na moderação.",
  validate: () => null,
  execute: async (_args, ctx) => {
    const c = ctx as ContentToolContext;
    const { data, error } = await c.client
      .from("services")
      .select("id, title, description, price, duration_hours, district_id, moderation_status")
      .eq("moderation_status", "approved")
      .limit(50);
    if (error) throw new Error(error.message);
    return {
      experiences: data ?? [],
      sources: (data ?? []).map((s: { id: string; title: string }) => ({
        scope: "internal" as const,
        source_table: "services",
        source_record_id: s.id,
        title: s.title,
        evidence_type: "observed" as const,
      })),
    };
  },
});

registerTool({
  name: "search_sources",
  actionKey: "research",
  description: "Reúne as fontes internas disponíveis. Não há acesso a fontes externas nesta versão.",
  validate: () => null,
  execute: async (_args, ctx) => {
    const c = ctx as ContentToolContext;
    const [destination, partners, experiences] = await Promise.all([
      runTool("get_destination_data", {}, c),
      runTool("get_partner_data", {}, c),
      runTool("get_experience_data", {}, c),
    ]);
    const collect = (outcome: { ok: boolean; result?: unknown }) =>
      outcome.ok ? ((outcome.result as { sources: ContentSource[] }).sources ?? []) : [];
    return {
      sources: [...collect(destination), ...collect(partners), ...collect(experiences)],
      data: {
        destination: destination.ok ? destination.result : null,
        partners: partners.ok ? partners.result : null,
        experiences: experiences.ok ? experiences.result : null,
      },
      limitations: ["Sem acesso a fontes externas: apenas dados internos verificados."],
    };
  },
});

registerTool({
  name: "validate_source",
  actionKey: "research",
  description: "Confirma que uma fonte interna existe mesmo na base de dados.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (!a.source_table || !a.source_record_id) return "source_table and source_record_id are required";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as ContentToolContext;
    const a = args as { source_table: string; source_record_id: string };
    const allowed = ["districts", "localities", "professional_profiles", "services", "discovery_opportunities"];
    if (!allowed.includes(a.source_table)) return { valid: false, reason: "table_not_allowed" };
    const { data } = await c.client.from(a.source_table).select("id").eq("id", a.source_record_id).maybeSingle();
    return { valid: Boolean(data) };
  },
});

async function generate(
  ctx: ContentToolContext,
  model: string,
  system: string,
  prompt: string,
  maxOutputTokens: number,
) {
  const provider = getProvider(ctx.runtime.provider);
  if (!provider.isConfigured()) {
    throw new ProviderError(
      `Fornecedor de IA indisponível: ${ctx.runtime.provider}`,
      "provider_not_configured",
      undefined,
      true,
    );
  }
  const result = await provider.generate({ model, system, prompt, maxOutputTokens, timeoutMs: 90_000 });
  ctx.runtime.usage.inputTokens += result.inputTokens;
  ctx.runtime.usage.outputTokens += result.outputTokens;
  ctx.runtime.usage.estimatedCost += result.estimatedCost;
  ctx.runtime.usage.providerCalls += 1;
  return result;
}

registerTool({
  name: "generate_outline",
  actionKey: "create_draft",
  description: "Gera a estrutura de secções a partir da oportunidade e das fontes reais.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (!a.brief || typeof a.brief !== "object") return "brief is required";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as ContentToolContext;
    const a = args as { brief: Record<string, unknown> };
    const key = contentCacheKey("outline", { brief: a.brief, model: c.runtime.outlineModel });
    const { data: cached } = await c.client.rpc("content_cache_get", { _key: key });
    const hit = (cached as { payload: unknown }[] | null)?.[0];
    if (hit) return { outline: hit.payload as string[], cache: { hit: true } };

    const generated = await generate(
      c,
      c.runtime.outlineModel,
      OUTLINE_SYSTEM_PROMPT,
      JSON.stringify(a.brief),
      1024,
    );
    const outline = parseOutline(generated.text);
    await c.client.rpc("content_cache_put", {
      _key: key,
      _payload: outline,
      _ttl_hours: c.runtime.cacheTtlHours,
    });
    return { outline, cache: { hit: false } };
  },
});

registerTool({
  name: "generate_draft",
  actionKey: "create_draft",
  description: "Gera o rascunho estruturado com referências obrigatórias às fontes.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (!a.brief || typeof a.brief !== "object") return "brief is required";
    if (!Array.isArray(a.sources)) return "sources must be an array";
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as ContentToolContext;
    const a = args as { brief: Record<string, unknown>; sources: ContentSource[]; outline: string[] };
    const prompt = [
      "BRIEF:",
      JSON.stringify(a.brief),
      "ESTRUTURA:",
      JSON.stringify(a.outline ?? []),
      "FONTES (usa o índice do array em source_refs):",
      JSON.stringify(a.sources.map((s, i) => ({ index: i, ...s }))),
    ].join("\n");
    const generated = await generate(c, c.runtime.draftModel, DRAFT_SYSTEM_PROMPT, prompt, 8192);
    const draft = parseDraft(generated.text, String(a.brief.language ?? "pt"));
    return { draft, model: generated.model, provider: generated.provider };
  },
});

registerTool({
  name: "seo_analyze",
  actionKey: "create_draft",
  description: "Verifica a estrutura SEO do rascunho de forma determinística.",
  validate: (args) => ((args as Record<string, unknown>)?.draft ? null : "draft is required"),
  execute: (args) => {
    const draft = (args as { draft: ContentDraft }).draft;
    const headings = draft.blocks.filter((b) => b.type === "heading");
    return Promise.resolve({
      h1_count: headings.filter((h) => (h.level ?? 2) === 1).length,
      h2_count: headings.filter((h) => (h.level ?? 2) === 2).length,
      title_length: (draft.title ?? "").length,
      meta_length: (draft.meta_description ?? "").length,
      word_count: countWords(draftText(draft)),
      target_keyword: draft.seo?.target_keyword ?? null,
      internal_links: draft.seo?.internal_links ?? [],
      schema_suggestions: draft.seo?.schema_suggestions ?? [],
    });
  },
});

registerTool({
  name: "quality_check",
  actionKey: "create_draft",
  description: "Aplica o controlo de qualidade determinístico (fontes, factos, idioma, duplicação).",
  validate: (args) => ((args as Record<string, unknown>)?.draft ? null : "draft is required"),
  execute: async (args, ctx) => {
    const c = ctx as ContentToolContext;
    const a = args as { draft: ContentDraft; sources: ContentSource[]; contentType: ContentType };
    const typeConfig = c.runtime.contentTypes[a.contentType] ?? {};
    const { data: existing } = await c.client
      .from("content_versions")
      .select("blocks")
      .order("created_at", { ascending: false })
      .limit(30);
    const existingTexts = (existing ?? []).map((row: { blocks: unknown }) =>
      JSON.stringify(row.blocks ?? []),
    );

    const config: QualityConfig = {
      minWords: Number(typeConfig.min_words ?? 300),
      maxKeywordDensity: Number(c.runtime.limits.max_keyword_density ?? 0.03),
      maxSimilarity: Number(c.runtime.limits.max_similarity ?? 0.85),
      requiresSeo: typeConfig.requires_seo !== false,
      allowedInternalPrefixes: ALLOWED_INTERNAL_PREFIXES,
      knownEntities: c.runtime.knownEntities,
    };
    return qualityCheck(a.draft, a.sources ?? [], existingTexts, config);
  },
});

registerTool({
  name: "save_draft",
  actionKey: "create_draft",
  description: "Grava o rascunho como nova versão, com fontes e resultado de qualidade.",
  validate: (args) => {
    const a = args as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return "args must be an object";
    if (!a.draft) return "draft is required";
    if (!isContentType(a.content_type)) return "content_type is invalid";
    if (a.status && AGENT_FORBIDDEN_STATUSES.includes(a.status as never)) {
      return "agent cannot set this status";
    }
    return null;
  },
  execute: async (args, ctx) => {
    const c = ctx as ContentToolContext;
    const a = args as unknown as {
      draft: ContentDraft;
      sources: ContentSource[];
      content_type: ContentType;
      opportunity_id: string | null;
      country: string | null;
      market: string | null;
      intent: string | null;
      season: string | null;
      audience: string | null;
      quality: Record<string, unknown>;
      run_id: string | null;
    };
    const { data, error } = await c.client.rpc("content_save_draft", {
      _payload: {
        content_type: a.content_type,
        discovery_opportunity_id: a.opportunity_id,
        country: a.country,
        market: a.market,
        intent: a.intent,
        season: a.season,
        audience: a.audience,
        language: a.draft.language,
        title: a.draft.title,
        meta_description: a.draft.meta_description,
        slug: a.draft.slug || slugify(a.draft.title),
        outline: a.draft.outline,
        blocks: a.draft.blocks,
        seo: a.draft.seo,
        word_count: countWords(draftText(a.draft)),
        quality_result: a.quality,
        quality_passed: Boolean((a.quality as { passed?: boolean }).passed),
        sources: a.sources,
        task_id: c.taskId,
        run_id: a.run_id,
        dedupe_key: contentDedupKey({
          opportunityId: a.opportunity_id,
          contentType: a.content_type,
          language: a.draft.language,
          market: a.market,
        }),
      },
    });
    if (error) throw new Error(error.message);
    return data as Record<string, unknown>;
  },
});

// ------------------------------------------------------------------- run ----

async function loadConfig(client: SupabaseClient) {
  const { data } = await client.from("agent_config").select("key, value");
  const map = new Map((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return {
    limits: (map.get("content_limits") as Record<string, unknown>) ?? {},
    contentTypes: (map.get("content_types") as ContentRuntime["contentTypes"]) ?? {},
    models: (map.get("content_models") as Record<string, unknown>) ?? {},
  };
}

function pickProvider(requested?: string): ProviderName | null {
  if (requested) {
    const name = requested as ProviderName;
    return getProvider(name).isConfigured() ? name : null;
  }
  for (const name of ["openai", "lovable", "google"] as ProviderName[]) {
    if (getProvider(name).isConfigured()) return name;
  }
  return null;
}

function defaultModel(provider: ProviderName, kind: "outline" | "draft"): string {
  if (provider === "openai") return kind === "outline" ? "gpt-5.4-mini" : "gpt-5.5";
  if (provider === "google") return kind === "outline" ? "gemini-3.6-flash" : "gemini-3.1-pro-preview";
  return kind === "outline" ? "google/gemini-3.6-flash" : "openai/gpt-5.5";
}

async function loadKnownEntities(client: SupabaseClient): Promise<string[]> {
  const [{ data: partners }, { data: services }, { data: districts }] = await Promise.all([
    client.from("professional_profiles").select("display_name").eq("status", "published").limit(200),
    client.from("services").select("title").eq("moderation_status", "approved").limit(200),
    client.from("districts").select("name").limit(50),
  ]);
  return [
    ...(partners ?? []).map((r: { display_name: string }) => r.display_name),
    ...(services ?? []).map((r: { title: string }) => r.title),
    ...(districts ?? []).map((r: { name: string }) => r.name),
  ].filter(Boolean);
}

async function runContent(body: Record<string, unknown>) {
  const client = db();
  const taskId = (body.task_id as string) ?? null;
  const runId = (body.run_id as string) ?? null;
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  const contentType = String(payload.content_type ?? "seo_article");
  if (!isContentType(contentType)) {
    return fail("invalid_content_type", `Tipo de conteúdo não suportado: ${contentType}`, true);
  }

  const provider = pickProvider(payload.provider as string | undefined);
  if (!provider) {
    return fail(
      "provider_not_configured",
      "Nenhum fornecedor de IA está configurado (OPENAI_API_KEY / LOVABLE_API_KEY / GEMINI_API_KEY).",
      true,
    );
  }

  const config = await loadConfig(client);
  const runtime: ContentRuntime = {
    provider,
    outlineModel: String(payload.outline_model ?? config.models.outline_model ?? defaultModel(provider, "outline")),
    draftModel: String(payload.draft_model ?? config.models.draft_model ?? defaultModel(provider, "draft")),
    cacheTtlHours: Number(config.limits.cache_ttl_hours ?? 24) || 24,
    maxItemsPerRun: resolveContentBatchLimit(config.limits.max_items_per_run, 3),
    limits: config.limits,
    contentTypes: config.contentTypes,
    knownEntities: await loadKnownEntities(client),
    usage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0, providerCalls: 0 },
  };

  const { data: policies } = await client.from("agent_policies").select("agent_type, action_key, level");
  const toolLog: { tool: string; ok: boolean; error?: string }[] = [];
  const ctx: ContentToolContext = {
    agentType: "content",
    taskId,
    policies: (policies ?? []) as ToolContext["policies"],
    log: (entry) => toolLog.push(entry),
    client,
    runtime,
  };

  const respond = (result: unknown) =>
    json({
      ok: true,
      agent_type: "content",
      provider,
      model: runtime.draftModel,
      input_tokens: runtime.usage.inputTokens,
      output_tokens: runtime.usage.outputTokens,
      estimated_cost: Math.round(runtime.usage.estimatedCost * 1e6) / 1e6,
      tool_calls_count: toolLog.length,
      result,
    });

  // 1. Opportunity gate — content only exists for accepted, valid opportunities.
  const opportunityId = (payload.opportunity_id as string | undefined) ?? null;
  if (!opportunityId) {
    return fail("opportunity_required", "É obrigatório indicar uma oportunidade aceite.", true);
  }
  const oppOutcome = await runTool("get_discovery_opportunity", { opportunity_id: opportunityId }, ctx);
  if (!oppOutcome.ok) return fail(`opportunity_${oppOutcome.reason}`, oppOutcome.error, oppOutcome.reason !== "failed");
  const { opportunity, eligibility } = oppOutcome.result as {
    opportunity: Record<string, unknown> | null;
    eligibility: { eligible: boolean; reason?: string };
  };
  if (!eligibility.eligible) {
    return fail(`opportunity_${eligibility.reason}`, `Oportunidade não elegível: ${eligibility.reason}`, true);
  }

  // 2. Real internal sources only.
  const sourcesOutcome = await runTool("search_sources", {}, ctx);
  if (!sourcesOutcome.ok) {
    return fail(`sources_${sourcesOutcome.reason}`, sourcesOutcome.error, sourcesOutcome.reason !== "failed");
  }
  const sourceResult = sourcesOutcome.result as {
    sources: ContentSource[];
    data: Record<string, unknown>;
    limitations: string[];
  };
  const sources: ContentSource[] = [
    {
      scope: "internal",
      source_table: "discovery_opportunities",
      source_record_id: opportunityId,
      title: String(opportunity?.query ?? ""),
      evidence_type: "observed",
      consulted_at: new Date().toISOString(),
    },
    ...sourceResult.sources,
  ];

  const language = String(payload.language ?? opportunity?.language ?? "pt");
  const brief = {
    content_type: contentType,
    language,
    market: payload.market ?? opportunity?.market ?? null,
    country: opportunity?.country ?? null,
    intent: opportunity?.intent ?? null,
    season: opportunity?.season ?? null,
    audience: payload.audience ?? null,
    query: opportunity?.query ?? null,
    rationale: opportunity?.rationale ?? null,
    internal_data: sourceResult.data,
    allowed_internal_links: ALLOWED_INTERNAL_PREFIXES,
    limitations: sourceResult.limitations,
  };

  // 3. Outline
  const outlineOutcome = await runTool("generate_outline", { brief }, ctx);
  if (!outlineOutcome.ok) {
    return fail(`outline_${outlineOutcome.reason}`, outlineOutcome.error, outlineOutcome.reason !== "failed");
  }
  const { outline } = outlineOutcome.result as { outline: string[] };

  // 4. Draft
  const draftOutcome = await runTool("generate_draft", { brief, sources, outline }, ctx);
  if (!draftOutcome.ok) {
    return fail(`draft_${draftOutcome.reason}`, draftOutcome.error, draftOutcome.reason !== "failed");
  }
  const { draft } = draftOutcome.result as { draft: ContentDraft };

  // 5. Deterministic SEO + quality gates
  const seoOutcome = await runTool("seo_analyze", { draft }, ctx);
  const qualityOutcome = await runTool("quality_check", { draft, sources, contentType }, ctx);
  if (!qualityOutcome.ok) {
    return fail(`quality_${qualityOutcome.reason}`, qualityOutcome.error, qualityOutcome.reason !== "failed");
  }
  const quality = qualityOutcome.result as {
    passed: boolean;
    issues: { code: string; severity: string; detail: string }[];
  };

  if (!quality.passed && payload.save_failed_drafts !== true) {
    return respond({
      saved: 0,
      quality,
      seo: seoOutcome.ok ? seoOutcome.result : null,
      note: "Rascunho rejeitado pelo controlo de qualidade; nada foi gravado.",
      limitations: sourceResult.limitations,
    });
  }

  // 6. Persist as draft only. Approval/publication stays human.
  const saveOutcome = await runTool(
    "save_draft",
    {
      draft,
      sources,
      content_type: contentType,
      opportunity_id: opportunityId,
      country: opportunity?.country ?? null,
      market: brief.market,
      intent: brief.intent,
      season: brief.season,
      audience: brief.audience,
      quality,
      run_id: runId,
    },
    ctx,
  );
  if (!saveOutcome.ok) {
    return fail(`save_${saveOutcome.reason}`, saveOutcome.error, saveOutcome.reason !== "failed");
  }

  return respond({
    saved: 1,
    content: saveOutcome.result,
    quality,
    seo: seoOutcome.ok ? seoOutcome.result : null,
    sources_used: sources.length,
    limitations: sourceResult.limitations,
    status: "draft",
    note: "Rascunho criado. A aprovação e a publicação continuam a exigir decisão humana.",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Not authorized", permanent: true }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const taskType = String(body.task_type ?? "generate_content");

  try {
    switch (taskType) {
      case "generate_content":
      case "create_draft":
        return await runContent(body);
      default:
        return fail("unknown_task_type", `Content não suporta o task_type: ${taskType}`, true);
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      return fail(error.code, summarize(error.message, 500), error.permanent);
    }
    return fail("content_error", summarize((error as Error).message, 500), false);
  }
});
