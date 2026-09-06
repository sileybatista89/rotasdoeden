// Pure Discovery Agent logic. No IO, no secrets, no Deno APIs.
// Imported by the edge function AND by the vitest suite.

export type EvidenceType = "observed" | "interpreted" | "hypothesis" | "recommendation";
export const EVIDENCE_TYPES: EvidenceType[] = ["observed", "interpreted", "hypothesis", "recommendation"];

export type OpportunityStatus = "nova" | "em_analise" | "aceite" | "rejeitada" | "expirada";

/** A raw, OBSERVED signal coming from a DiscoverySource. Never invented. */
export interface DiscoverySignal {
  query: string;
  country: string;
  language?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  position?: number | null;
  ctr?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  source: string;
  source_reference?: Record<string, unknown>;
  collected_at?: string;
}

export interface DiscoverySourceResult {
  source: string;
  signals: DiscoverySignal[];
  collected_at: string;
  /** Present when the data came from cache; `expired` cache is flagged, never silently reused as fresh. */
  cache?: { hit: boolean; expired: boolean; created_at?: string };
  limitations: string[];
}

/** Extensible source abstraction — new sources plug in without rewriting the agent. */
export interface DiscoverySource {
  readonly name: string;
  isConfigured(): boolean;
  fetchSignals(input: {
    countries?: string[];
    startDate?: string;
    endDate?: string;
    limit: number;
  }): Promise<DiscoverySourceResult>;
}

export interface ScoreWeights {
  travel_intent: number;
  stp_relevance: number;
  volume: number;
  potential_value: number;
  competition: number;
  seasonality: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  travel_intent: 30,
  stp_relevance: 20,
  volume: 15,
  potential_value: 15,
  competition: 10,
  seasonality: 10,
};

/** Each component is 0..1, or null when there is no real data (never invented). */
export interface ScoreComponents {
  travel_intent: number | null;
  stp_relevance: number | null;
  volume: number | null;
  potential_value: number | null;
  competition: number | null;
  seasonality: number | null;
}

export interface ScoreResult {
  score: number;
  missing: string[];
  applied_weights: Partial<ScoreWeights>;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Deterministic 0-100 opportunity score.
 * Missing components are neutralised by removing their weight from the denominator
 * and are reported in `missing` so the limitation is explicit.
 */
export function computeOpportunityScore(
  components: ScoreComponents,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreResult {
  let weighted = 0;
  let totalWeight = 0;
  const missing: string[] = [];
  const applied: Partial<ScoreWeights> = {};

  for (const key of Object.keys(weights) as (keyof ScoreWeights)[]) {
    const weight = Number(weights[key] ?? 0);
    const value = components[key];
    if (weight <= 0) continue;
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      missing.push(key);
      continue;
    }
    weighted += clamp01(Number(value)) * weight;
    totalWeight += weight;
    applied[key] = weight;
  }

  if (totalWeight === 0) return { score: 0, missing, applied_weights: applied };
  return { score: round2((weighted / totalWeight) * 100), missing, applied_weights: applied };
}

export interface ConfidenceInput {
  /** 0..1 — observed first-party data scores higher than extrapolation. */
  sourceQuality: number;
  /** Age of the data in days. */
  ageDays: number;
  /** Number of observations behind the signal (e.g. impressions). */
  sampleSize: number;
  /** 0..1 — how consistent the signal is across the period/model. */
  consistency: number;
  /** 0..1 — how much of the conclusion is extrapolated rather than observed. */
  extrapolation: number;
}

/** Deterministic 0-100 confidence score, independent from the opportunity score. */
export function computeConfidenceScore(input: ConfidenceInput): number {
  const quality = clamp01(input.sourceQuality);
  const recency = clamp01(1 - Math.max(0, input.ageDays) / 180);
  const sample = clamp01(Math.log10(Math.max(1, input.sampleSize)) / 3); // 1000 obs = full marks
  const consistency = clamp01(input.consistency);
  const extrapolationPenalty = clamp01(input.extrapolation);

  const base =
    quality * 0.35 + recency * 0.2 + sample * 0.2 + consistency * 0.15 + (1 - extrapolationPenalty) * 0.1;
  return round2(clamp01(base) * 100);
}

export const LOW_CONFIDENCE_THRESHOLD = 40;

export function isLowConfidence(score: number): boolean {
  return score < LOW_CONFIDENCE_THRESHOLD;
}

/** Derived from observed metrics only. Returns null when the metric is absent. */
export function volumeComponent(impressions: number | null | undefined): number | null {
  if (impressions === null || impressions === undefined || !Number.isFinite(Number(impressions))) return null;
  return clamp01(Math.log10(Math.max(1, Number(impressions))) / 4); // 10k impressions = 1
}

/** Higher average position (closer to 1) means we already rank; less headroom is not "competition data". */
export function competitionComponent(position: number | null | undefined): number | null {
  if (position === null || position === undefined || !Number.isFinite(Number(position))) return null;
  const p = Math.max(1, Number(position));
  return clamp01((p - 1) / 49); // deep positions = more headroom to win
}

export interface StructuredOpportunity {
  market: string | null;
  country: string;
  language: string;
  query: string;
  intent: string | null;
  intent_confidence: number | null;
  category: string | null;
  season: string | null;
  source: string;
  source_reference: Record<string, unknown>;
  metrics: Record<string, unknown>;
  evidence_type: EvidenceType;
  opportunity_score: number;
  confidence_score: number;
  rationale: string | null;
  recommended_action: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateOpportunity(candidate: Partial<StructuredOpportunity>): ValidationResult {
  const errors: string[] = [];
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  if (!text(candidate.country)) errors.push("country is required");
  if (!text(candidate.language)) errors.push("language is required");
  if (!text(candidate.query)) errors.push("query is required");
  if (!text(candidate.source)) errors.push("source is required");
  if (!candidate.evidence_type || !EVIDENCE_TYPES.includes(candidate.evidence_type)) {
    errors.push("evidence_type is invalid");
  }
  for (const key of ["opportunity_score", "confidence_score"] as const) {
    const value = Number(candidate[key]);
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`${key} must be between 0 and 100`);
  }
  if (candidate.intent_confidence !== null && candidate.intent_confidence !== undefined) {
    const ic = Number(candidate.intent_confidence);
    if (!Number.isFinite(ic) || ic < 0 || ic > 100) errors.push("intent_confidence must be between 0 and 100");
  }
  return { valid: errors.length === 0, errors };
}

/** Deduplication key used both in-memory and by the database unique index. */
export function opportunityKey(country: string, language: string, query: string): string {
  return [country, language, query].map((v) => (v ?? "").trim().toLowerCase()).join("|");
}

export function dedupeSignals(signals: DiscoverySignal[], defaultLanguage = "und"): DiscoverySignal[] {
  const map = new Map<string, DiscoverySignal>();
  for (const signal of signals) {
    const key = opportunityKey(signal.country ?? "", signal.language ?? defaultLanguage, signal.query ?? "");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, signal);
      continue;
    }
    map.set(key, {
      ...existing,
      impressions: (existing.impressions ?? 0) + (signal.impressions ?? 0),
      clicks: (existing.clicks ?? 0) + (signal.clicks ?? 0),
      position: existing.position ?? signal.position ?? null,
    });
  }
  return [...map.values()];
}

export function cacheKey(source: string, request: Record<string, unknown>): string {
  const stable = Object.keys(request)
    .sort()
    .map((k) => `${k}=${JSON.stringify(request[k])}`)
    .join("&");
  return `${source}:${stable}`;
}

/** Batch limit per run. Configurable, never hardcoded as permanent. */
export function resolveBatchLimit(configured: unknown, fallback = 50): number {
  const value = Number(configured);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), 500);
}

export interface IntentClassification {
  query: string;
  intent: string;
  intent_confidence: number;
  category: string | null;
  language: string | null;
  season: string | null;
  travel_intent: number | null;
  stp_relevance: number | null;
  potential_value: number | null;
  seasonality: number | null;
  rationale: string | null;
}

/** Parses the model's structured answer. Free text alone is rejected. */
export function parseClassifications(raw: string): IntentClassification[] {
  const text = (raw ?? "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  const objStart = text.indexOf("{");
  let candidate = "";
  if (start !== -1 && end > start) candidate = text.slice(start, end + 1);
  else if (objStart !== -1) candidate = `[${text.slice(objStart, text.lastIndexOf("}") + 1)}]`;
  if (!candidate) throw new Error("Model did not return structured output");

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("Model output is not a list");

  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp01(n) : null;
  };

  return parsed
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Record<string, unknown>;
      const confidence = Number(row.intent_confidence);
      return {
        query: String(row.query ?? "").trim(),
        intent: String(row.intent ?? "unknown").trim() || "unknown",
        intent_confidence: Number.isFinite(confidence) ? round2(Math.min(100, Math.max(0, confidence))) : 0,
        category: row.category ? String(row.category) : null,
        language: row.language ? String(row.language) : null,
        season: row.season ? String(row.season) : null,
        travel_intent: num(row.travel_intent),
        stp_relevance: num(row.stp_relevance),
        potential_value: num(row.potential_value),
        seasonality: num(row.seasonality),
        rationale: row.rationale ? String(row.rationale) : null,
      };
    })
    .filter((row) => row.query.length > 0);
}

export const CLASSIFICATION_SYSTEM_PROMPT = [
  "És um analista de procura turística internacional para São Tomé e Príncipe.",
  "Recebes sinais de pesquisa REAIS observados. Não inventes métricas nem pesquisas.",
  "Responde SEMPRE apenas com um array JSON, sem texto à volta.",
  "Cada elemento: {query, intent, intent_confidence (0-100), category, language (ISO 639-1),",
  "season, travel_intent (0-1), stp_relevance (0-1), potential_value (0-1), seasonality (0-1), rationale}.",
  "intent: um de informational, inspirational, planning, booking, transactional, navigational, unknown.",
  "Se não souberes um valor numérico, usa null. Nunca estimes volumes.",
].join(" ");

/** Chaining guard: bounded depth, bounded fan-out, no cycles, no self-replication. */
export interface ChainLimits {
  maxDepth: number;
  maxChildren: number;
}

export type ChainVerdict =
  | { allowed: true }
  | { allowed: false; reason: "max_depth" | "max_children" | "cycle" | "self_replication" };

export function canChain(
  parent: { id: string; depth: number; agent_type: string; task_type: string; ancestry?: string[] },
  child: { agent_type: string; task_type: string },
  existingChildren: number,
  limits: ChainLimits,
): ChainVerdict {
  if (parent.depth + 1 > limits.maxDepth) return { allowed: false, reason: "max_depth" };
  if (existingChildren >= limits.maxChildren) return { allowed: false, reason: "max_children" };
  if (parent.agent_type === child.agent_type && parent.task_type === child.task_type) {
    return { allowed: false, reason: "self_replication" };
  }
  const signature = `${child.agent_type}:${child.task_type}`;
  if ((parent.ancestry ?? []).includes(signature)) return { allowed: false, reason: "cycle" };
  return { allowed: true };
}
