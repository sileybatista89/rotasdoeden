import { describe, expect, it } from "vitest";
import {
  MARKET_OBSERVATION_MAX_AGE_DAYS,
  calculatePricing, classifyRateEligibility, commercialStateFromBasis,
  normalizeMarketObservation, rateProvenance,
  type PricingComponentInput, type PricingPolicyVersion, type RateCandidate,
} from "@/lib/pricing";
import { evaluateConfirmability, sanitizeQuoteForCustomer } from "@/lib/quotes";
import { DuffelStaysProvider, StaysProviderError } from "@/lib/accommodationProvider";

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
    validityUnknown: false, sourceType: "supplier_contract", observedAt: "2026-05-01",
    ...overrides,
  };
}

function marketRate(overrides: Partial<RateCandidate> = {}): RateCandidate {
  return rate({
    id: "m1", kind: "market_observed_price", status: "observed",
    sourceType: "official_website", observedAt: "2026-05-20",
    validFrom: null, validUntil: null, validityUnknown: true,
    ...overrides,
  });
}

function component(overrides: Partial<PricingComponentInput> = {}): PricingComponentInput {
  return { id: "c1", name: "Componente", componentType: "other", rates: [rate()], ...overrides };
}

const BASE = { durationDays: 7, nights: 6, adults: 2, children: 0, rooms: 1, referenceDate: "2026-06-01" };

describe("Fase 12, elegibilidade do preço de mercado observado", () => {
  it("preço público com fonte e data de observação é elegível para proposta indicativa", () => {
    const res = classifyRateEligibility(marketRate(), "2026-06-01");
    expect(res.eligibility).toBe("indicative");
  });

  it("preço de mercado nunca é confirmado/reservável", () => {
    expect(classifyRateEligibility(marketRate(), "2026-06-01").eligibility).not.toBe("confirmed_bookable");
    expect(rateProvenance(marketRate(), "2026-06-01")).toBe("market_observed");
  });

  it("tarifa de fornecedor confirmada com validade conhecida é reservável", () => {
    expect(classifyRateEligibility(rate(), "2026-06-01").eligibility).toBe("confirmed_bookable");
  });

  it("sem fonte ou sem data de observação não é elegível", () => {
    expect(classifyRateEligibility(marketRate({ sourceType: null }), "2026-06-01").eligibility).toBe("ineligible");
    expect(classifyRateEligibility(marketRate({ observedAt: null }), "2026-06-01").eligibility).toBe("ineligible");
  });

  it("observação demasiado antiga deixa de ser elegível", () => {
    const old = marketRate({ observedAt: "2024-01-01" });
    expect(MARKET_OBSERVATION_MAX_AGE_DAYS).toBeGreaterThan(0);
    expect(classifyRateEligibility(old, "2026-06-01").eligibility).toBe("ineligible");
  });

  it("tarifa expirada ou fora de validade não é elegível", () => {
    expect(classifyRateEligibility(rate({ status: "expired" }), "2026-06-01").eligibility).toBe("ineligible");
    expect(classifyRateEligibility(rate({ validUntil: "2026-02-01" }), "2026-06-01").eligibility).toBe("ineligible");
  });

  it("tarifa de fornecedor sem validade conhecida não é elegível", () => {
    const unknown = rate({ validFrom: null, validUntil: null, validityUnknown: true });
    expect(classifyRateEligibility(unknown, "2026-06-01").eligibility).toBe("ineligible");
  });
});

describe("Fase 12, proposta indicativa com preços de mercado", () => {
  it("alojamento só com preço de mercado gera cálculo com estado market_based_pricing", () => {
    const res = calculatePricing({
      policy: policy(),
      components: [component({
        id: "acc", name: "Alojamento", componentType: "accommodation",
        rates: [marketRate({ price: 200, unit: "per_night" })],
      })],
      ...BASE,
    });
    expect(res.costTotal).toBeGreaterThan(0);
    expect(res.basis).toBe("market_based");
    expect(res.commercialState).toBe("market_based_pricing");
    expect(res.requiresValidation).toBe(true);
    expect(res.components[0].provenance).toBe("market_observed");
  });

  it("mistura de tarifa confirmada e preço de mercado fica market_based com origens distintas", () => {
    const res = calculatePricing({
      policy: policy(),
      components: [
        component({ id: "acc", name: "Alojamento", componentType: "accommodation", rates: [marketRate({ price: 200, unit: "per_night" })] }),
        component({ id: "tr", name: "Transfer", componentType: "transfer", rates: [rate({ id: "r2", price: 50 })] }),
      ],
      ...BASE,
    });
    const provenances = res.components.map((l) => l.provenance);
    expect(provenances).toContain("market_observed");
    expect(provenances).toContain("confirmed");
    expect(res.commercialState).toBe("market_based_pricing");
  });

  it("proposta só com tarifas confirmadas fica confirmed_pricing", () => {
    const res = calculatePricing({ policy: policy(), components: [component()], ...BASE });
    expect(res.commercialState).toBe("confirmed_pricing");
    expect(res.requiresValidation).toBe(false);
  });

  it("componente sem tarifa elegível não vira preço zero silencioso", () => {
    const res = calculatePricing({
      policy: policy(),
      components: [component({ id: "x", name: "Experiência", componentType: "experience", rates: [] })],
      ...BASE,
    });
    expect(res.validationErrors.length).toBeGreaterThan(0);
    expect(res.components[0].provenance).toBe("unavailable");
    expect(res.basis).toBe("insufficient");
    expect(res.commercialState).toBe("pending_validation");
  });

  it("tarifa expirada fica fora do total", () => {
    const res = calculatePricing({
      policy: policy(),
      components: [component({ rates: [rate({ validUntil: "2026-02-01" })] })],
      ...BASE,
    });
    expect(res.costTotal).toBe(0);
    expect(res.validationErrors.length).toBeGreaterThan(0);
  });
});

describe("Fase 12, Quote Engine existente continua a decidir a confirmação", () => {
  it("proposta de mercado é utilizável mas exige revalidação", () => {
    const res = evaluateConfirmability({
      policyActive: true, pricingStatus: "estimated", validationErrors: [], rates: [],
      basis: "market_based", allowMarketBased: true,
    } as never);
    expect(res.validationRequired.length).toBeGreaterThan(0);
    expect(res.confirmable).toBe(true);
  });

  it("estado comercial deriva da base do Pricing Engine existente", () => {
    expect(commercialStateFromBasis("confirmed")).toBe("confirmed_pricing");
    expect(commercialStateFromBasis("market_based")).toBe("market_based_pricing");
    expect(commercialStateFromBasis("insufficient")).toBe("pending_validation");
  });

  it("o cliente nunca vê custo de fornecedor nem origem interna", () => {
    const sanitized = JSON.stringify(sanitizeQuoteForCustomer({
      quote: { id: "q1", quote_number: "Q-1", status: "sent" },
      version: { total_price: 1000, sale_currency: "EUR", total_cost: 600, commercial_state: "market_based_pricing" },
      items: [{ display_name: "Alojamento", selling_price: 600, total_cost: 400, supplier_id: "s1", rate_kind: "market_observed_price", provenance: "market_observed" }],
    } as never));
    expect(sanitized).not.toContain("total_cost");
    expect(sanitized).not.toContain("supplier_id");
    expect(sanitized).not.toContain("market_observed");
  });
});

describe("Fase 12, normalização de observações de mercado", () => {
  it("calcula o valor por noite sem perder o total nem a moeda", () => {
    const n = normalizeMarketObservation({ totalObservedAmount: 600, observedNights: 3, currency: "usd" });
    expect(n.nightlyAmount).toBe(200);
    expect(n.totalAmount).toBe(600);
    expect(n.nights).toBe(3);
    expect(n.currency).toBe("USD");
  });

  it("rejeita observações incompletas", () => {
    expect(() => normalizeMarketObservation({ totalObservedAmount: 0, observedNights: 3, currency: "EUR" })).toThrow();
    expect(() => normalizeMarketObservation({ totalObservedAmount: 600, observedNights: 0, currency: "EUR" })).toThrow();
  });
});

describe("Fase 12, Duffel Stays continua em espera de acesso", () => {
  it("sem credenciais o fornecedor fica indisponível sem quebrar o produto", async () => {
    const provider = new DuffelStaysProvider({ token: null, enabled: false, testMode: true } as never);
    await expect(provider.search({} as never)).rejects.toBeInstanceOf(StaysProviderError);
  });

  it("nunca cria reservas", async () => {
    const provider = new DuffelStaysProvider({ token: "test", enabled: true, testMode: true } as never);
    await expect((provider as unknown as { createBooking: () => Promise<unknown> }).createBooking()).rejects.toBeInstanceOf(StaysProviderError);
  });
});
