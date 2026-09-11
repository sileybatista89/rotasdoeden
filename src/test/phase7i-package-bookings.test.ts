import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
  FLIGHT_STATUSES,
  FLIGHT_STATUS_LABEL,
  FORBIDDEN_BOOKING_PUBLIC_FIELDS,
  OPERATIONS_STATUSES,
  OPERATIONS_STATUS_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  SUPPLIER_CONFIRMATION_STATUSES,
  SUPPLIER_CONFIRMATION_STATUS_LABEL,
  confirmedPriceFromVersion,
  isBookingStatus,
  isFlightStatus,
  isFullyConfirmed,
  isOperationsStatus,
  isPaymentStatus,
  rejectForbiddenBookingInput,
  snapshotItemsFromQuote,
} from "@/lib/packageBookings";

describe("Fase 7I — estados separados", () => {
  it("mantém quatro eixos de estado independentes", () => {
    expect(BOOKING_STATUSES).not.toEqual(FLIGHT_STATUSES);
    expect(PAYMENT_STATUSES).not.toEqual(OPERATIONS_STATUSES);
    for (const list of [BOOKING_STATUSES, FLIGHT_STATUSES, PAYMENT_STATUSES, OPERATIONS_STATUSES]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("tem etiqueta em português para todos os estados", () => {
    BOOKING_STATUSES.forEach((s) => expect(BOOKING_STATUS_LABEL[s]).toBeTruthy());
    FLIGHT_STATUSES.forEach((s) => expect(FLIGHT_STATUS_LABEL[s]).toBeTruthy());
    PAYMENT_STATUSES.forEach((s) => expect(PAYMENT_STATUS_LABEL[s]).toBeTruthy());
    OPERATIONS_STATUSES.forEach((s) => expect(OPERATIONS_STATUS_LABEL[s]).toBeTruthy());
    SUPPLIER_CONFIRMATION_STATUSES.forEach((s) => expect(SUPPLIER_CONFIRMATION_STATUS_LABEL[s]).toBeTruthy());
  });

  it("valida estados desconhecidos", () => {
    expect(isBookingStatus("confirmed")).toBe(true);
    expect(isBookingStatus("qualquer")).toBe(false);
    expect(isFlightStatus("ticketed")).toBe(true);
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isOperationsStatus("ready")).toBe(true);
    expect(isOperationsStatus("paid")).toBe(false);
  });

  it("não considera confirmada uma reserva paga sem operações prontas", () => {
    expect(isFullyConfirmed({ booking: "paid", payment: "paid", flight: "ticketed", operations: "preparing" })).toBe(false);
    expect(isFullyConfirmed({ booking: "confirmed", payment: "pending", flight: "ticketed", operations: "ready" })).toBe(false);
    expect(isFullyConfirmed({ booking: "confirmed", payment: "paid", flight: "held", operations: "ready" })).toBe(false);
    expect(isFullyConfirmed({ booking: "confirmed", payment: "paid", flight: "ticketed", operations: "ready" })).toBe(true);
    expect(isFullyConfirmed({ booking: "confirmed", payment: "paid", flight: "none", operations: "ready" })).toBe(true);
  });
});

describe("Fase 7I — segurança de dados", () => {
  it("rejeita preços e estados enviados pelo cliente", () => {
    expect(rejectForbiddenBookingInput({ quote_id: "q1" })).toEqual([]);
    expect(rejectForbiddenBookingInput({ confirmed_price: 10, markup: 2 })).toEqual(
      expect.arrayContaining(["confirmed_price", "markup"]),
    );
  });

  it("marca custos, fornecedores e fontes como nunca públicos", () => {
    ["unit_cost", "total_cost", "supplier_id", "rate_id", "source_type", "internal_notes"].forEach((f) =>
      expect(FORBIDDEN_BOOKING_PUBLIC_FIELDS).toContain(f),
    );
  });
});

describe("Fase 7I — fotografia da cotação", () => {
  const quoteItems = [
    {
      id: "qi-1", line_order: 0, component_id: "c1", rate_id: "r1", supplier_id: "s1",
      supplier_name: "Fornecedor A", display_name: "Alojamento 3 noites", component_type: "accommodation",
      quantity: 3, unit: "night", unit_cost: 80, total_cost: 240, selling_price: 300, currency: "EUR",
      rate_kind: "negotiated", source_type: "supplier_quote", source_reference: "email-2026-01",
      rate_valid_from: "2026-01-01", rate_valid_until: "2026-12-31", validity_unknown: false,
      cancellation_type: "flexible", cancellation_summary: "Grátis até 7 dias antes", estimated: false,
    },
    { id: "qi-2", display_name: "Transfer", component_type: "transfer" },
  ];

  it("copia valores e não apenas referências", () => {
    const snap = snapshotItemsFromQuote(quoteItems);
    expect(snap).toHaveLength(2);
    expect(snap[0]).toMatchObject({
      quote_item_id: "qi-1", supplier_name: "Fornecedor A", unit_cost: 80,
      total_cost: 240, selling_price: 300, rate_valid_until: "2026-12-31",
      cancellation_summary: "Grátis até 7 dias antes", estimated: false,
    });
    expect(snap[1].line_order).toBe(1);
    expect(snap[1].quantity).toBe(0);
    expect(snap[1].estimated).toBe(false);
  });

  it("usa apenas o preço guardado na versão da cotação", () => {
    const r = confirmedPriceFromVersion({ total_price: 1234.5, total_cost: 900, sale_currency: "EUR", client_price: 1 });
    expect(r).toEqual({ price: 1234.5, cost: 900, currency: "EUR" });
    expect(confirmedPriceFromVersion({})).toEqual({ price: 0, cost: 0, currency: "EUR" });
  });

  it("aceita cotações sem linhas", () => {
    expect(snapshotItemsFromQuote([])).toEqual([]);
    expect(snapshotItemsFromQuote(undefined as unknown as [])).toEqual([]);
  });
});
