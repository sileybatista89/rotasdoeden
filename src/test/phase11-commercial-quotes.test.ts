import { describe, expect, it } from "vitest";
import {
  calculatePricing, rateProvenance,
  type PricingComponentInput, type PricingPolicyVersion, type RateCandidate,
} from "@/lib/pricing";
import { evaluateConfirmability, sanitizeQuoteForCustomer } from "@/lib/quotes";
import {
  DuffelStaysProvider, StaysProviderError, isStayRateExpired, nightsBetween,
  normalizeDuffelStayRate, toRatePerNight, validateStaysSearch,
} from "@/lib/accommodationProvider";

function policy(overrides: Partial<PricingPolicyVersion> = {}): PricingPolicyVersion {
  return {
    id: "v1", policyId: "p1", versionNumber: 1, status: "active", baseCurrency: "EUR",
    marginMode: "markup", minMarginPct: 0, targetMarginPct: 0,
    componentRules: {}, flightProtection: { method: "percentage", value: 0 },
    fees: [], supplements: [], operationalCosts: [], roundingMode: "none",
    ...overrides,
  };
}

function rate(overrides: Partial<RateCandidate> = {}): RateCandidate {
  return {
    id: "r1", kind: "supplier_cost", status: "confirmed", price: 100, currency: "EUR",
    unit: "fixed", quantity: 1, validFrom: "2026-01-01", validUntil: "2026-12-31",
    validityUnknown: false, sourceType: "supplier_contract", observedAt: "2026-01-01",
    ...overrides,
  };
}

function component(overrides: Partial<PricingComponentInput> = {}): PricingComponentInput {
  return { id: "c1", name: "Componente", componentType: "other", rates: [rate()], ...overrides };
}

const BASE = { durationDays: 7, nights: 6, adults: 2, children: 0, rooms: 1, referenceDate: "2026-06-01" };

describe("Fase 11 — proveniência de cada linha", () => {
  it("preço de mercado observado nunca é classificado como confirmado", () => {
    const marketRate = rate({ kind: "market_observed_price", status: "observed", sourceType: "official_website" });
    expect(rateProvenance(marketRate, "2026-06-01")).toBe("market_observed");
    expect(rateProvenance(marketRate, "2026-06-01")).not.toBe("confirmed");
  });

  it("tarifa de fornecedor confirmada é confirmada", () => {
    expect(rateProvenance(rate(), "2026-06-01")).toBe("confirmed");
  });

  it("tarifa expirada ou fora de validade é marcada como expirada", () => {
    expect(rateProvenance(rate({ status: "expired" }), "2026-06-01")).toBe("expired");
    expect(rateProvenance(rate({ validUntil: "2026-02-01" }), "2026-06-01")).toBe("expired");
  });

  it("ausência de tarifa é indisponível", () => {
    expect(rateProvenance(null)).toBe("unavailable");
  });
});

describe("Fase 11 — base comercial da proposta", () => {
  it("proposta só com tarifas de fornecedor é confirmada", () => {
    const res = calculatePricing({ policy: policy(), components: [component()], ...BASE });
    expect(res.basis).toBe("confirmed");
    expect(res.requiresValidation).toBe(false);
    expect(res.components[0].provenance).toBe("confirmed");
  });

  it("proposta com preço de mercado é utilizável mas exige revalidação", () => {
    const res = calculatePricing({
      policy: policy(),
      components: [component({
        componentType: "accommodation",
        rates: [rate({ kind: "market_observed_price", status: "observed", sourceType: "official_website" })],
      })],
      ...BASE,
    });
    expect(res.basis).toBe("market_based");
    expect(res.requiresValidation).toBe(true);
    expect(res.finalPrice).toBeGreaterThan(0);
    expect(res.warnings.join(" ")).toContain("revalidação");
  });

  it("tarifa expirada ou sem validade não entra no total e bloqueia", () => {
    const expired = calculatePricing({
      policy: policy(),
      components: [component({ rates: [rate({ validUntil: "2026-02-01" })] })],
      ...BASE,
    });
    expect(expired.basis).toBe("insufficient");
    expect(expired.finalPrice).toBe(0);
    expect(expired.validationErrors.length).toBeGreaterThan(0);

    const unknown = calculatePricing({
      policy: policy(),
      components: [component({ rates: [rate({ validityUnknown: true, validUntil: null })] })],
      ...BASE,
    });
    expect(unknown.finalPrice).toBe(0);
    expect(unknown.components[0].provenance).toBe("unavailable");
  });

  it("subtotais por categoria somam o custo e o preço de cada tipo", () => {
    const res = calculatePricing({
      policy: policy(),
      components: [
        component({ id: "a", componentType: "accommodation", rates: [rate({ id: "ra", price: 200 })] }),
        component({ id: "t", componentType: "transfer", rates: [rate({ id: "rt", price: 50 })] }),
      ],
      ...BASE,
    });
    const acc = res.categorySubtotals.find((c) => c.componentType === "accommodation");
    const tra = res.categorySubtotals.find((c) => c.componentType === "transfer");
    expect(acc?.cost).toBe(200);
    expect(tra?.cost).toBe(50);
    expect(res.categorySubtotals.reduce((s, c) => s + c.cost, 0)).toBeCloseTo(250, 6);
  });
});

describe("Fase 11 — confirmabilidade e revalidação", () => {
  const base = { validationErrors: [], policyActive: true, rates: [], now: new Date("2026-06-01T00:00:00Z") };

  it("proposta de mercado não é bloqueada mas exige validação explícita", () => {
    const r = evaluateConfirmability({
      ...base, pricingStatus: "estimated", basis: "market_based", allowMarketBased: true,
    });
    expect(r.confirmable).toBe(true);
    expect(r.validationRequired.join(" ")).toContain("revalidar");
  });

  it("sem autorização de base de mercado o cálculo estimado continua bloqueado", () => {
    const r = evaluateConfirmability({ ...base, pricingStatus: "estimated", basis: "market_based" });
    expect(r.confirmable).toBe(false);
    expect(r.blockingReasons.length).toBeGreaterThan(0);
  });

  it("cotação fora de validade bloqueia mesmo em base de mercado", () => {
    const r = evaluateConfirmability({
      ...base, pricingStatus: "estimated", basis: "market_based", allowMarketBased: true,
      validUntil: "2026-05-01T00:00:00Z",
    });
    expect(r.confirmable).toBe(false);
  });

  it("tarifa sem validade conhecida bloqueia sempre", () => {
    const r = evaluateConfirmability({
      ...base, pricingStatus: "confirmed", basis: "confirmed",
      rates: [{ validityUnknown: true }], allowMarketBased: true,
    });
    expect(r.confirmable).toBe(false);
  });
});

describe("Fase 11 — nada de custo de fornecedor para o visitante", () => {
  it("a versão do cliente não expõe custos nem proveniência interna", () => {
    const publicQuote = sanitizeQuoteForCustomer({
      quote: { id: "q1", quote_number: "Q-1", status: "sent", sale_currency: "EUR", expires_at: null },
      version: {
        total_price: 1000, total_cost: 700, sale_currency: "EUR", valid_until: null,
        confirmable: true, warnings: [], blocking_reasons: [],
      },
      items: [{
        display_name: "Alojamento", component_type: "accommodation", quantity: 6,
        selling_price: 1000, total_cost: 700, unit_cost: 116, supplier_id: "s1",
        rate_kind: "market_observed_price", source_type: "official_website", provenance: "market_observed",
      }],
    } as never);
    const raw = JSON.stringify(publicQuote);
    expect(raw).not.toContain("700");
    expect(raw).not.toContain("supplier_id");
    expect(raw).not.toContain("market_observed_price");
  });
});

describe("Fase 11 — Duffel Stays sem reserva live", () => {
  it("sem credencial e sem flag o fornecedor está desativado", () => {
    const p = new DuffelStaysProvider({ apiKey: null });
    expect(p.isConfigured()).toBe(false);
    expect(p.isEnabled()).toBe(false);
  });

  it("credencial sem flag continua desativado", () => {
    const p = new DuffelStaysProvider({ apiKey: "tok", enabled: false });
    expect(p.isConfigured()).toBe(true);
    expect(p.isEnabled()).toBe(false);
  });

  it("criar reserva é sempre rejeitado", async () => {
    const p = new DuffelStaysProvider({ apiKey: "tok", enabled: true });
    await expect(p.createBooking()).rejects.toBeInstanceOf(StaysProviderError);
  });

  it("pesquisa inválida é rejeitada antes de sair para o fornecedor", () => {
    expect(() => validateStaysSearch({ checkIn: "2026-06-10", checkOut: "2026-06-05", adults: 2, latitude: 0.3, longitude: 6.7 })).toThrow();
    expect(() => validateStaysSearch({ checkIn: "2026-06-01", checkOut: "2026-06-05", adults: 0, latitude: 0.3, longitude: 6.7 })).toThrow();
    expect(() => validateStaysSearch({ checkIn: "2026-06-01", checkOut: "2026-06-05", adults: 2 })).toThrow();
    const ok = validateStaysSearch({ checkIn: "2026-06-01", checkOut: "2026-06-05", adults: 2, latitude: 0.3, longitude: 6.7 });
    expect(ok.rooms).toBe(1);
  });

  it("o preço público do fornecedor nunca substitui o custo", () => {
    const r = normalizeDuffelStayRate({
      id: "rat_1", total_amount: "480.00", total_currency: "eur", public_amount: "600.00", public_currency: "eur",
      board_type: "breakfast", cancellation_timeline: [], expires_at: "2026-06-01T10:00:00Z",
    });
    expect(r.totalAmount).toBe(480);
    expect(r.publicAmount).toBe(600);
    expect(r.cancellationType).toBe("unknown");
    expect(toRatePerNight({ totalAmount: r.totalAmount }, 4, 1)).toBe(120);
  });

  it("tarifa expirada do fornecedor é detetada", () => {
    expect(isStayRateExpired({ expiresAt: "2020-01-01T00:00:00Z" })).toBe(true);
    expect(isStayRateExpired({ expiresAt: null })).toBe(false);
    expect(nightsBetween("2026-06-01", "2026-06-05")).toBe(4);
  });
});
