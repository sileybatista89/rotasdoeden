// Pure Content Agent logic. No IO, no secrets, no Deno APIs.
// Imported by the edge function AND by the vitest suite.

import type { EvidenceType } from "./discovery.ts";

export const CONTENT_TYPES = [
  "destination_page",
  "seo_article",
  "landing_page",
  "faq",
  "social_post",
  "experience_content",
  "market_content",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "rejected",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && (CONTENT_TYPES as readonly string[]).includes(value);
}

/** Only these transitions exist. Publication is never reachable from the agent. */
const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "rejected", "archived"],
  in_review: ["approved", "rejected", "draft", "archived"],
  approved: ["published", "in_review", "rejected", "archived"],
  published: ["archived", "in_review"],
  rejected: ["draft", "archived"],
  archived: ["draft"],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** The agent may never move content into these states by itself. */
export const AGENT_FORBIDDEN_STATUSES: ContentStatus[] = ["approved", "published"];

// ------------------------------------------------------------ opportunity ---

export interface OpportunityLike {
  id: string;
  status: string;
  expires_at?: string | null;
  country?: string | null;
  language?: string | null;
  market?: string | null;
  intent?: string | null;
  season?: string | null;
  category?: string | null;
  query?: string | null;
}

export type EligibilityVerdict =
  | { eligible: true }
  | { eligible: false; reason: "not_found" | "not_accepted" | "expired" };

/** Only accepted, unexpired opportunities may become content. Never assume "nova" is approved. */
export function checkOpportunityEligibility(
  opportunity: OpportunityLike | null | undefined,
  now: Date = new Date(),
): EligibilityVerdict {
  if (!opportunity) return { eligible: false, reason: "not_found" };
  if (opportunity.status !== "aceite") return { eligible: false, reason: "not_accepted" };
  if (opportunity.expires_at) {
    const expiry = Date.parse(opportunity.expires_at);
    if (Number.isFinite(expiry) && expiry <= now.getTime()) {
      return { eligible: false, reason: "expired" };
    }
  }
  return { eligible: true };
}

// ------------------------------------------------------------ dedup / slug --

export function contentDedupKey(input: {
  opportunityId: string | null;
  contentType: string;
  language: string;
  market?: string | null;
}): string {
  return [
    input.opportunityId ?? "none",
    input.contentType,
    (input.language ?? "").trim().toLowerCase(),
    (input.market ?? "").trim().toLowerCase(),
  ].join("|");
}

export function slugify(value: string, maxLength = 80): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export function tokenize(text: string): string[] {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/** Jaccard similarity, 0..1. Used to reject near-duplicate content. */
export function similarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  const union = setA.size + setB.size - shared;
  return union === 0 ? 0 : Math.round((shared / union) * 100) / 100;
}

export function countWords(text: string): number {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

export function keywordDensity(text: string, keyword: string): number {
  const words = tokenize(text);
  const target = tokenize(keyword);
  if (words.length === 0 || target.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i <= words.length - target.length; i++) {
    if (target.every((t, j) => words[i + j] === t)) hits += 1;
  }
  return Math.round((hits * target.length / words.length) * 1000) / 1000;
}

// ------------------------------------------------------------- language -----

const LANGUAGE_MARKERS: Record<string, string[]> = {
  pt: ["de", "que", "para", "com", "uma", "não", "são", "das", "dos", "mais"],
  en: ["the", "and", "for", "with", "you", "your", "from", "this", "that", "are"],
  fr: ["le", "la", "les", "des", "une", "pour", "avec", "vous", "dans", "est"],
  de: ["und", "der", "die", "das", "mit", "für", "sie", "ist", "auf", "ein"],
  es: ["el", "la", "los", "las", "una", "para", "con", "que", "más", "por"],
};

/** Heuristic only. Unknown languages are not judged — we never fail on a guess. */
export function languageLooksCorrect(text: string, language: string): boolean | null {
  const code = (language ?? "").slice(0, 2).toLowerCase();
  const markers = LANGUAGE_MARKERS[code];
  if (!markers) return null;
  const words = (text ?? "").toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  if (words.length < 30) return null;
  const scores = Object.entries(LANGUAGE_MARKERS).map(([lang, list]) => {
    const hits = words.filter((w) => list.includes(w)).length;
    return { lang, hits };
  }).sort((a, b) => b.hits - a.hits);
  if (scores[0].hits === 0) return null;
  return scores[0].lang === code;
}

// ------------------------------------------------------------- structures ---

export interface ContentBlock {
  type: "heading" | "paragraph" | "list" | "faq";
  level?: number;
  text?: string;
  items?: string[];
  question?: string;
  answer?: string;
  /** Index into the sources array backing this block. Facts without a source are rejected. */
  source_refs?: number[];
}

export interface ContentSource {
  scope: "internal" | "external";
  source_table?: string | null;
  source_record_id?: string | null;
  url?: string | null;
  title?: string | null;
  excerpt?: string | null;
  evidence_type: EvidenceType;
  consulted_at?: string | null;
}

export interface ContentSeo {
  target_keyword: string | null;
  secondary_keywords: string[];
  search_intent: string | null;
  headings: string[];
  internal_links: string[];
  schema_suggestions: string[];
  canonical_suggestion: string | null;
}

export interface ContentDraft {
  title: string;
  meta_description: string;
  slug: string;
  language: string;
  outline: string[];
  blocks: ContentBlock[];
  seo: ContentSeo;
  unknowns: string[];
}

const EVIDENCE_TYPES: EvidenceType[] = ["observed", "interpreted", "hypothesis", "recommendation"];

function firstJson(raw: string, open: "{" | "["): string {
  const text = (raw ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const close = open === "{" ? "}" : "]";
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start === -1 || end <= start) throw new Error("Model did not return structured output");
  return text.slice(start, end + 1);
}

export function parseOutline(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(firstJson(raw, "["));
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("Outline is not a list");
  return parsed
    .map((item) => (typeof item === "string" ? item : String((item as Record<string, unknown>)?.heading ?? "")))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseDraft(raw: string, fallbackLanguage: string): ContentDraft {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(firstJson(raw, "{")) as Record<string, unknown>;
  } catch {
    throw new Error("Model did not return valid JSON");
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);

  const blocks: ContentBlock[] = (Array.isArray(parsed.blocks) ? parsed.blocks : [])
    .filter((b) => b && typeof b === "object")
    .map((b) => {
      const row = b as Record<string, unknown>;
      const type = str(row.type) as ContentBlock["type"];
      return {
        type: (["heading", "paragraph", "list", "faq"] as string[]).includes(type) ? type : "paragraph",
        level: Number.isFinite(Number(row.level)) ? Number(row.level) : undefined,
        text: str(row.text) || undefined,
        items: Array.isArray(row.items) ? list(row.items) : undefined,
        question: str(row.question) || undefined,
        answer: str(row.answer) || undefined,
        source_refs: Array.isArray(row.source_refs)
          ? (row.source_refs as unknown[]).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
          : [],
      };
    })
    .filter((b) => b.text || b.items?.length || b.answer);

  const seoRaw = (parsed.seo ?? {}) as Record<string, unknown>;
  const title = str(parsed.title);

  return {
    title,
    meta_description: str(parsed.meta_description),
    slug: slugify(str(parsed.slug) || title),
    language: str(parsed.language) || fallbackLanguage,
    outline: list(parsed.outline),
    blocks,
    seo: {
      target_keyword: str(seoRaw.target_keyword) || null,
      secondary_keywords: list(seoRaw.secondary_keywords),
      search_intent: str(seoRaw.search_intent) || null,
      headings: list(seoRaw.headings),
      internal_links: list(seoRaw.internal_links),
      schema_suggestions: list(seoRaw.schema_suggestions),
      canonical_suggestion: str(seoRaw.canonical_suggestion) || null,
    },
    unknowns: list(parsed.unknowns),
  };
}

export function draftText(draft: ContentDraft): string {
  return draft.blocks
    .map((b) => [b.text, b.question, b.answer, ...(b.items ?? [])].filter(Boolean).join(" "))
    .join("\n");
}

// ---------------------------------------------------------- quality check ---

export interface QualityConfig {
  minWords: number;
  maxKeywordDensity: number;
  maxSimilarity: number;
  requiresSeo: boolean;
  /** Routes that really exist. Any other internal link is an invented link. */
  allowedInternalPrefixes: string[];
  /** Names of partners/services that really exist in the database. */
  knownEntities: string[];
}

export interface QualityIssue {
  code: string;
  severity: "blocking" | "warning";
  detail: string;
}

export interface QualityResult {
  passed: boolean;
  issues: QualityIssue[];
  word_count: number;
  keyword_density: number;
  max_similarity: number;
}

const PRICE_PATTERN = /(?:€|eur|usd|\$|dobras?|stn)\s?\d|(\d+[.,]?\d*)\s?(?:€|eur|usd|dobras?)/i;
const NUMERIC_CLAIM = /\b\d{3,}\b|\b\d+\s?%/;
const URL_PATTERN = /https?:\/\/[^\s)"']+/gi;

/**
 * Deterministic gate before anything is stored as a usable draft.
 * Anything the model asserted without a source is blocking — we never publish invented facts.
 */
export function qualityCheck(
  draft: ContentDraft,
  sources: ContentSource[],
  existingTexts: string[],
  config: QualityConfig,
): QualityResult {
  const issues: QualityIssue[] = [];
  const text = draftText(draft);
  const words = countWords(text);

  if (!draft.title) issues.push({ code: "missing_title", severity: "blocking", detail: "Sem título." });
  if (config.requiresSeo && !draft.meta_description) {
    issues.push({ code: "missing_meta", severity: "blocking", detail: "Sem meta description." });
  }
  if (config.requiresSeo && !draft.seo.target_keyword) {
    issues.push({ code: "missing_keyword", severity: "warning", detail: "Sem palavra-chave principal." });
  }
  if (words < config.minWords) {
    issues.push({
      code: "too_short",
      severity: "blocking",
      detail: `Conteúdo com ${words} palavras, mínimo ${config.minWords}.`,
    });
  }

  // Language
  const languageOk = languageLooksCorrect(text, draft.language);
  if (languageOk === false) {
    issues.push({ code: "wrong_language", severity: "blocking", detail: `Texto não parece estar em ${draft.language}.` });
  }

  // Sources
  const validSources = sources.filter((s) => EVIDENCE_TYPES.includes(s.evidence_type));
  if (validSources.length !== sources.length) {
    issues.push({ code: "invalid_source", severity: "blocking", detail: "Fonte com tipo de evidência inválido." });
  }
  for (const source of sources) {
    if (source.scope === "external" && !source.url) {
      issues.push({ code: "source_without_url", severity: "blocking", detail: "Fonte externa sem endereço." });
    }
    if (source.scope === "internal" && !source.source_table) {
      issues.push({ code: "source_without_table", severity: "blocking", detail: "Fonte interna sem origem." });
    }
  }
  if (sources.length === 0) {
    issues.push({ code: "no_sources", severity: "blocking", detail: "Conteúdo sem qualquer fonte." });
  }

  // Facts without a source
  for (const block of draft.blocks) {
    const blockText = [block.text, block.answer, ...(block.items ?? [])].filter(Boolean).join(" ");
    const hasSource = (block.source_refs ?? []).some((i) => i < sources.length);
    if (PRICE_PATTERN.test(blockText) && !hasSource) {
      issues.push({ code: "price_without_source", severity: "blocking", detail: "Preço sem fonte." });
    }
    if (NUMERIC_CLAIM.test(blockText) && !hasSource) {
      issues.push({ code: "claim_without_source", severity: "blocking", detail: "Número/estatística sem fonte." });
    }
  }

  // Invented URLs
  const allowedUrls = new Set(sources.map((s) => (s.url ?? "").trim()).filter(Boolean));
  for (const match of text.match(URL_PATTERN) ?? []) {
    if (!allowedUrls.has(match.replace(/[.,)]$/, ""))) {
      issues.push({ code: "invented_url", severity: "blocking", detail: `Endereço não verificado: ${match}` });
    }
  }

  // Internal links must point at real routes
  for (const link of draft.seo.internal_links) {
    const ok = config.allowedInternalPrefixes.some(
      (p) => link === p || (p !== "/" && link.startsWith(`${p}/`)),
    );
    if (!ok) issues.push({ code: "invalid_internal_link", severity: "blocking", detail: `Rota inexistente: ${link}` });
  }

  // Partners/services that do not exist
  if (config.knownEntities.length >= 0) {
    const mentionPattern = /\b(?:hotel|guia|restaurante|parceiro|experiência|transporte)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'-]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'-]+)?)/g;
    const known = config.knownEntities.map((e) => e.toLowerCase());
    for (const match of text.matchAll(mentionPattern)) {
      const name = match[1].trim().toLowerCase();
      if (!known.includes(name)) {
        issues.push({ code: "unknown_entity", severity: "blocking", detail: `Entidade não confirmada: ${match[1]}` });
      }
    }
  }

  // Keyword stuffing
  const density = draft.seo.target_keyword ? keywordDensity(text, draft.seo.target_keyword) : 0;
  if (density > config.maxKeywordDensity) {
    issues.push({
      code: "keyword_stuffing",
      severity: "blocking",
      detail: `Densidade de palavra-chave ${density} acima do limite ${config.maxKeywordDensity}.`,
    });
  }

  // Near-duplicate content
  let maxSimilarity = 0;
  for (const existing of existingTexts) {
    maxSimilarity = Math.max(maxSimilarity, similarity(text, existing));
  }
  if (maxSimilarity > config.maxSimilarity) {
    issues.push({
      code: "duplicate_content",
      severity: "blocking",
      detail: `Semelhança ${maxSimilarity} com conteúdo existente.`,
    });
  }

  return {
    passed: issues.every((i) => i.severity !== "blocking"),
    issues,
    word_count: words,
    keyword_density: density,
    max_similarity: maxSimilarity,
  };
}

// ------------------------------------------------------------------ limits --

export function resolveContentBatchLimit(configured: unknown, fallback = 3): number {
  const value = Number(configured);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), 10);
}

export function contentCacheKey(scope: string, request: Record<string, unknown>): string {
  const stable = Object.keys(request)
    .sort()
    .map((k) => `${k}=${JSON.stringify(request[k])}`)
    .join("&");
  return `content:${scope}:${stable}`;
}

// ------------------------------------------------------------------ prompts -

export const OUTLINE_SYSTEM_PROMPT = [
  "És um editor de conteúdo de viagens para a Rotas do Éden, marketplace de guias em São Tomé e Príncipe.",
  "Recebes uma oportunidade de procura REAL e dados internos reais.",
  "Devolve APENAS um array JSON de títulos de secção (strings), do H2 mais importante ao menos importante.",
  "Nunca inventes factos, preços, parceiros, estatísticas ou fontes.",
].join(" ");

export const DRAFT_SYSTEM_PROMPT = [
  "És um redator de viagens para a Rotas do Éden (São Tomé e Príncipe).",
  "REGRA ABSOLUTA: não inventes hotéis, guias, experiências, preços, disponibilidade, avaliações,",
  "estatísticas, citações, fontes, testemunhos ou factos turísticos.",
  "Só podes afirmar o que estiver nas FONTES fornecidas. Cada bloco com um facto, número ou preço",
  "tem de indicar source_refs com o índice da fonte usada.",
  "Se faltar informação, acrescenta-a a 'unknowns' em vez de a inventar.",
  "Escreve no idioma pedido. Não incluas URLs que não estejam nas fontes.",
  "Responde APENAS com um objeto JSON:",
  '{"title","meta_description","slug","language","outline":[],"blocks":[{"type","level","text","items","question","answer","source_refs":[]}],',
  '"seo":{"target_keyword","secondary_keywords":[],"search_intent","headings":[],"internal_links":[],"schema_suggestions":[],"canonical_suggestion"},"unknowns":[]}',
].join(" ");
