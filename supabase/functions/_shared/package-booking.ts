/**
 * Fase 7I (passo 1) — modelo partilhado das reservas de pacote.
 *
 * Esta camada só descreve a estrutura e os estados. NÃO executa transições
 * automáticas, NÃO cria reservas, NÃO cobra, NÃO contacta fornecedores e
 * NÃO cria ordens de voo. O preço é sempre o preço confirmado no servidor.
 */

export const BOOKING_STATUSES = [
  "draft", "awaiting_payment", "paid", "confirmed", "completed", "cancelled", "issue",
] as const;
export type PackageBookingStatus = typeof BOOKING_STATUSES[number];

export const FLIGHT_STATUSES = [
  "none", "selected", "revalidated", "held", "ordered", "ticketed",
  "expired", "unavailable", "failed", "cancelled",
] as const;
export type BookingFlightStatus = typeof FLIGHT_STATUSES[number];

export const PAYMENT_STATUSES = [
  "none", "pending", "paid", "partially_refunded", "refunded", "failed", "expired",
] as const;
export type BookingPaymentStatus = typeof PAYMENT_STATUSES[number];

export const OPERATIONS_STATUSES = [
  "preparing", "supplier_confirmation", "flight_confirmation",
  "accommodation_confirmation", "ready", "completed", "issue", "cancelled",
] as const;
export type BookingOperationsStatus = typeof OPERATIONS_STATUSES[number];

export const SUPPLIER_CONFIRMATION_STATUSES = [
  "pending", "requested", "confirmed", "declined", "unavailable", "cancelled", "issue",
] as const;
export type SupplierConfirmationStatus = typeof SUPPLIER_CONFIRMATION_STATUSES[number];

export const BOOKING_STATUS_LABEL: Record<PackageBookingStatus, string> = {
  draft: "Rascunho",
  awaiting_payment: "A aguardar pagamento",
  paid: "Pago",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
  issue: "Com incidente",
};

export const FLIGHT_STATUS_LABEL: Record<BookingFlightStatus, string> = {
  none: "Sem voo",
  selected: "Selecionado",
  revalidated: "Revalidado",
  held: "Em reserva provisória",
  ordered: "Ordem criada",
  ticketed: "Emitido",
  expired: "Expirado",
  unavailable: "Indisponível",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<BookingPaymentStatus, string> = {
  none: "Sem pagamento",
  pending: "Pendente",
  paid: "Pago",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  failed: "Falhou",
  expired: "Expirado",
};

export const OPERATIONS_STATUS_LABEL: Record<BookingOperationsStatus, string> = {
  preparing: "Em preparação",
  supplier_confirmation: "Confirmação de fornecedores",
  flight_confirmation: "Confirmação de voo",
  accommodation_confirmation: "Confirmação de alojamento",
  ready: "Pronta",
  completed: "Concluída",
  issue: "Com incidente",
  cancelled: "Cancelada",
};

export const SUPPLIER_CONFIRMATION_STATUS_LABEL: Record<SupplierConfirmationStatus, string> = {
  pending: "Por pedir",
  requested: "Pedida",
  confirmed: "Confirmada",
  declined: "Recusada",
  unavailable: "Indisponível",
  cancelled: "Cancelada",
  issue: "Com incidente",
};

export function isBookingStatus(v: unknown): v is PackageBookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}
export function isFlightStatus(v: unknown): v is BookingFlightStatus {
  return typeof v === "string" && (FLIGHT_STATUSES as readonly string[]).includes(v);
}
export function isPaymentStatus(v: unknown): v is BookingPaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
}
export function isOperationsStatus(v: unknown): v is BookingOperationsStatus {
  return typeof v === "string" && (OPERATIONS_STATUSES as readonly string[]).includes(v);
}

/**
 * Uma reserva só pode ser considerada confirmada quando os quatro eixos
 * estão, cada um, no seu estado positivo. Nada colapsa num único estado.
 */
export function isFullyConfirmed(input: {
  booking: PackageBookingStatus;
  payment: BookingPaymentStatus;
  flight: BookingFlightStatus;
  operations: BookingOperationsStatus;
}): boolean {
  return (
    (input.booking === "confirmed" || input.booking === "completed") &&
    input.payment === "paid" &&
    (input.flight === "none" || input.flight === "ticketed") &&
    (input.operations === "ready" || input.operations === "completed")
  );
}

/** Campos internos que nunca podem chegar a um cliente. */
export const FORBIDDEN_BOOKING_PUBLIC_FIELDS = [
  "unit_cost", "total_cost", "confirmed_cost", "supplier_id", "supplier_name",
  "rate_id", "rate_kind", "source_type", "source_reference", "internal_notes",
  "pricing_calculation_id", "supplier_reference",
];

/** Campos que o cliente nunca pode enviar ao criar uma reserva. */
export const FORBIDDEN_BOOKING_CLIENT_INPUT = [
  "confirmed_price", "confirmed_cost", "price", "total_price", "total_cost",
  "margin", "markup", "currency_override", "booking_status", "payment_status",
];

export function rejectForbiddenBookingInput(body: Record<string, unknown>): string[] {
  return FORBIDDEN_BOOKING_CLIENT_INPUT.filter((k) => body[k] !== undefined);
}

export interface BookingItemSnapshot {
  quote_item_id: string | null;
  line_order: number;
  component_id: string | null;
  rate_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  display_name: string;
  component_type: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  total_cost: number;
  selling_price: number;
  currency: string | null;
  rate_kind: string | null;
  source_type: string | null;
  source_reference: string | null;
  rate_valid_from: string | null;
  rate_valid_until: string | null;
  validity_unknown: boolean;
  cancellation_type: string | null;
  cancellation_summary: string | null;
  estimated: boolean;
}

/**
 * Fotografia das linhas de uma versão de cotação. Guarda valores, não apenas
 * chaves: a reserva continua legível mesmo que o fornecedor mude os dados.
 */
export function snapshotItemsFromQuote(quoteItems: Record<string, any>[]): BookingItemSnapshot[] {
  return (quoteItems ?? []).map((i, idx) => ({
    quote_item_id: i.id ?? null,
    line_order: Number.isFinite(Number(i.line_order)) ? Number(i.line_order) : idx,
    component_id: i.component_id ?? null,
    rate_id: i.rate_id ?? null,
    supplier_id: i.supplier_id ?? null,
    supplier_name: i.supplier_name ?? null,
    display_name: String(i.display_name ?? ""),
    component_type: String(i.component_type ?? ""),
    quantity: Number(i.quantity ?? 0),
    unit: i.unit ?? null,
    unit_cost: Number(i.unit_cost ?? 0),
    total_cost: Number(i.total_cost ?? 0),
    selling_price: Number(i.selling_price ?? 0),
    currency: i.currency ?? null,
    rate_kind: i.rate_kind ?? null,
    source_type: i.source_type ?? null,
    source_reference: i.source_reference ?? null,
    rate_valid_from: i.rate_valid_from ?? null,
    rate_valid_until: i.rate_valid_until ?? null,
    validity_unknown: Boolean(i.validity_unknown),
    cancellation_type: i.cancellation_type ?? null,
    cancellation_summary: i.cancellation_summary ?? null,
    estimated: Boolean(i.estimated),
  }));
}

/**
 * O preço confirmado vem exclusivamente da versão de cotação guardada no
 * servidor. Qualquer valor enviado pelo cliente é ignorado.
 */
export function confirmedPriceFromVersion(version: Record<string, any>): { price: number; cost: number; currency: string } {
  return {
    price: Number(version?.total_price ?? 0),
    cost: Number(version?.total_cost ?? 0),
    currency: String(version?.sale_currency ?? "EUR"),
  };
}

// ===================================================================
// Fase 7I (passos 2-4) — aceitação, revalidação e criação da reserva.
// Continua sem I/O: só regras puras, testáveis e partilhadas.
// ===================================================================

export type AcceptanceFailureCode =
  | "invalid_token"
  | "quote_not_found"
  | "version_mismatch"
  | "quote_expired"
  | "quote_superseded"
  | "quote_cancelled"
  | "product_version_archived"
  | "not_confirmable"
  | "requires_reacceptance"
  | "already_accepted";

export interface AcceptanceInput {
  quote: {
    status: string;
    current_version_id: string | null;
    accepted_at?: string | null;
    accepted_version_id?: string | null;
    requires_reacceptance?: boolean;
    public_token_expires_at?: string | null;
  };
  version: {
    id: string;
    version_number: number;
    status?: string | null;
    valid_until?: string | null;
    confirmable?: boolean | null;
    blocking_reasons?: unknown;
  };
  /** Versão que o cliente viu; protege contra aceitar algo já substituído. */
  expectedVersionNumber?: number | null;
  productVersionStatus?: string | null;
  now?: Date;
}

export interface AcceptanceResult {
  ok: boolean;
  code?: AcceptanceFailureCode;
  reason?: string;
  /** Aceitação repetida da mesma versão é idempotente, não é um erro novo. */
  alreadyAccepted?: boolean;
}

function expired(value: string | null | undefined, now: Date): boolean {
  if (!value) return false;
  const iso = value.length === 10 ? `${value}T23:59:59.000Z` : value;
  return new Date(iso).getTime() <= now.getTime();
}

/** Nenhuma destas verificações tem valor por omissão permissivo. */
export function evaluateAcceptance(input: AcceptanceInput): AcceptanceResult {
  const now = input.now ?? new Date();
  const { quote, version } = input;

  if (quote.status === "cancelled") return { ok: false, code: "quote_cancelled", reason: "Esta cotação foi cancelada." };
  if (quote.status === "superseded" || version.status === "superseded") {
    return { ok: false, code: "quote_superseded", reason: "Existe uma versão mais recente desta cotação." };
  }
  if (quote.current_version_id && quote.current_version_id !== version.id) {
    return { ok: false, code: "quote_superseded", reason: "Existe uma versão mais recente desta cotação." };
  }
  if (input.expectedVersionNumber != null && input.expectedVersionNumber !== version.version_number) {
    return { ok: false, code: "version_mismatch", reason: "A proposta foi atualizada. Reveja a versão mais recente." };
  }
  if (quote.accepted_at && quote.accepted_version_id === version.id && !quote.requires_reacceptance) {
    return { ok: true, alreadyAccepted: true, code: "already_accepted", reason: "Esta proposta já tinha sido aceite." };
  }
  if (expired(quote.public_token_expires_at, now)) {
    return { ok: false, code: "quote_expired", reason: "Esta ligação expirou." };
  }
  if (expired(version.valid_until, now) || quote.status === "expired") {
    return { ok: false, code: "quote_expired", reason: "Esta proposta está fora de validade." };
  }
  if (input.productVersionStatus === "archived") {
    return { ok: false, code: "product_version_archived", reason: "Este pacote já não está disponível." };
  }
  if (version.confirmable === false) {
    return { ok: false, code: "not_confirmable", reason: "Esta proposta precisa de ser revista antes de ser aceite." };
  }
  return { ok: true };
}

/**
 * Tolerância de re-aceitação: qualquer subida de preço obriga a nova
 * aceitação. Descidas dentro da tolerância seguem sem incomodar o cliente.
 */
export const REACCEPTANCE_TOLERANCE = { increasePct: 0, decreasePct: 100 };

export type RevalidationOutcome =
  | "unchanged"
  | "changed_within_tolerance"
  | "changed_requires_reacceptance"
  | "blocked";

export interface RevalidationInput {
  previousPrice: number;
  newPrice: number;
  pricingStatus: "estimated" | "confirmed" | "requires_review";
  policyActive: boolean;
  blockingReasons: string[];
  flightPresent?: boolean;
  flightAvailable?: boolean;
  flightExpired?: boolean;
  marginBelowMinimum?: boolean;
  tolerance?: { increasePct: number; decreasePct: number };
}

export interface RevalidationDecision {
  outcome: RevalidationOutcome;
  changed: boolean;
  difference: number;
  differencePct: number | null;
  requiresReacceptance: boolean;
  canCreateBooking: boolean;
  reasons: string[];
}

export function evaluateRevalidation(input: RevalidationInput): RevalidationDecision {
  const tolerance = input.tolerance ?? REACCEPTANCE_TOLERANCE;
  const difference = Number((input.newPrice - input.previousPrice).toFixed(2));
  const changed = Math.abs(difference) > 0.01;
  const differencePct = input.previousPrice > 0
    ? Number(((difference / input.previousPrice) * 100).toFixed(2))
    : null;

  const reasons = [...input.blockingReasons];
  if (!input.policyActive) reasons.push("Não existe política de preços ativa.");
  if (input.pricingStatus === "requires_review") reasons.push("O cálculo de preço requer revisão.");
  if (input.marginBelowMinimum) reasons.push("A margem ficou abaixo do mínimo da política.");
  if (input.flightPresent && input.flightAvailable === false) reasons.push("A oferta de voo deixou de estar disponível.");
  if (input.flightPresent && input.flightExpired) reasons.push("A oferta de voo expirou.");

  const unique = [...new Set(reasons)];
  if (unique.length > 0) {
    return {
      outcome: "blocked", changed, difference, differencePct,
      requiresReacceptance: false, canCreateBooking: false, reasons: unique,
    };
  }
  if (!changed) {
    return { outcome: "unchanged", changed: false, difference: 0, differencePct: 0, requiresReacceptance: false, canCreateBooking: true, reasons: [] };
  }

  const pct = differencePct ?? 0;
  const within = difference > 0
    ? pct <= tolerance.increasePct
    : Math.abs(pct) <= tolerance.decreasePct;

  return within
    ? { outcome: "changed_within_tolerance", changed: true, difference, differencePct, requiresReacceptance: false, canCreateBooking: true, reasons: [] }
    : {
        outcome: "changed_requires_reacceptance", changed: true, difference, differencePct,
        requiresReacceptance: true, canCreateBooking: false,
        reasons: ["O preço mudou face à proposta aceite. É necessária nova aceitação."],
      };
}

/** Mesma versão aceite = mesma chave = nunca duas reservas ativas. */
export function packageBookingIdempotencyKey(quoteVersionId: string): string {
  return `pb_${quoteVersionId}`;
}

/** Estado inicial do voo: só refletir o que foi verificado, nunca hold/ordem. */
export function initialFlightStatus(input: { present: boolean; revalidated: boolean }): BookingFlightStatus {
  if (!input.present) return "none";
  return input.revalidated ? "revalidated" : "selected";
}

export interface PublicBookingView {
  bookingNumber: string;
  productName: string | null;
  departureDate: string | null;
  returnDate: string | null;
  durationDays: number | null;
  totalPrice: number;
  currency: string;
  status: PackageBookingStatus;
  statusLabel: string;
  paymentStatus: BookingPaymentStatus;
  paymentStatusLabel: string;
  nextSteps: string[];
}

/** Só informação que o cliente pode ver. Sem custos, margens nem UUIDs. */
export function sanitizeBookingForCustomer(input: {
  booking: Record<string, any>;
  productName?: string | null;
  criteria?: Record<string, any> | null;
}): PublicBookingView {
  const c = input.criteria ?? {};
  const status = (isBookingStatus(input.booking.booking_status) ? input.booking.booking_status : "draft") as PackageBookingStatus;
  const payment = (isPaymentStatus(input.booking.payment_status) ? input.booking.payment_status : "none") as BookingPaymentStatus;
  return {
    bookingNumber: String(input.booking.booking_number ?? ""),
    productName: input.productName ?? null,
    departureDate: (c.departureDate ?? c.departure_date ?? null) as string | null,
    returnDate: (c.returnDate ?? c.return_date ?? null) as string | null,
    durationDays: c.durationDays ?? c.duration_days ?? null,
    totalPrice: Number(input.booking.confirmed_price ?? 0),
    currency: String(input.booking.currency ?? "EUR"),
    status,
    statusLabel: BOOKING_STATUS_LABEL[status],
    paymentStatus: payment,
    paymentStatusLabel: PAYMENT_STATUS_LABEL[payment],
    nextSteps: [
      "A equipa da Rotas do Éden vai confirmar a disponibilidade com os parceiros locais.",
      "Depois disso receberá as instruções de pagamento.",
      "A reserva só fica confirmada após pagamento e confirmação dos parceiros.",
    ],
  };
}
