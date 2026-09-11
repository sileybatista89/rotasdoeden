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
