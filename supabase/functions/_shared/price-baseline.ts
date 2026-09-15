/**
 * Fase 13 — Preço de referência comercial ("desde €X").
 *
 * Lógica pura, sem I/O, partilhada entre a edge function e o admin.
 * NÃO é um segundo motor de preços: escolhe a combinação mínima válida de
 * componentes reais e delega todo o cálculo no Pricing Engine existente.
 *
 * Regras invioláveis:
 * - nunca preenche um componente em falta com zero;
 * - nunca publica preço sem política de preços ativa;
 * - nunca trata um preço observado no mercado como tarifa confirmada;
 * - o valor público é sempre indicativo e recalculado a partir dos dados reais.
 */
import {
  calculatePricing,
  classifyRateEligibility,
  MARKET_OBSERVATION_MAX_AGE_DAYS,
  resolveQuantity,
  type CommercialState,
  type LineProvenance,
  type PricingBasis,
  type PricingComponentInput,
  type PricingComponentType,
  type PricingPolicyVersion,
  type PricingRateUnit,
  type RateCandidate,
} from "./pricing-engine.ts";

export interface BaselineConfig {
  enabled: boolean;
  adults: number;
  rooms: number;
  required: PricingComponentType[];
}

const COMPONENT_TYPES: PricingComponentType[] = [
  "accommodation", "room", "transport", "transfer", "experience",
  "guide", "meal", "insurance", "flight", "other",
];

export const COMPONENT_TYPE_LABEL: Record<PricingComponentType, string> = {
  accommodation: "Alojamento",
  room: "Quarto",
  transport: "Transporte",
  transfer: "Transfer",
  experience: "Experiência",
  guide: "Guia",
  meal: "Refeições",
  insurance: "Seguro",
  flight: "Voo",
  other: "Outro",
};

/** Lê a configuração de baseline do produto. Sem configuração não há preço público. */
export function normalizeBaselineConfig(raw: unknown): BaselineConfig | null {
  const cfg = (raw ?? {}) as Record<string, unknown>;
  const baseline = (cfg.baseline ?? null) as Record<string, unknown> | null;
  if (!baseline || baseline.enabled !== true) return null;
  const required = Array.isArray(baseline.required)
    ? (baseline.required.filter((t) => COMPONENT_TYPES.includes(t as PricingComponentType)) as PricingComponentType[])
    : [];
  if (required.length === 0) return null;
  const adults = Number(baseline.adults);
  const rooms = Number(baseline.rooms);
  return {
    enabled: true,
    required,
    adults: Number.isFinite(adults) && adults >= 1 ? Math.trunc(adults) : 2,
    rooms: Number.isFinite(rooms) && rooms >= 1 ? Math.trunc(rooms) : 1,
  };
}

export interface BaselineContext {
  durationDays: number;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
}

/** Custo total de um componente com a tarifa elegível mais barata, ou null. */
export function cheapestEligibleCost(
  component: PricingComponentInput,
  referenceDate: string,
  ctx: BaselineContext,
): { rate: RateCandidate; cost: number } | null {
  let best: { rate: RateCandidate; cost: number } | null = null;
  for (const rate of component.rates) {
    if (classifyRateEligibility(rate, referenceDate).eligibility === "ineligible") continue;
    const qty = (component.quantityOverride ?? resolveQuantity(rate.unit as PricingRateUnit, ctx)) * (rate.quantity ?? 1);
    if (!(qty > 0)) continue;
    const cost = rate.price * qty;
    if (!best || cost < best.cost) best = { rate, cost };
  }
  return best;
}

/** Para cada categoria obrigatória escolhe o componente real mais barato. */
export function selectBaselineComponents(
  required: PricingComponentType[],
  components: PricingComponentInput[],
  referenceDate: string,
  ctx: BaselineContext,
): { selected: PricingComponentInput[]; missing: PricingComponentType[] } {
  const selected: PricingComponentInput[] = [];
  const missing: PricingComponentType[] = [];

  for (const type of required) {
    const candidates = components.filter((c) => c.componentType === type);
    let best: { component: PricingComponentInput; cost: number } | null = null;
    for (const candidate of candidates) {
      const cheapest = cheapestEligibleCost(candidate, referenceDate, ctx);
      if (!cheapest) continue;
      if (!best || cheapest.cost < best.cost) best = { component: candidate, cost: cheapest.cost };
    }
    if (!best) missing.push(type);
    else selected.push(best.component);
  }

  return { selected, missing };
}

/** Quando a referência de preço deixa de poder ser usada sem revalidação. */
export function rateExpiry(rate: RateCandidate): string | null {
  if (rate.validUntil) return new Date(`${rate.validUntil}T23:59:59Z`).toISOString();
  if (rate.observedAt) {
    const t = Date.parse(rate.observedAt);
    if (!Number.isNaN(t)) return new Date(t + MARKET_OBSERVATION_MAX_AGE_DAYS * 86_400_000).toISOString();
  }
  return null;
}

export interface BaselineLine {
  componentId: string;
  name: string;
  componentType: PricingComponentType;
  provenance: LineProvenance;
  sourceType: string | null;
  unitPrice: number;
  quantity: number;
  currency: string | null;
  sellPrice: number;
}

export interface BaselineResult {
  status: "published" | "blocked";
  blockedReason: string | null;
  currency: string | null;
  pricePerPerson: number | null;
  priceTotal: number | null;
  durationDays: number;
  nights: number;
  adults: number;
  rooms: number;
  basis: PricingBasis | null;
  commercialState: CommercialState | null;
  policyVersionId: string | null;
  /** Detalhe interno: só para o admin. Nunca sai para o site público. */
  breakdown: BaselineLine[];
  missing: PricingComponentType[];
  sourceRateIds: string[];
  expiresAt: string | null;
  warnings: string[];
}

export interface BaselineRequest {
  policy: PricingPolicyVersion | null;
  config: BaselineConfig;
  durationDays: number;
  nights: number;
  components: PricingComponentInput[];
  referenceDate: string;
}

function blocked(req: BaselineRequest, reason: string, missing: PricingComponentType[] = []): BaselineResult {
  return {
    status: "blocked",
    blockedReason: reason,
    currency: null,
    pricePerPerson: null,
    priceTotal: null,
    durationDays: req.durationDays,
    nights: req.nights,
    adults: req.config.adults,
    rooms: req.config.rooms,
    basis: null,
    commercialState: null,
    policyVersionId: req.policy?.id ?? null,
    breakdown: [],
    missing,
    sourceRateIds: [],
    expiresAt: null,
    warnings: [],
  };
}

/**
 * Calcula o "desde €X" por pessoa na duração mínima do produto.
 * Só publica quando existe política ativa e todas as categorias obrigatórias
 * têm dados reais elegíveis. Caso contrário devolve bloqueio explícito.
 */
export function computeBaseline(req: BaselineRequest): BaselineResult {
  if (!req.policy) return blocked(req, "Não existe política de preços ativa. Sem política não é publicado preço.");
  if (req.policy.status !== "active") return blocked(req, "A política de preços encontrada não está ativa.");
  if (!(req.durationDays > 0) || !(req.config.adults > 0)) {
    return blocked(req, "Configuração mínima do produto inválida.");
  }

  const ctx: BaselineContext = {
    durationDays: req.durationDays,
    nights: req.nights,
    adults: req.config.adults,
    children: 0,
    rooms: req.config.rooms,
  };

  const { selected, missing } = selectBaselineComponents(req.config.required, req.components, req.referenceDate, ctx);
  if (missing.length > 0) {
    return blocked(
      req,
      `Faltam dados reais elegíveis para: ${missing.map((m) => COMPONENT_TYPE_LABEL[m]).join(", ")}.`,
      missing,
    );
  }

  const result = calculatePricing({
    policy: req.policy,
    durationDays: req.durationDays,
    nights: req.nights,
    adults: req.config.adults,
    children: 0,
    rooms: req.config.rooms,
    referenceDate: req.referenceDate,
    components: selected,
  });

  const breakdown: BaselineLine[] = result.components.map((l) => ({
    componentId: l.componentId,
    name: l.name,
    componentType: l.componentType,
    provenance: l.provenance,
    sourceType: l.sourceType,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    currency: l.currency,
    sellPrice: Math.round(l.sellPrice * 100) / 100,
  }));

  const base: BaselineResult = {
    status: "blocked",
    blockedReason: null,
    currency: result.currency,
    pricePerPerson: null,
    priceTotal: null,
    durationDays: req.durationDays,
    nights: req.nights,
    adults: req.config.adults,
    rooms: req.config.rooms,
    basis: result.basis,
    commercialState: result.commercialState,
    policyVersionId: req.policy.id,
    breakdown,
    missing: [],
    sourceRateIds: result.components.map((l) => l.rateId).filter(Boolean) as string[],
    expiresAt: null,
    warnings: result.warnings,
  };

  if (result.validationErrors.length > 0) {
    return { ...base, blockedReason: result.validationErrors.join(" ") };
  }
  if (result.basis === "insufficient") {
    return { ...base, blockedReason: "Dados insuficientes para um preço responsável." };
  }
  // Nunca transformar ausência de custo em preço zero.
  if (!(result.finalPrice > 0)) {
    return { ...base, blockedReason: "Cálculo sem valor utilizável." };
  }

  const expiries = selected
    .flatMap((c) => c.rates)
    .filter((r) => base.sourceRateIds.includes(r.id))
    .map(rateExpiry)
    .filter(Boolean) as string[];

  const perPerson = Math.round((result.finalPrice / req.config.adults) * 100) / 100;

  return {
    ...base,
    status: "published",
    pricePerPerson: perPerson,
    priceTotal: Math.round(result.finalPrice * 100) / 100,
    expiresAt: expiries.length > 0 ? expiries.sort()[0] : null,
  };
}

/** O que pode ser mostrado ao visitante. Sem custo, margem ou fornecedor. */
export function publicBaseline(row: {
  status: string;
  currency: string | null;
  price_per_person: number | null;
  commercial_state: string | null;
  duration_days: number | null;
  adults: number | null;
  computed_at: string;
  expires_at: string | null;
}) {
  const stale = row.expires_at != null && Date.parse(row.expires_at) < Date.now();
  if (row.status !== "published" || row.price_per_person == null || stale) return null;
  return {
    currency: row.currency,
    price_per_person: row.price_per_person,
    duration_days: row.duration_days,
    adults: row.adults,
    indicative: row.commercial_state !== "confirmed_pricing",
    computed_at: row.computed_at,
  };
}
