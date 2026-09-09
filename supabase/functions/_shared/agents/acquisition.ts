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
