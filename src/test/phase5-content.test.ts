import { describe, expect, it } from "vitest";
import {
  AGENT_FORBIDDEN_STATUSES,
  canTransition,
  checkOpportunityEligibility,
  contentCacheKey,
  contentDedupKey,
  countWords,
  draftText,
  isContentType,
  keywordDensity,
  languageLooksCorrect,
  parseDraft,
  parseOutline,
  qualityCheck,
  resolveContentBatchLimit,
  similarity,
  slugify,
  type ContentDraft,
  type ContentSource,
  type QualityConfig,
} from "../../supabase/functions/_shared/agents/content";

const baseConfig: QualityConfig = {
  minWords: 20,
  maxKeywordDensity: 0.03,
  maxSimilarity: 0.85,
  requiresSeo: true,
  allowedInternalPrefixes: ["/", "/guias", "/experiencias"],
  knownEntities: ["ana silva"],
};

const internalSource: ContentSource = {
  scope: "internal",
  source_table: "districts",
  source_record_id: "11111111-1111-1111-1111-111111111111",
  title: "Água Grande",
  evidence_type: "observed",
};

function makeDraft(overrides: Partial<ContentDraft> = {}): ContentDraft {
  return {
    title: "Guia de viagem para São Tomé e Príncipe",
    meta_description: "Como planear uma viagem às ilhas com guias locais verificados.",
    slug: "guia-viagem-sao-tome",
    language: "pt",
    outline: ["Quando ir", "Como circular"],
    blocks: [
      {
        type: "paragraph",
        text:
          "As ilhas de São Tomé e Príncipe são um destino de natureza para quem procura praias tranquilas, " +
          "floresta tropical e uma cultura própria. Os viajantes que chegam com mais tempo conseguem conhecer " +
          "as duas ilhas com calma e com apoio de guias locais que conhecem os caminhos e a época das chuvas.",
        source_refs: [0],
      },
    ],
    seo: {
      target_keyword: "viagem são tomé",
      secondary_keywords: [],
      search_intent: "planning",
      headings: ["Quando ir"],
      internal_links: ["/guias"],
      schema_suggestions: ["Article"],
      canonical_suggestion: null,
    },
    unknowns: [],
    ...overrides,
  };
}

describe("content types and transitions", () => {
  it("accepts only known content types", () => {
    expect(isContentType("seo_article")).toBe(true);
    expect(isContentType("newsletter")).toBe(false);
  });

  it("never lets the agent approve or publish", () => {
    expect(AGENT_FORBIDDEN_STATUSES).toEqual(["approved", "published"]);
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("in_review", "approved")).toBe(true);
    expect(canTransition("approved", "published")).toBe(true);
  });
});

describe("opportunity gate", () => {
  it("requires an accepted, unexpired opportunity", () => {
    expect(checkOpportunityEligibility(null)).toEqual({ eligible: false, reason: "not_found" });
    expect(checkOpportunityEligibility({ id: "a", status: "nova" })).toEqual({
      eligible: false,
      reason: "not_accepted",
    });
    expect(
      checkOpportunityEligibility({ id: "a", status: "aceite", expires_at: "2020-01-01T00:00:00Z" }),
    ).toEqual({ eligible: false, reason: "expired" });
    expect(checkOpportunityEligibility({ id: "a", status: "aceite" })).toEqual({ eligible: true });
  });
});

describe("helpers", () => {
  it("builds stable dedupe and cache keys", () => {
    const key = contentDedupKey({ opportunityId: "o1", contentType: "faq", language: "PT", market: "FR" });
    expect(key).toBe("o1|faq|pt|fr");
    expect(contentCacheKey("outline", { b: 2, a: 1 })).toBe('content:outline:a=1&b=2');
  });

  it("slugifies accented Portuguese titles", () => {
    expect(slugify("São Tomé & Príncipe: guia!")).toBe("sao-tome-principe-guia");
  });

  it("measures words, density and similarity", () => {
    expect(countWords("uma duas três")).toBe(3);
    expect(keywordDensity("praia praia mar sol vento", "praia")).toBeCloseTo(0.4, 2);
    expect(similarity("praia banana areia branca", "praia banana areia branca")).toBe(1);
    expect(similarity("praia banana", "carro estrada")).toBe(0);
  });

  it("detects an obviously wrong language and stays silent when unsure", () => {
    const english = Array(10).fill("the guide and the beach for you with your trip from this that are").join(" ");
    expect(languageLooksCorrect(english, "pt")).toBe(false);
    expect(languageLooksCorrect("curto", "pt")).toBeNull();
  });

  it("bounds the batch limit", () => {
    expect(resolveContentBatchLimit(undefined)).toBe(3);
    expect(resolveContentBatchLimit(99)).toBe(10);
    expect(resolveContentBatchLimit(2)).toBe(2);
  });
});

describe("structured parsing", () => {
  it("parses an outline from fenced JSON", () => {
    expect(parseOutline('```json\n["Quando ir", "Como chegar"]\n```')).toEqual(["Quando ir", "Como chegar"]);
  });

  it("rejects free text", () => {
    expect(() => parseOutline("Aqui está a estrutura")).toThrow();
    expect(() => parseDraft("sem json", "pt")).toThrow();
  });

  it("parses a draft and normalises the slug", () => {
    const draft = parseDraft(
      JSON.stringify({
        title: "Praias do Sul",
        meta_description: "meta",
        language: "pt",
        outline: ["A"],
        blocks: [{ type: "paragraph", text: "texto", source_refs: [0] }],
        seo: { target_keyword: "praias" },
      }),
      "pt",
    );
    expect(draft.slug).toBe("praias-do-sul");
    expect(draft.blocks).toHaveLength(1);
    expect(draft.seo.target_keyword).toBe("praias");
    expect(draftText(draft)).toContain("texto");
  });
});

describe("quality gate", () => {
  it("passes a sourced, well-formed draft", () => {
    const result = qualityCheck(makeDraft(), [internalSource], [], baseConfig);
    expect(result.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("blocks content without any source", () => {
    const result = qualityCheck(makeDraft(), [], [], baseConfig);
    expect(result.passed).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("no_sources");
  });

  it("blocks prices and statistics without a source", () => {
    const draft = makeDraft({
      blocks: [
        {
          type: "paragraph",
          text: "Esta experiência custa 45€ por pessoa e recebe 12000 visitantes por ano segundo estimativas.",
          source_refs: [],
        },
      ],
    });
    const codes = qualityCheck(draft, [internalSource], [], baseConfig).issues.map((i) => i.code);
    expect(codes).toContain("price_without_source");
    expect(codes).toContain("claim_without_source");
  });

  it("blocks invented links and unknown partners", () => {
    const draft = makeDraft({
      blocks: [
        {
          type: "paragraph",
          text:
            "Recomendamos o hotel Praia Dourada e podes ver mais em https://exemplo-inventado.com/pagina " +
            "para planear uma estadia tranquila nas ilhas com tempo suficiente para conhecer o interior.",
          source_refs: [0],
        },
      ],
      seo: { ...makeDraft().seo, internal_links: ["/pagina-que-nao-existe"] },
    });
    const codes = qualityCheck(draft, [internalSource], [], baseConfig).issues.map((i) => i.code);
    expect(codes).toContain("invented_url");
    expect(codes).toContain("unknown_entity");
    expect(codes).toContain("invalid_internal_link");
  });

  it("blocks keyword stuffing and near-duplicates", () => {
    const stuffed = makeDraft({
      blocks: [
        {
          type: "paragraph",
          text: Array(30).fill("praia").join(" ") + " " + Array(20).fill("ilha").join(" "),
          source_refs: [0],
        },
      ],
      seo: { ...makeDraft().seo, target_keyword: "praia" },
    });
    const stuffedCodes = qualityCheck(stuffed, [internalSource], [], baseConfig).issues.map((i) => i.code);
    expect(stuffedCodes).toContain("keyword_stuffing");

    const base = makeDraft();
    const duplicate = qualityCheck(base, [internalSource], [draftText(base)], baseConfig);
    expect(duplicate.issues.map((i) => i.code)).toContain("duplicate_content");
  });

  it("blocks content that is too short", () => {
    const short = makeDraft({ blocks: [{ type: "paragraph", text: "Muito curto.", source_refs: [0] }] });
    expect(qualityCheck(short, [internalSource], [], baseConfig).issues.map((i) => i.code)).toContain("too_short");
  });

  it("blocks a source with an invalid shape", () => {
    const codes = qualityCheck(
      makeDraft(),
      [{ scope: "external", evidence_type: "observed" }],
      [],
      baseConfig,
    ).issues.map((i) => i.code);
    expect(codes).toContain("source_without_url");
  });
});
