/**
 * Fase 7D — Pricing Engine (lógica pura, sem I/O).
 * Fonte única partilhada entre o admin (src/lib/pricing.ts) e a edge function
 * `pricing-engine`. Não contém APIs de Deno nem do browser.
 *
 * A IA nunca define margem, nunca escreve preço e nunca altera regras.
 * O preço é sempre produzido aqui, no servidor, a partir de custos válidos.
 */

export type PricingStatus = "estimated" | "confirmed" | "requires_review";
export type PolicyStatus = "draft" | "under_review" | "active" | "archived";
export type MarginMode = "markup" | "target_margin";
export type RoundingMode = "none" | "nearest_1" | "nearest_5" | "nearest_10" | "nearest_50";
export type FlightProtectionMethod =
  | "fixed_amount"
  | "percentage"
  | "percentage_with_minimum"
  | "percentage_with_maximum"
  | "hybrid";

export type PricingComponentType =
  | "accommodation" | "room" | "transport" | "transfer" | "experience"
  | "guide" | "meal" | "insurance" | "flight" | "other";

export type PricingRateUnit =
  | "per_person" | "per_night" | "per_room" | "per_day" | "per_group" | "per_service" | "fixed";

export type PricingRateKind =
  | "market_observed_price" | "supplier_cost" | "negotiated_rotas_rate" | "estimated_cost";

export type PricingRateStatus =
  | "observed" | "quoted" | "negotiated" | "confirmed" | "expired" | "withdrawn";

export interface ComponentRule {
  /** Como o componente entra no preço. */
  mode: MarginMode | "pass_through";
  /** Percentagem (markup ou margem alvo) consoante o modo. */
  value: number;
  /** Custo já com margem incluída — nunca voltar a marcar. */
  marginIncluded?: boolean;
}

export interface FeeRule {
  label: string;
  kind: "fixed" | "percentage";
  amount: number;
  appliesTo?: "subtotal" | "land" | "flight";
}

export interface SupplementRule {
  label: string;
  kind: "per_person" | "per_night" | "per_room" | "per_component" | "fixed";
  amount: number;
  componentType?: PricingComponentType;
}

export interface OperationalCostRule {
  label: string;
  kind: "fixed" | "per_person" | "per_day";
  amount: number;
  /** true quando o valor já inclui margem — não voltar a marcar. */
  marginIncluded?: boolean;
}

export interface FlightProtectionRule {
  method: FlightProtectionMethod;
  value: number;
  minimum?: number | null;
  maximum?: number | null;
}

export interface PricingPolicyVersion {
  id: string;
  policyId: string;
  versionNumber: number;
  status: PolicyStatus;
  baseCurrency: string;
  marginMode: MarginMode;
  minMarginPct: number;
  targetMarginPct: number;
  componentRules: Partial<Record<PricingComponentType, ComponentRule>>;
  flightProtection: FlightProtectionRule;
  fees: FeeRule[];
  supplements: SupplementRule[];
  operationalCosts: OperationalCostRule[];
  roundingMode: RoundingMode;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface RateCandidate {
  id: string;
  kind: PricingRateKind;
  status: PricingRateStatus;
  price: number;
  currency: string;
  unit: PricingRateUnit;
  quantity?: number;
  occupancyAdults?: number | null;
  occupancyChildren?: number | null;
  occupancyTotal?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  validityUnknown?: boolean;
  sourceType?: string | null;
  observedAt?: string | null;
}

export interface PricingComponentInput {
  id: string;
  name: string;
  componentType: PricingComponentType;
  rates: RateCandidate[];
  /** Override explícito da quantidade (ex.: 3 noites num pacote de 7). */
  quantityOverride?: number | null;
}

export interface PricingRequest {
  policy: PricingPolicyVersion;
  productId?: string | null;
  productVersionId?: string | null;
  durationDays: number;
  nights: number;
  adults: number;
  children?: number;
  rooms?: number;
  referenceDate: string; // ISO date usado para validar validade das tarifas
  components: PricingComponentInput[];
  /** Estrutura futura: custo de voo confirmado. Nesta fase não existe voo real. */
  flightCost?: { amount: number; currency: string; confirmed: boolean } | null;
}

export interface PricedComponentLine {
  componentId: string;
  name: string;
  componentType: PricingComponentType;
  rateId: string | null;
  rateKind: PricingRateKind | null;
  unit: PricingRateUnit | null;
  unitPrice: number;
  quantity: number;
  currency: string | null;
  cost: number;
  ruleMode: ComponentRule["mode"];
  rulePct: number;
  markup: number;
  sellPrice: number;
  estimated: boolean;
  notes: string[];
}

export interface PricingResult {
  productId: string | null;
  productVersionId: string | null;
  policyId: string;
  policyVersionId: string;
  policyVersionNumber: number;
  currency: string;
  components: PricedComponentLine[];
  landCost: number;
  flightCost: number;
  flightProtection: number;
  operationalCosts: number;
  costTotal: number;
  markupTotal: number;
  fees: number;
  supplements: number;
  subtotal: number;
  finalPrice: number;
  grossMarginPct: number | null;
  markupPct: number | null;
  status: PricingStatus;
  warnings: string[];
  validationErrors: string[];
}

// ============ matemática explícita ============

/** preço = custo × (1 + markup) */
export function applyMarkup(cost: number, markupPct: number): number {
  return cost * (1 + markupPct / 100);
}

/** preço = custo / (1 - margem) */
export function applyTargetMargin(cost: number, marginPct: number): number {
  if (marginPct >= 100) throw new Error("Margem alvo tem de ser inferior a 100%.");
  return cost / (1 - marginPct / 100);
}

/** markup 20% → margem bruta 16,666...% */
export function markupToMargin(markupPct: number): number {
  return (markupPct / (100 + markupPct)) * 100;
}

/** margem 20% → markup 25% */
export function marginToMarkup(marginPct: number): number {
  if (marginPct >= 100) throw new Error("Margem tem de ser inferior a 100%.");
  return (marginPct / (100 - marginPct)) * 100;
}

/** margem bruta = (preço - custo) / preço */
export function grossMargin(cost: number, price: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export function roundFinal(value: number, mode: RoundingMode): number {
  switch (mode) {
    case "nearest_1": return Math.round(value);
    case "nearest_5": return Math.round(value / 5) * 5;
    case "nearest_10": return Math.round(value / 10) * 10;
    case "nearest_50": return Math.round(value / 50) * 50;
    default: return Math.round(value * 100) / 100;
  }
}

// ============ validade e seleção de tarifas ============

export function isRateValidOn(rate: RateCandidate, referenceDate: string): boolean {
  if (rate.validityUnknown) return false;
  if (rate.validFrom && rate.validUntil && rate.validUntil < rate.validFrom) return false;
  if (rate.validFrom && referenceDate < rate.validFrom) return false;
  if (rate.validUntil && referenceDate > rate.validUntil) return false;
  return true;
}

export function isOccupancyCompatible(
  rate: RateCandidate,
  guests: { adults: number; children: number },
): boolean {
  const total = guests.adults + guests.children;
  if (rate.occupancyAdults != null && rate.occupancyAdults !== guests.adults) return false;
  if (rate.occupancyChildren != null && rate.occupancyChildren !== guests.children) return false;
  if (rate.occupancyTotal != null && rate.occupancyTotal !== total) return false;
  return true;
}

const KIND_PRIORITY: Record<PricingRateKind, number> = {
  negotiated_rotas_rate: 0,
  supplier_cost: 1,
  estimated_cost: 2,
  market_observed_price: 3,
};

export interface RateSelection {
  rate: RateCandidate | null;
  estimated: boolean;
  notes: string[];
}

export function selectRate(
  rates: RateCandidate[],
  referenceDate: string,
  guests: { adults: number; children: number },
): RateSelection {
  const notes: string[] = [];
  const usable = rates.filter((r) => {
    if (r.status === "withdrawn") { notes.push(`Tarifa ${r.id} retirada — ignorada.`); return false; }
    if (r.status === "expired") { notes.push(`Tarifa ${r.id} expirada — ignorada.`); return false; }
    if (!r.sourceType) { notes.push(`Tarifa ${r.id} sem fonte — ignorada.`); return false; }
    if (!isRateValidOn(r, referenceDate)) { notes.push(`Tarifa ${r.id} fora de validade — ignorada.`); return false; }
    if (!isOccupancyCompatible(r, guests)) { notes.push(`Tarifa ${r.id} não corresponde à ocupação pedida.`); return false; }
    if (!(r.price > 0)) { notes.push(`Tarifa ${r.id} com valor inválido — ignorada.`); return false; }
    return true;
  });

  if (usable.length === 0) return { rate: null, estimated: false, notes };

  usable.sort((a, b) => {
    const p = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (p !== 0) return p;
    if (a.status === "confirmed" && b.status !== "confirmed") return -1;
    if (b.status === "confirmed" && a.status !== "confirmed") return 1;
    return a.price - b.price;
  });

  const chosen = usable[0];
  const observed = usable.find((r) => r.kind === "market_observed_price");
  if (chosen.kind === "negotiated_rotas_rate" && observed) {
    notes.push(`Tarifa negociada Rotas (${chosen.price}) usada em vez do preço público observado (${observed.price}).`);
  }
  const estimated = chosen.kind === "estimated_cost" || chosen.status !== "confirmed";
  return { rate: chosen, estimated, notes };
}

export function resolveQuantity(
  unit: PricingRateUnit,
  ctx: { durationDays: number; nights: number; adults: number; children: number; rooms: number },
): number {
  switch (unit) {
    case "per_person": return ctx.adults + ctx.children;
    case "per_night": return ctx.nights;
    case "per_room": return ctx.rooms;
    case "per_day": return ctx.durationDays;
    case "per_group":
    case "per_service":
    case "fixed":
    default: return 1;
  }
}

export function applyFlightProtection(flightCost: number, rule: FlightProtectionRule): number {
  if (flightCost <= 0) return 0;
  const pct = (rule.value / 100) * flightCost;
  switch (rule.method) {
    case "fixed_amount": return rule.value;
    case "percentage": return pct;
    case "percentage_with_minimum": return Math.max(pct, rule.minimum ?? 0);
    case "percentage_with_maximum": return Math.min(pct, rule.maximum ?? pct);
    case "hybrid": {
      const withMin = Math.max(pct, rule.minimum ?? 0);
      return rule.maximum != null ? Math.min(withMin, rule.maximum) : withMin;
    }
    default: return 0;
  }
}

const DEFAULT_RULE: ComponentRule = { mode: "markup", value: 0 };

// ============ motor ============

export function calculatePricing(req: PricingRequest): PricingResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const policy = req.policy;
  const currency = policy.baseCurrency;
  const children = req.children ?? 0;
  const rooms = req.rooms ?? 1;
  const guests = { adults: req.adults, children };
  const ctx = { durationDays: req.durationDays, nights: req.nights, adults: req.adults, children, rooms };

  if (policy.status !== "active") warnings.push("Política não ativa — cálculo apenas para simulação.");
  if (req.durationDays <= 0) errors.push("Duração do pacote tem de ser superior a zero.");
  if (req.adults <= 0) errors.push("É necessário pelo menos um adulto.");
  if (policy.minMarginPct < 0 || policy.minMarginPct >= 100) errors.push("Margem mínima inválida.");
  if (policy.targetMarginPct < 0 || policy.targetMarginPct >= 100) errors.push("Margem alvo inválida.");
  if (req.components.length === 0) errors.push("Nenhum componente indicado para cálculo.");

  let anyEstimated = false;
  const lines: PricedComponentLine[] = [];

  for (const comp of req.components) {
    const sel = selectRate(comp.rates, req.referenceDate, guests);
    const notes = [...sel.notes];
    const rule = policy.componentRules[comp.componentType] ?? DEFAULT_RULE;

    if (!sel.rate) {
      errors.push(`Componente "${comp.name}" sem tarifa válida disponível.`);
      lines.push({
        componentId: comp.id, name: comp.name, componentType: comp.componentType,
        rateId: null, rateKind: null, unit: null, unitPrice: 0, quantity: 0, currency: null,
        cost: 0, ruleMode: rule.mode, rulePct: rule.value, markup: 0, sellPrice: 0,
        estimated: true, notes,
      });
      anyEstimated = true;
      continue;
    }

    const rate = sel.rate;
    if (rate.currency !== currency) {
      errors.push(
        `Componente "${comp.name}" com custo em ${rate.currency} e política em ${currency}. Não existe conversão cambial configurada.`,
      );
    }

    const baseQty = comp.quantityOverride ?? resolveQuantity(rate.unit, ctx);
    const quantity = baseQty * (rate.quantity ?? 1);
    if (quantity <= 0) errors.push(`Quantidade inválida para "${comp.name}".`);
    const cost = rate.price * quantity;

    let sellPrice = cost;
    if (rule.marginIncluded) {
      notes.push("Custo já contém margem — não foi remarcado.");
    } else if (rule.mode === "markup") {
      sellPrice = applyMarkup(cost, rule.value);
    } else if (rule.mode === "target_margin") {
      if (rule.value >= 100) errors.push(`Margem alvo inválida para "${comp.name}".`);
      else sellPrice = applyTargetMargin(cost, rule.value);
    }

    if (sel.estimated) anyEstimated = true;

    lines.push({
      componentId: comp.id, name: comp.name, componentType: comp.componentType,
      rateId: rate.id, rateKind: rate.kind, unit: rate.unit, unitPrice: rate.price,
      quantity, currency: rate.currency, cost,
      ruleMode: rule.mode, rulePct: rule.marginIncluded ? 0 : rule.value,
      markup: sellPrice - cost, sellPrice, estimated: sel.estimated, notes,
    });
  }

  // 3. custo terrestre
  const landLines = lines.filter((l) => l.componentType !== "flight");
  const landCost = landLines.reduce((s, l) => s + l.cost, 0);
  let running = landLines.reduce((s, l) => s + l.sellPrice, 0);

  // 4/5. voo (estrutura futura) + proteção de tarifa
  let flightCost = lines.filter((l) => l.componentType === "flight").reduce((s, l) => s + l.cost, 0);
  let flightSell = lines.filter((l) => l.componentType === "flight").reduce((s, l) => s + l.sellPrice, 0);
  if (req.flightCost) {
    if (req.flightCost.currency !== currency) {
      errors.push("Custo de voo numa moeda diferente da política. Não existe conversão cambial configurada.");
    }
    flightCost += req.flightCost.amount;
    const rule = policy.componentRules.flight ?? DEFAULT_RULE;
    flightSell += rule.marginIncluded
      ? req.flightCost.amount
      : rule.mode === "target_margin"
        ? applyTargetMargin(req.flightCost.amount, rule.value)
        : applyMarkup(req.flightCost.amount, rule.value);
    if (!req.flightCost.confirmed) anyEstimated = true;
  }
  const flightProtection = applyFlightProtection(flightCost, policy.flightProtection);
  running += flightSell + flightProtection;

  // 6. custos operacionais previstos
  let operational = 0;
  for (const op of policy.operationalCosts ?? []) {
    const base = op.kind === "per_person"
      ? op.amount * (req.adults + children)
      : op.kind === "per_day" ? op.amount * req.durationDays : op.amount;
    operational += base;
    // custos operacionais que já contêm margem não são remarcados
    running += op.marginIncluded ? base : applyMarkupByPolicy(base, policy);
  }

  // 7. taxas e suplementos
  let feesTotal = 0;
  const seenFees = new Set<string>();
  for (const fee of policy.fees ?? []) {
    const key = `${fee.label}|${fee.kind}|${fee.amount}|${fee.appliesTo ?? "subtotal"}`;
    if (seenFees.has(key)) { warnings.push(`Taxa duplicada ignorada: ${fee.label}.`); continue; }
    seenFees.add(key);
    if (fee.kind === "fixed") { feesTotal += fee.amount; continue; }
    const base = fee.appliesTo === "land" ? landCost : fee.appliesTo === "flight" ? flightCost : running;
    feesTotal += (fee.amount / 100) * base;
  }

  let supplementsTotal = 0;
  const seenSupp = new Set<string>();
  for (const sup of policy.supplements ?? []) {
    const key = `${sup.label}|${sup.kind}|${sup.amount}|${sup.componentType ?? "-"}`;
    if (seenSupp.has(key)) { warnings.push(`Suplemento duplicado ignorado: ${sup.label}.`); continue; }
    seenSupp.add(key);
    switch (sup.kind) {
      case "per_person": supplementsTotal += sup.amount * (req.adults + children); break;
      case "per_night": supplementsTotal += sup.amount * req.nights; break;
      case "per_room": supplementsTotal += sup.amount * rooms; break;
      case "per_component": {
        const n = sup.componentType
          ? lines.filter((l) => l.componentType === sup.componentType).length
          : lines.length;
        supplementsTotal += sup.amount * n;
        break;
      }
      default: supplementsTotal += sup.amount;
    }
  }

  // 8. subtotal
  const subtotal = running + feesTotal + supplementsTotal;
  const costTotal = landCost + flightCost + flightProtection + operational;

  // 9. arredondamento apenas no final
  const finalPrice = errors.length > 0 ? 0 : roundFinal(subtotal, policy.roundingMode);

  const margin = finalPrice > 0 ? grossMargin(costTotal, finalPrice) : null;
  const markupPct = costTotal > 0 && finalPrice > 0 ? ((finalPrice - costTotal) / costTotal) * 100 : null;

  let status: PricingStatus;
  if (errors.length > 0) {
    status = "requires_review";
  } else if (margin != null && margin < policy.minMarginPct) {
    status = "requires_review";
    errors.push(
      `Margem bruta obtida (${margin.toFixed(2)}%) é inferior à margem mínima da política (${policy.minMarginPct}%).`,
    );
  } else if (anyEstimated) {
    status = "estimated";
    warnings.push("Cálculo contém custos estimados ou não confirmados — não pode ser apresentado como preço confirmado.");
  } else {
    status = "confirmed";
  }

  return {
    productId: req.productId ?? null,
    productVersionId: req.productVersionId ?? null,
    policyId: policy.policyId,
    policyVersionId: policy.id,
    policyVersionNumber: policy.versionNumber,
    currency,
    components: lines,
    landCost,
    flightCost,
    flightProtection,
    operationalCosts: operational,
    costTotal,
    markupTotal: subtotal - costTotal,
    fees: feesTotal,
    supplements: supplementsTotal,
    subtotal,
    finalPrice,
    grossMarginPct: margin,
    markupPct,
    status,
    warnings,
    validationErrors: errors,
  };
}

function applyMarkupByPolicy(cost: number, policy: PricingPolicyVersion): number {
  const rule = policy.componentRules.other;
  if (rule && !rule.marginIncluded) {
    return rule.mode === "target_margin" ? applyTargetMargin(cost, rule.value) : applyMarkup(cost, rule.value);
  }
  return policy.marginMode === "target_margin"
    ? applyTargetMargin(cost, policy.targetMarginPct)
    : applyMarkup(cost, policy.targetMarginPct);
}

export const ROUNDING_LABEL: Record<RoundingMode, string> = {
  none: "Sem arredondamento (2 casas)",
  nearest_1: "Múltiplo de 1",
  nearest_5: "Múltiplo de 5",
  nearest_10: "Múltiplo de 10",
  nearest_50: "Múltiplo de 50",
};

export const MARGIN_MODE_LABEL: Record<MarginMode, string> = {
  markup: "Markup sobre o custo",
  target_margin: "Margem bruta alvo",
};

export const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
  draft: "Rascunho",
  under_review: "Em revisão",
  active: "Ativa",
  archived: "Arquivada",
};

export const PRICING_STATUS_LABEL: Record<PricingStatus, string> = {
  estimated: "Estimado",
  confirmed: "Confirmado",
  requires_review: "Requer revisão",
};

export const FLIGHT_PROTECTION_LABEL: Record<FlightProtectionMethod, string> = {
  fixed_amount: "Valor fixo",
  percentage: "Percentagem",
  percentage_with_minimum: "Percentagem com mínimo",
  percentage_with_maximum: "Percentagem com máximo",
  hybrid: "Híbrido (mínimo e máximo)",
};
