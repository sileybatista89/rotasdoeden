// Pure, dependency-free logic of the Acquisition Agent.
// Deno (edge functions) and vitest both import this file directly.
// It never calls a model, never calls an external service and never spends money.

export const MARKET_STATES = [
  "descoberto",
  "potencial",
  "prioritario",
  "ativo",
  "sem_evidencia",
] as const;
export type MarketState = (typeof MARKET_STATES)[number];

export const PLAN_STATUSES = [
  "rascunho",
  "em_revisao",
  "aprovado",
  "rejeitado",
  "arquivado",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_DECISIONS = ["perseguir", "esperar", "descartar"] as const;
export type PlanDecision = (typeof PLAN_DECISIONS)[number];

export const CAMPAIGN_STATUSES = [
  "rascunho",
  "aguarda_aprovacao",
  "aprovada",
  "ativa",
  "pausada",
  "terminada",
  "rejeitada",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Human-only transitions. The agent may only produce "rascunho". */
const PLAN_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  rascunho: ["em_revisao", "aprovado", "rejeitado", "arquivado"],
  em_revisao: ["aprovado", "rejeitado", "arquivado"],
  aprovado: ["arquivado"],
  rejeitado: ["arquivado"],
  arquivado: [],
};

export function canTransitionPlan(from: PlanStatus, to: PlanStatus): boolean {
  return PLAN_TRANSITIONS[from]?.includes(to) ?? false;
}

const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  rascunho: ["aguarda_aprovacao", "rejeitada", "terminada"],
  aguarda_aprovacao: ["aprovada", "rejeitada"],
  aprovada: ["ativa", "terminada"],
  ativa: ["pausada", "terminada"],
  pausada: ["ativa", "terminada"],
  terminada: [],
  rejeitada: [],
};

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  return CAMPAIGN_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export interface OpportunityInput {
  id: string;
  status: string;
  expires_at?: string | null;
  country?: string | null;
  language?: string | null;
  market?: string | null;
  confidence_score?: number | null;
}

export type Eligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

/** Only accepted, unexpired Discovery opportunities may become acquisition plans. */
export function checkOpportunityEligibility(
  opportunity: OpportunityInput,
  now = new Date(),
  minConfidence = 0,
): Eligibility {
  if (opportunity.status !== "aceite") {
    return { eligible: false, reason: "Oportunidade não está aceite." };
  }
  if (opportunity.expires_at && new Date(opportunity.expires_at) <= now) {
    return { eligible: false, reason: "Oportunidade expirada." };
  }
  if (!opportunity.language) {
    return { eligible: false, reason: "Oportunidade sem idioma definido." };
  }
  const confidence = Number(opportunity.confidence_score ?? 0);
  if (confidence < minConfidence) {
    return { eligible: false, reason: "Confiança abaixo do mínimo configurado." };
  }
  return { eligible: true };
}

// ---------------------------------------------------------------------------
// Market state
// ---------------------------------------------------------------------------

export interface MarketEvidence {
  /** Real signals observed for this market (Search Console rows, bookings...). */
  observedSignals: number;
  /** Bookings already attributed to this market. */
  bookings: number;
  /** Guides/services able to serve this market's language. */
  servingCapacity: number;
  /** An approved campaign is currently running. */
  activeCampaign?: boolean;
}

export function resolveMarketState(evidence: MarketEvidence): MarketState {
  if (evidence.activeCampaign) return "ativo";
  if (evidence.observedSignals <= 0) return "sem_evidencia";
  if (evidence.bookings > 0 && evidence.servingCapacity > 0) return "prioritario";
  if (evidence.servingCapacity > 0) return "potencial";
  return "descoberto";
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreWeights {
  travel_intent: number;
  stp_relevance: number;
  conversion_potential: number;
  service_capacity: number;
  acquisition_cost: number;
  market_size: number;
  seasonality: number;
  margin: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  travel_intent: 25,
  stp_relevance: 15,
  conversion_potential: 15,
  service_capacity: 15,
  acquisition_cost: 10,
  market_size: 8,
  seasonality: 6,
  margin: 6,
};

/** Every factor is a 0..1 ratio derived from real data, never invented. */
export type ScoreFactors = Record<keyof ScoreWeights, number>;

export interface ScoreResult {
  score: number;
  confidence: number;
  breakdown: Record<string, number>;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Deterministic. Confidence multiplies the total instead of adding to it, so a
 * well-scored but poorly evidenced opportunity can never reach the top.
 */
export function scoreAcquisition(
  factors: Partial<ScoreFactors>,
  confidence: number,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreResult {
  const breakdown: Record<string, number> = {};
  let raw = 0;
  let totalWeight = 0;

  for (const key of Object.keys(weights) as (keyof ScoreWeights)[]) {
    const weight = Number(weights[key]) || 0;
    const factor = clamp01(Number(factors[key] ?? 0));
    const points = +(weight * factor).toFixed(2);
    breakdown[key] = points;
    raw += points;
    totalWeight += weight;
  }

  const normalized = totalWeight > 0 ? (raw / totalWeight) * 100 : 0;
  const conf = clamp01(confidence);
  return {
    score: +(normalized * conf).toFixed(2),
    confidence: +conf.toFixed(2),
    breakdown,
  };
}

export function decideFromScore(
  result: ScoreResult,
  marketState: MarketState,
  minConfidence: number,
): PlanDecision {
  if (marketState === "sem_evidencia") return "descartar";
  if (result.confidence < minConfidence) return "esperar";
  if (result.score >= 60) return "perseguir";
  if (result.score >= 30) return "esperar";
  return "descartar";
}

// ---------------------------------------------------------------------------
// Budget guards
// ---------------------------------------------------------------------------

export interface CampaignBudgetLimits {
  campaign_budget_cap: number;
  period_budget_cap: number;
  total_budget_cap: number;
}

export type BudgetVerdict =
  | { allowed: true }
  | { allowed: false; reason: "campaign_cap" | "period_cap" | "total_cap" | "not_authorised" };

/** A zero cap means "no spending authorised". Checked before any spend action. */
export function checkCampaignBudget(
  requested: number,
  limits: CampaignBudgetLimits,
  spentInPeriod: number,
  spentTotal: number,
): BudgetVerdict {
  if (limits.total_budget_cap <= 0 || limits.campaign_budget_cap <= 0) {
    return { allowed: false, reason: "not_authorised" };
  }
  if (requested <= 0 || requested > limits.campaign_budget_cap) {
    return { allowed: false, reason: "campaign_cap" };
  }
  if (spentInPeriod + requested > limits.period_budget_cap) {
    return { allowed: false, reason: "period_cap" };
  }
  if (spentTotal + requested > limits.total_budget_cap) {
    return { allowed: false, reason: "total_cap" };
  }
  return { allowed: true };
}

export interface StopConditionInput {
  spend: number;
  budgetCap: number;
  bookings: number;
  maxCostPerBooking: number;
  daysRunning: number;
  minDaysBeforeEvaluation: number;
  measurementAvailable: boolean;
  globalPaused: boolean;
}

export function shouldStopCampaign(input: StopConditionInput): { stop: boolean; reason?: string } {
  if (input.globalPaused) return { stop: true, reason: "sistema_em_pausa" };
  if (!input.measurementAvailable) return { stop: true, reason: "sem_medicao" };
  if (input.budgetCap > 0 && input.spend >= input.budgetCap) {
    return { stop: true, reason: "orcamento_esgotado" };
  }
  if (input.daysRunning >= input.minDaysBeforeEvaluation) {
    if (input.bookings === 0) return { stop: true, reason: "sem_resultados" };
    if (input.maxCostPerBooking > 0 && input.spend / input.bookings > input.maxCostPerBooking) {
      return { stop: true, reason: "custo_por_reserva_acima_do_limite" };
    }
  }
  return { stop: false };
}

// ---------------------------------------------------------------------------
// Keys and limits
// ---------------------------------------------------------------------------

export function planDedupKey(
  opportunityId: string | null,
  market: string,
  language: string,
  channel: string,
): string {
  return [opportunityId ?? "none", market, language, channel]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}

export function resolvePlanBatchLimit(requested: number | undefined, configured: number): number {
  const max = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 1;
  const asked = Number.isFinite(requested as number) && (requested as number) > 0
    ? Math.floor(requested as number)
    : max;
  return Math.min(asked, max);
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

export interface AttributedEvent {
  visitor_id: string;
  event_type: string;
  utm_campaign?: string | null;
  created_at: string;
}

/** One booking counts once: the visitor's first touch owns the conversion. */
export function attributeBookings(
  bookings: { id: string; visitor_id?: string | null; attribution?: Record<string, unknown> | null }[],
): Record<string, number> {
  const perCampaign: Record<string, number> = {};
  const counted = new Set<string>();
  for (const booking of bookings) {
    if (counted.has(booking.id)) continue;
    counted.add(booking.id);
    const campaign =
      (booking.attribution?.utm_campaign as string | undefined)?.trim() || "direto";
    perCampaign[campaign] = (perCampaign[campaign] ?? 0) + 1;
  }
  return perCampaign;
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export type ChannelKind = "organico" | "pago";
/** availability: what the platform can really do today. */
export type ChannelAvailability = "disponivel" | "nao_ligado" | "hipotetico";

export interface ChannelInfo {
  key: string;
  label: string;
  kind: ChannelKind;
  availability: ChannelAvailability;
  /** Only channels we can actually produce work for may request content assets. */
  canRequestContent: boolean;
  note: string;
}

export const CHANNELS: ChannelInfo[] = [
  {
    key: "seo",
    label: "SEO / conteúdo orgânico",
    kind: "organico",
    availability: "disponivel",
    canRequestContent: true,
    note: "Pode ser trabalhado hoje através do Agente de Conteúdo.",
  },
  {
    key: "landing_page",
    label: "Landing page própria",
    kind: "organico",
    availability: "disponivel",
    canRequestContent: true,
    note: "Página no próprio site; requer aprovação humana para publicação.",
  },
  {
    key: "instagram_organico",
    label: "Instagram orgânico",
    kind: "organico",
    availability: "nao_ligado",
    canRequestContent: true,
    note: "Sem integração de publicação: o conteúdo fica em rascunho.",
  },
  {
    key: "email",
    label: "Email",
    kind: "organico",
    availability: "nao_ligado",
    canRequestContent: true,
    note: "Sem envio externo nesta fase; apenas rascunho.",
  },
  {
    key: "google_ads",
    label: "Google Ads",
    kind: "pago",
    availability: "nao_ligado",
    canRequestContent: false,
    note: "Canal futuro. Sem integração, sem orçamento e sem execução.",
  },
  {
    key: "meta_ads",
    label: "Meta Ads",
    kind: "pago",
    availability: "nao_ligado",
    canRequestContent: false,
    note: "Canal futuro. Sem integração, sem orçamento e sem execução.",
  },
];

export function getChannel(key: string): ChannelInfo | null {
  return CHANNELS.find((c) => c.key === key) ?? null;
}

/** A channel may never be executed in this phase, whatever it is. */
export function canExecuteChannel(): false {
  return false;
}

// ---------------------------------------------------------------------------
// Real capacity
// ---------------------------------------------------------------------------

export interface CapacityInput {
  publishedGuides: number;
  approvedServices: number;
  districts: number;
  /** Languages really declared by published guides/services. */
  languages: string[];
  pastBookings: number;
  /** Language the opportunity targets. */
  targetLanguage: string | null;
}

export interface CapacityResult {
  sufficient: boolean;
  ratio: number;
  languageCovered: boolean;
  reasons: string[];
  snapshot: Omit<CapacityInput, "targetLanguage">;
}

/** Never promise availability that does not exist in the database. */
export function assessCapacity(input: CapacityInput): CapacityResult {
  const reasons: string[] = [];
  const languages = input.languages.map((l) => l.trim().toLowerCase()).filter(Boolean);
  const target = (input.targetLanguage ?? "").trim().toLowerCase();
  const languageCovered = target ? languages.includes(target) : languages.length > 0;

  if (input.publishedGuides <= 0) reasons.push("Sem guias publicados para atender procura.");
  if (input.approvedServices <= 0) reasons.push("Sem serviços aprovados disponíveis.");
  if (!languageCovered) {
    reasons.push(
      target
        ? `Nenhum guia/serviço declara o idioma "${target}".`
        : "Nenhum idioma declarado pelos guias ou serviços.",
    );
  }

  const guideRatio = Math.min(1, input.publishedGuides / 5);
  const serviceRatio = Math.min(1, input.approvedServices / 10);
  const languageRatio = languageCovered ? 1 : 0;
  const ratio = +(((guideRatio + serviceRatio + languageRatio) / 3)).toFixed(3);

  return {
    sufficient: reasons.length === 0,
    ratio,
    languageCovered,
    reasons,
    snapshot: {
      publishedGuides: input.publishedGuides,
      approvedServices: input.approvedServices,
      districts: input.districts,
      languages,
      pastBookings: input.pastBookings,
    },
  };
}

// ---------------------------------------------------------------------------
// Deterministic factors — every value comes from observed data
// ---------------------------------------------------------------------------

export interface FactorInput {
  opportunityScore?: number | null;
  intent?: string | null;
  country?: string | null;
  observedSignals: number;
  observedClicks: number;
  bookingsFromMarket: number;
  capacity: CapacityResult;
  seasonMatch: boolean | null;
  averageServicePrice: number | null;
}

const TRAVEL_INTENTS = ["transactional", "booking", "commercial", "comercial", "transacional"];

export function deriveFactors(input: FactorInput): ScoreFactors {
  const intent = (input.intent ?? "").toLowerCase();
  const travelIntent = TRAVEL_INTENTS.some((i) => intent.includes(i))
    ? 1
    : intent.includes("informational") || intent.includes("informacional")
      ? 0.4
      : 0.2;

  return {
    travel_intent: travelIntent,
    // Relevance is only what Discovery actually measured.
    stp_relevance: Math.min(1, Number(input.opportunityScore ?? 0) / 100),
    conversion_potential: input.bookingsFromMarket > 0 ? 1 : input.observedClicks > 0 ? 0.5 : 0.1,
    service_capacity: input.capacity.ratio,
    // Without CPC data we cannot estimate cost; organic-only work stays neutral-low.
    acquisition_cost: 0.5,
    // No Keyword Planner: bounded by observed impressions only.
    market_size: Math.min(1, input.observedSignals / 1000),
    seasonality: input.seasonMatch === null ? 0.5 : input.seasonMatch ? 1 : 0.2,
    margin: input.averageServicePrice && input.averageServicePrice > 0
      ? Math.min(1, input.averageServicePrice / 200)
      : 0,
  };
}

export const ACQUISITION_SYSTEM_PROMPT = `És um analista de aquisição da Rotas do Éden, marketplace de turismo em São Tomé e Príncipe.
Recebes dados REAIS da plataforma e uma oportunidade de procura observada.
Responde APENAS com JSON válido:
{"hypothesis":"","audience":{"description":"","segments":[]},"message":{"angle":"","key_points":[]},"offer":{"description":"","requires":[]},"objective":"","target_metric":{"primary":"","secondary":[]},"assets":[{"asset_type":"","purpose":"","language":""}],"risks":[]}
Regras:
- Nunca inventes números, volumes de pesquisa, CPC, parceiros, preços ou disponibilidade.
- Só podes referir capacidade que exista nos dados fornecidos.
- Escreve em português de Portugal.
- Não propõe execução de anúncios nem contacto externo.`;

export interface AnalysisDraft {
  hypothesis: string;
  audience: Record<string, unknown>;
  message: Record<string, unknown>;
  offer: Record<string, unknown>;
  objective: string;
  target_metric: Record<string, unknown>;
  assets: { asset_type: string; purpose?: string; language?: string }[];
  risks: string[];
}

export const ASSET_TYPES = [
  "landing_page",
  "seo_article",
  "social_post",
  "email_draft",
  "ad_copy_draft",
  "video_concept",
] as const;

export function parseAnalysis(raw: string, fallbackLanguage = "pt"): AnalysisDraft {
  let parsed: Record<string, unknown> = {};
  const text = (raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  const obj = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  const assets = Array.isArray(parsed.assets)
    ? (parsed.assets as Record<string, unknown>[])
        .map((a) => ({
          asset_type: String(a.asset_type ?? ""),
          purpose: a.purpose ? String(a.purpose) : undefined,
          language: a.language ? String(a.language) : fallbackLanguage,
        }))
        .filter((a) => (ASSET_TYPES as readonly string[]).includes(a.asset_type))
    : [];

  return {
    hypothesis: String(parsed.hypothesis ?? "").slice(0, 2000),
    audience: obj(parsed.audience),
    message: obj(parsed.message),
    offer: obj(parsed.offer),
    objective: String(parsed.objective ?? "").slice(0, 500),
    target_metric: obj(parsed.target_metric),
    assets: assets.slice(0, 4),
    risks: Array.isArray(parsed.risks) ? (parsed.risks as unknown[]).map(String).slice(0, 10) : [],
  };
}
