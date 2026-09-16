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
  evaluateAcceptance,
  evaluateRevalidation,
  initialFlightStatus,
  packageBookingIdempotencyKey,
  sanitizeBookingForCustomer,
} from "@/lib/packageBookings";

describe("Fase 7I, estados separados", () => {
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

describe("Fase 7I, segurança de dados", () => {
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

describe("Fase 7I, fotografia da cotação", () => {
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

// ===== Fase 7I passos 2-4: aceitação, revalidação e criação =====
describe("Fase 7I, aceitação da cotação", () => {
  const base = {
    quote: { status: "sent", current_version_id: "v1", accepted_at: null, accepted_version_id: null, requires_reacceptance: false, public_token_expires_at: "2999-01-01T00:00:00Z" },
    version: { id: "v1", version_number: 3, status: "calculated", valid_until: "2999-01-01T00:00:00Z", confirmable: true },
  };

  it("aceita uma proposta válida e confirmável", () => {
    expect(evaluateAcceptance({ ...base, expectedVersionNumber: 3 }).ok).toBe(true);
  });

  it("recusa se o cliente estiver a ver uma versão antiga", () => {
    const r = evaluateAcceptance({ ...base, expectedVersionNumber: 2 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("version_mismatch");
  });

  it("recusa proposta fora de validade", () => {
    const r = evaluateAcceptance({ ...base, version: { ...base.version, valid_until: "2020-01-01T00:00:00Z" } });
    expect(r.code).toBe("quote_expired");
  });

  it("recusa proposta não confirmável", () => {
    const r = evaluateAcceptance({ ...base, version: { ...base.version, confirmable: false } });
    expect(r.code).toBe("not_confirmable");
  });

  it("recusa cotação cancelada ou substituída", () => {
    expect(evaluateAcceptance({ ...base, quote: { ...base.quote, status: "cancelled" } }).code).toBe("quote_cancelled");
    expect(evaluateAcceptance({ ...base, quote: { ...base.quote, current_version_id: "v2" } }).code).toBe("quote_superseded");
  });

  it("recusa pacote arquivado", () => {
    expect(evaluateAcceptance({ ...base, productVersionStatus: "archived" }).code).toBe("product_version_archived");
  });

  it("aceitação repetida da mesma versão é idempotente", () => {
    const r = evaluateAcceptance({
      ...base,
      quote: { ...base.quote, accepted_at: "2026-01-01T00:00:00Z", accepted_version_id: "v1" },
    });
    expect(r.ok).toBe(true);
    expect(r.alreadyAccepted).toBe(true);
  });
});

describe("Fase 7I, revalidação final", () => {
  const ok = { previousPrice: 1000, newPrice: 1000, pricingStatus: "confirmed" as const, policyActive: true, blockingReasons: [] };

  it("sem alteração permite criar reserva", () => {
    const d = evaluateRevalidation(ok);
    expect(d.outcome).toBe("unchanged");
    expect(d.canCreateBooking).toBe(true);
  });

  it("qualquer subida de preço exige nova aceitação", () => {
    const d = evaluateRevalidation({ ...ok, newPrice: 1000.5 });
    expect(d.outcome).toBe("changed_requires_reacceptance");
    expect(d.canCreateBooking).toBe(false);
    expect(d.requiresReacceptance).toBe(true);
  });

  it("descida de preço não incomoda o cliente", () => {
    const d = evaluateRevalidation({ ...ok, newPrice: 900 });
    expect(d.outcome).toBe("changed_within_tolerance");
    expect(d.difference).toBe(-100);
    expect(d.canCreateBooking).toBe(true);
  });

  it("bloqueia sem política ativa", () => {
    const d = evaluateRevalidation({ ...ok, policyActive: false });
    expect(d.outcome).toBe("blocked");
    expect(d.canCreateBooking).toBe(false);
  });

  it("bloqueia com preço a rever ou margem abaixo do mínimo", () => {
    expect(evaluateRevalidation({ ...ok, pricingStatus: "requires_review" }).outcome).toBe("blocked");
    expect(evaluateRevalidation({ ...ok, marginBelowMinimum: true }).outcome).toBe("blocked");
  });

  it("bloqueia quando o voo deixou de estar disponível ou expirou", () => {
    expect(evaluateRevalidation({ ...ok, flightPresent: true, flightAvailable: false }).outcome).toBe("blocked");
    expect(evaluateRevalidation({ ...ok, flightPresent: true, flightExpired: true }).outcome).toBe("blocked");
  });

  it("propaga bloqueios de confirmabilidade sem os duplicar", () => {
    const d = evaluateRevalidation({ ...ok, blockingReasons: ["Tarifa expirada.", "Tarifa expirada."] });
    expect(d.reasons).toEqual(["Tarifa expirada."]);
  });
});

describe("Fase 7I, criação da reserva", () => {
  it("a chave de idempotência depende da versão aceite", () => {
    expect(packageBookingIdempotencyKey("abc")).toBe("pb_abc");
    expect(packageBookingIdempotencyKey("abc")).toBe(packageBookingIdempotencyKey("abc"));
    expect(packageBookingIdempotencyKey("abc")).not.toBe(packageBookingIdempotencyKey("def"));
  });

  it("o estado inicial do voo nunca é hold nem emitido", () => {
    expect(initialFlightStatus({ present: false, revalidated: true })).toBe("none");
    expect(initialFlightStatus({ present: true, revalidated: false })).toBe("selected");
    expect(initialFlightStatus({ present: true, revalidated: true })).toBe("revalidated");
  });

  it("a vista do cliente não expõe custos, fornecedores nem margens", () => {
    const view = sanitizeBookingForCustomer({
      booking: {
        booking_number: "PKG-1", confirmed_price: 2500, confirmed_cost: 1800, currency: "EUR",
        booking_status: "awaiting_payment", payment_status: "pending",
      },
      productName: "Rotas Essencial",
      criteria: { departureDate: "2026-05-01", durationDays: 7 },
    });
    const serialized = JSON.stringify(view);
    expect(view.totalPrice).toBe(2500);
    expect(serialized).not.toContain("1800");
    ["confirmed_cost", "supplier", "margin", "markup"].forEach((f) => expect(serialized).not.toContain(f));
    expect(view.nextSteps.length).toBeGreaterThan(0);
  });
});
