import { describe, expect, it } from "vitest";
import {
  cacheKey,
  competitionComponent,
  computeConfidenceScore,
  computeOpportunityScore,
  DEFAULT_WEIGHTS,
  dedupeSignals,
  isLowConfidence,
  opportunityKey,
  parseClassifications,
  resolveBatchLimit,
  validateOpportunity,
  volumeComponent,
  type DiscoverySignal,
  type StructuredOpportunity,
} from "../../supabase/functions/_shared/agents/discovery";
import { ManualSignalsSource, SearchConsoleSource, SourceUnavailableError, buildSource } from "../../supabase/functions/_shared/agents/sources";

const signal = (over: Partial<DiscoverySignal> = {}): DiscoverySignal => ({
  query: "teste sao tome ferias",
  country: "PT",
  language: "pt",
  impressions: 1000,
  clicks: 10,
  position: 12,
  source: "manual_input",
  collected_at: new Date().toISOString(),
  ...over,
});

const opportunity = (over: Partial<StructuredOpportunity> = {}): Partial<StructuredOpportunity> => ({
  market: "PT",
  country: "PT",
  language: "pt",
  query: "teste sao tome ferias",
  intent: "planning",
  intent_confidence: 70,
  category: "beach",
  season: "dry",
  source: "manual_input",
  source_reference: {},
  metrics: {},
  evidence_type: "interpreted",
  opportunity_score: 55,
  confidence_score: 60,
  rationale: null,
  recommended_action: null,
  ...over,
});

describe("16-17. score validation", () => {
  it("computes a deterministic score inside 0-100", () => {
    const result = computeOpportunityScore(
      { travel_intent: 1, stp_relevance: 1, volume: 0.5, potential_value: 0.5, competition: 0.5, seasonality: 0.5 },
      DEFAULT_WEIGHTS,
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    const again = computeOpportunityScore(
      { travel_intent: 1, stp_relevance: 1, volume: 0.5, potential_value: 0.5, competition: 0.5, seasonality: 0.5 },
      DEFAULT_WEIGHTS,
    );
    expect(again.score).toBe(result.score);
  });

  it("neutralises missing components instead of inventing them", () => {
    const result = computeOpportunityScore(
      { travel_intent: 1, stp_relevance: 1, volume: null, potential_value: null, competition: null, seasonality: null },
      DEFAULT_WEIGHTS,
    );
    expect(result.score).toBe(100);
    expect(result.missing).toEqual(["volume", "potential_value", "competition", "seasonality"]);
  });

  it("uses configurable weights", () => {
    const custom = { ...DEFAULT_WEIGHTS, travel_intent: 90, stp_relevance: 10, volume: 0, potential_value: 0, competition: 0, seasonality: 0 };
    const result = computeOpportunityScore({ travel_intent: 1, stp_relevance: 0, volume: null, potential_value: null, competition: null, seasonality: null }, custom);
    expect(result.score).toBe(90);
  });

  it("rejects invalid scores at validation time", () => {
    expect(validateOpportunity(opportunity({ opportunity_score: 140 })).valid).toBe(false);
    expect(validateOpportunity(opportunity({ confidence_score: -5 })).valid).toBe(false);
    expect(validateOpportunity(opportunity({ intent_confidence: 900 })).valid).toBe(false);
    expect(validateOpportunity(opportunity()).valid).toBe(true);
  });

  it("derives volume and competition only from real metrics", () => {
    expect(volumeComponent(null)).toBeNull();
    expect(volumeComponent(10000)).toBe(1);
    expect(competitionComponent(undefined)).toBeNull();
    expect(competitionComponent(1)).toBe(0);
  });
});

describe("19. confidence score", () => {
  it("is higher for fresh, first-party, large samples", () => {
    const strong = computeConfidenceScore({ sourceQuality: 0.9, ageDays: 1, sampleSize: 5000, consistency: 0.9, extrapolation: 0 });
    const weak = computeConfidenceScore({ sourceQuality: 0.3, ageDays: 300, sampleSize: 2, consistency: 0.1, extrapolation: 1 });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeLessThanOrEqual(100);
    expect(weak).toBeGreaterThanOrEqual(0);
  });
  it("flags low confidence", () => {
    expect(isLowConfidence(20)).toBe(true);
    expect(isLowConfidence(80)).toBe(false);
  });
});

describe("14-15. duplicates and missing source", () => {
  it("deduplicates by country + language + query and merges metrics", () => {
    const merged = dedupeSignals([signal(), signal({ impressions: 500, clicks: 5 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].impressions).toBe(1500);
  });
  it("builds a stable dedupe key", () => {
    expect(opportunityKey("PT", "pt", " Teste ")).toBe(opportunityKey("pt", "PT", "teste"));
  });
  it("rejects an opportunity without a source", () => {
    const result = validateOpportunity(opportunity({ source: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain("source");
  });
  it("rejects an invalid evidence type", () => {
    expect(validateOpportunity(opportunity({ evidence_type: "guess" as never })).valid).toBe(false);
  });
});

describe("19-20. structured classification", () => {
  it("parses a structured array from the model", () => {
    const rows = parseClassifications(
      'Aqui está: [{"query":"sao tome beaches","intent":"inspirational","intent_confidence":82,"category":"beach","language":"en","season":"dry","travel_intent":0.8,"stp_relevance":1,"potential_value":0.6,"seasonality":0.4,"rationale":"pesquisa de destino"}]',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].intent).toBe("inspirational");
    expect(rows[0].intent_confidence).toBe(82);
    expect(rows[0].travel_intent).toBe(0.8);
  });
  it("rejects free text", () => {
    expect(() => parseClassifications("Não sei responder em JSON.")).toThrow();
  });
  it("clamps out-of-range values", () => {
    const rows = parseClassifications('[{"query":"x","intent":"planning","intent_confidence":500,"travel_intent":3}]');
    expect(rows[0].intent_confidence).toBe(100);
    expect(rows[0].travel_intent).toBe(1);
  });
});

describe("21-23. cache and batch limits", () => {
  it("builds a stable cache key regardless of key order", () => {
    expect(cacheKey("gsc", { b: 2, a: 1 })).toBe(cacheKey("gsc", { a: 1, b: 2 }));
  });
  it("distinguishes different requests (cache miss)", () => {
    expect(cacheKey("gsc", { limit: 50 })).not.toBe(cacheKey("gsc", { limit: 10 }));
  });
  it("uses a configurable batch limit with a sane fallback", () => {
    expect(resolveBatchLimit(undefined)).toBe(50);
    expect(resolveBatchLimit(25)).toBe(25);
    expect(resolveBatchLimit(-1)).toBe(50);
    expect(resolveBatchLimit(100000)).toBe(500);
  });
});

describe("sources", () => {
  it("fails closed when Search Console is not configured", async () => {
    const source = new SearchConsoleSource(undefined, "https://www.rotasdoeden.com/");
    expect(source.isConfigured()).toBe(false);
    await expect(source.fetchSignals({ limit: 10 })).rejects.toBeInstanceOf(SourceUnavailableError);
  });
  it("returns explicitly-labelled manual signals", async () => {
    const source = new ManualSignalsSource([signal()]);
    const result = await source.fetchSignals({ limit: 10 });
    expect(result.source).toBe("manual_input");
    expect(result.signals).toHaveLength(1);
    expect(result.limitations.join()).toContain("manualmente");
  });
  it("rejects unknown sources", () => {
    expect(() => buildSource("keyword_planner", {})).toThrow(SourceUnavailableError);
  });
});
