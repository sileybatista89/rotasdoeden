/**
 * Fase 7G — Quote Engine (lógica pura, sem I/O).
 *
 * Regras desta camada:
 *  - NÃO existe matemática de preço aqui. O preço vem exclusivamente do
 *    Pricing Engine (Fase 7D). Esta camada apenas fotografa e valida.
 *  - A validade de uma cotação nunca pode ultrapassar o elemento crítico
 *    mais curto (voo, tarifa, política/operador).
 *  - O payload do cliente nunca contém custo, margem, markup, tarifa de
 *    fornecedor nem política.
 */

export type QuoteStatus =
  | "draft"
  | "calculated"
  | "sent"
  | "awaiting_confirmation"
  | "accepted"
  | "superseded"
  | "expired"
  | "cancelled";

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  calculated: "Calculada",
  sent: "Enviada",
  awaiting_confirmation: "A aguardar confirmação",
  accepted: "Aceite pelo cliente",
  superseded: "Substituída",
  expired: "Expirada",
  cancelled: "Cancelada",
};

/** Aceitação comercial não é reserva nem pagamento. */
const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["calculated", "cancelled"],
  calculated: ["sent", "expired", "cancelled", "superseded"],
  sent: ["awaiting_confirmation", "accepted", "expired", "cancelled", "superseded"],
  awaiting_confirmation: ["accepted", "expired", "cancelled", "superseded"],
  accepted: ["superseded", "cancelled"],
  superseded: [],
  expired: ["superseded"],
  cancelled: [],
};

export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export type ValidityLimiter = "operator" | "flight_offer" | "component_rate";

export interface ValidityInput {
  /** Validade pretendida pelo operador/política (ISO). */
  operatorValidUntil?: string | null;
  /** Expiração da oferta aérea (ISO). */
  flightExpiresAt?: string | null;
  /** Validades das tarifas usadas (data ISO yyyy-mm-dd ou datetime). */
  rateValidUntil?: (string | null | undefined)[];
}

export interface ValidityResult {
  validUntil: string | null;
  limitedBy: ValidityLimiter | null;
}

function toIso(value: string): string {
  // Uma data sem hora vale até ao fim desse dia.
  return value.length === 10 ? `${value}T23:59:59.000Z` : new Date(value).toISOString();
}

/** A cotação é limitada pelo elemento crítico mais curto. */
export function resolveQuoteValidity(input: ValidityInput): ValidityResult {
  const candidates: { iso: string; by: ValidityLimiter }[] = [];
  if (input.operatorValidUntil) candidates.push({ iso: toIso(input.operatorValidUntil), by: "operator" });
  if (input.flightExpiresAt) candidates.push({ iso: toIso(input.flightExpiresAt), by: "flight_offer" });
  for (const r of input.rateValidUntil ?? []) {
    if (r) candidates.push({ iso: toIso(r), by: "component_rate" });
  }
  if (candidates.length === 0) return { validUntil: null, limitedBy: null };
  candidates.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
  return { validUntil: candidates[0].iso, limitedBy: candidates[0].by };
}

export function isExpired(validUntil: string | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  return new Date(toIso(validUntil)).getTime() <= now.getTime();
}

export interface ConfirmabilityInput {
  pricingStatus: "estimated" | "confirmed" | "requires_review";
  validationErrors: string[];
  productStatus?: string | null;
  policyActive: boolean;
  flight?: { present: boolean; expiresAt?: string | null; expired?: boolean } | null;
  rates: { validityUnknown?: boolean; validUntil?: string | null; status?: string | null }[];
  validUntil?: string | null;
  now?: Date;
  /**
   * Base comercial do cálculo. Quando a proposta assenta em preços de mercado
   * observados não fica bloqueada: fica marcada como dependente de revalidação.
   */
  basis?: "confirmed" | "market_based" | "insufficient";
  allowMarketBased?: boolean;
}

export interface ConfirmabilityResult {
  confirmable: boolean;
  blockingReasons: string[];
  /** Passos obrigatórios antes de confirmar, sem bloquear a proposta. */
  validationRequired: string[];
}

export const QUOTE_BASIS_LABEL: Record<"confirmed" | "market_based" | "insufficient", string> = {
  confirmed: "Tarifas confirmadas por fornecedor",
  market_based: "Preços de mercado observados (exige revalidação)",
  insufficient: "Informação insuficiente",
};

/** Nenhum bloqueio pode ser contornado com um valor por omissão. */
export function evaluateConfirmability(input: ConfirmabilityInput): ConfirmabilityResult {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const validation: string[] = [];
  const marketBased = input.allowMarketBased === true && input.basis === "market_based";

  if (!input.policyActive) reasons.push("Não existe política de preços ativa.");
  if (input.pricingStatus === "requires_review") reasons.push("O cálculo de preço requer revisão.");
  if (input.pricingStatus === "estimated") {
    if (marketBased) {
      validation.push("Proposta baseada em preços de mercado observados — revalidar custos antes de confirmar.");
    } else {
      reasons.push("O cálculo contém custos estimados ou não confirmados.");
    }
  }
  for (const e of input.validationErrors) reasons.push(e);
  if (input.productStatus && input.productStatus === "archived") {
    reasons.push("A versão do produto está arquivada.");
  }

  if (input.flight?.present) {
    const expired = input.flight.expired || isExpired(input.flight.expiresAt, now);
    if (expired) reasons.push("A oferta de voo expirou. É necessária nova pesquisa.");
  }

  for (const r of input.rates) {
    if (r.validityUnknown) { reasons.push("Existe uma tarifa sem validade conhecida."); continue; }
    if (r.status === "expired" || r.status === "withdrawn") { reasons.push("Existe uma tarifa expirada ou retirada."); continue; }
    if (isExpired(r.validUntil, now)) reasons.push("Existe uma tarifa fora de validade.");
  }

  if (isExpired(input.validUntil, now)) reasons.push("A cotação está fora de validade.");

  const unique = [...new Set(reasons)];
  return { confirmable: unique.length === 0, blockingReasons: unique, validationRequired: [...new Set(validation)] };
}


export interface PriceComparison {
  changed: boolean;
  previousPrice: number;
  newPrice: number;
  difference: number;
  differencePct: number | null;
  direction: "up" | "down" | "same";
}

export function comparePrices(previousPrice: number, newPrice: number, tolerance = 0.01): PriceComparison {
  const difference = Number((newPrice - previousPrice).toFixed(2));
  const changed = Math.abs(difference) > tolerance;
  return {
    changed,
    previousPrice,
    newPrice,
    difference,
    differencePct: previousPrice > 0 ? Number(((difference / previousPrice) * 100).toFixed(2)) : null,
    direction: !changed ? "same" : difference > 0 ? "up" : "down",
  };
}

export interface QuoteCriteria {
  origin?: string | null;
  originAirport?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  durationDays: number;
  nights?: number | null;
  adults: number;
  children?: number;
  rooms?: number;
  interests?: string[];
  budget?: number | null;
  comfortLevel?: string | null;
}

/** Só critérios de viagem. Nunca dados pessoais adicionais. */
export function sanitizeCriteria(raw: Record<string, unknown>): QuoteCriteria {
  const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 120) : null);
  return {
    origin: str(raw.origin),
    originAirport: str(raw.origin_airport ?? raw.originAirport),
    destination: str(raw.destination),
    departureDate: str(raw.departure_date ?? raw.departureDate),
    returnDate: str(raw.return_date ?? raw.returnDate),
    durationDays: num(raw.duration_days ?? raw.durationDays),
    nights: raw.nights == null ? null : num(raw.nights),
    adults: num(raw.adults),
    children: num(raw.children, 0),
    rooms: num(raw.rooms, 1) || 1,
    interests: Array.isArray(raw.interests)
      ? (raw.interests as unknown[]).filter((i) => typeof i === "string").slice(0, 10).map((i) => String(i).slice(0, 60))
      : [],
    budget: raw.budget == null ? null : num(raw.budget),
    comfortLevel: str(raw.comfort_level ?? raw.comfortLevel),
  };
}

export function validateCriteria(c: QuoteCriteria): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(c.durationDays) || c.durationDays < 1) errors.push("Duração inválida.");
  if (!Number.isInteger(c.adults) || c.adults < 1) errors.push("É necessário pelo menos um adulto.");
  if ((c.children ?? 0) < 0) errors.push("Número de crianças inválido.");
  if (c.departureDate && c.returnDate && c.returnDate < c.departureDate) {
    errors.push("A data de regresso não pode ser anterior à partida.");
  }
  return errors;
}

/** Chave determinística: mesmos critérios + mesmo contexto = mesma cotação. */
export function quoteIdempotencyKey(input: {
  productVersionId: string | null;
  criteria: QuoteCriteria;
  componentIds: string[];
  flightOfferId?: string | null;
  policyVersionId?: string | null;
}): string {
  const payload = JSON.stringify({
    p: input.productVersionId ?? null,
    c: [...input.componentIds].sort(),
    f: input.flightOfferId ?? null,
    v: input.policyVersionId ?? null,
    k: {
      o: input.criteria.origin ?? null,
      oa: input.criteria.originAirport ?? null,
      d: input.criteria.destination ?? null,
      dd: input.criteria.departureDate ?? null,
      rd: input.criteria.returnDate ?? null,
      du: input.criteria.durationDays,
      n: input.criteria.nights ?? null,
      a: input.criteria.adults,
      ch: input.criteria.children ?? 0,
      r: input.criteria.rooms ?? 1,
    },
  });
  // Hash determinístico simples (FNV-1a 64 em hex) — sem dependências.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b) >>> 0;
  }
  return `qk_${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

// ===== token público =====

/** Token opaco não previsível (32 bytes aleatórios em hex). */
export function generatePublicToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPublicToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(`rotas-quote:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ===== payload do cliente =====

export interface PublicQuoteItem {
  name: string;
  quantity: number;
  unit: string | null;
  cancellationSummary: string | null;
}

export interface PublicQuote {
  quoteNumber: string;
  status: QuoteStatus;
  version: number;
  productName: string | null;
  currency: string;
  totalPrice: number;
  validUntil: string | null;
  criteria: QuoteCriteria;
  flight: {
    airline: string | null;
    departureDate: string | null;
    returnDate: string | null;
    expiresAt: string | null;
  } | null;
  items: PublicQuoteItem[];
  createdAt: string;
}

/**
 * Nunca devolve custo, margem, markup, tarifa de fornecedor, política,
 * identificadores internos, notas internas nem metadados de administração.
 */
export function sanitizeQuoteForCustomer(input: {
  quote: Record<string, any>;
  version: Record<string, any>;
  items: Record<string, any>[];
  productName?: string | null;
}): PublicQuote {
  const flightSnapshot = input.version.flight_snapshot ?? null;
  return {
    quoteNumber: input.quote.quote_number,
    status: input.quote.status,
    version: input.version.version_number,
    productName: input.productName ?? null,
    currency: input.version.sale_currency ?? input.quote.sale_currency,
    totalPrice: Number(input.version.total_price ?? 0),
    validUntil: input.version.valid_until ?? input.quote.expires_at ?? null,
    criteria: sanitizeCriteria(input.version.customer_criteria ?? {}),
    flight: flightSnapshot
      ? {
          airline: flightSnapshot.airline ?? null,
          departureDate: flightSnapshot.departure_date ?? null,
          returnDate: flightSnapshot.return_date ?? null,
          expiresAt: input.version.flight_expires_at ?? null,
        }
      : null,
    items: (input.items ?? []).map((i) => ({
      name: i.display_name,
      quantity: Number(i.quantity ?? 0),
      unit: i.unit ?? null,
      cancellationSummary: i.cancellation_summary ?? null,
    })),
    createdAt: input.quote.created_at,
  };
}

/** Campos que nunca podem existir num payload de cliente. */
export const FORBIDDEN_PUBLIC_FIELDS = [
  "unit_cost", "total_cost", "cost_total", "supplier_id", "supplier_name",
  "rate_id", "rate_kind", "source_type", "source_reference", "rule_mode",
  "rule_pct", "markup", "margin", "gross_margin_pct", "policy_id",
  "policy_version_id", "pricing_calculation_id", "notes",
];

/** Campos que o cliente nunca pode enviar. */
export const FORBIDDEN_CLIENT_INPUT = [
  "price", "final_price", "total_price", "total_cost", "margin", "margin_pct",
  "markup", "markup_pct", "policy", "policy_version_id", "rate", "rates",
  "supplier_cost", "cost",
];

export function rejectForbiddenClientInput(body: Record<string, unknown>): string[] {
  return FORBIDDEN_CLIENT_INPUT.filter((k) => body[k] !== undefined);
}
