import { describe, expect, it } from "vitest";
import {
  QUOTE_STATUS_LABEL,
  canTransitionQuote,
  comparePrices,
  evaluateConfirmability,
  generatePublicToken,
  hashPublicToken,
  isExpired,
  quoteIdempotencyKey,
  rejectForbiddenClientInput,
  resolveQuoteValidity,
  sanitizeCriteria,
  sanitizeQuoteForCustomer,
  validateCriteria,
  FORBIDDEN_PUBLIC_FIELDS,
} from "@/lib/quotes";
import { applyMarkup, calculatePricing, grossMargin, type PricingPolicyVersion } from "@/lib/pricing";

const future = (days: number) => new Date(Date.now() + days * 864e5).toISOString();
const past = (days: number) => new Date(Date.now() - days * 864e5).toISOString();

const policy: PricingPolicyVersion = {
  id: "pv-1",
  policyId: "p-1",
  versionNumber: 3,
  status: "active",
  baseCurrency: "EUR",
  marginMode: "markup",
  minMarginPct: 10,
  targetMarginPct: 25,
  componentRules: { accommodation: { mode: "markup", value: 25 }, flight: { mode: "markup", value: 10 } },
  flightProtection: { method: "percentage", value: 0 },
  fees: [],
  supplements: [],
  operationalCosts: [],
  roundingMode: "none",
};

const baseCriteria = {
  origin: "Lisboa", origin_airport: "LIS", destination: "STP",
  departure_date: "2026-11-02", return_date: "2026-11-09",
  duration_days: 8, adults: 2, children: 0, rooms: 1,
};

function pricedPackage() {
  return calculatePricing({
    policy,
    durationDays: 8,
    nights: 7,
    adults: 2,
    referenceDate: "2026-11-02",
    components: [{
      id: "c1", name: "Hotel Praia", componentType: "accommodation",
      rates: [{
        id: "r1", kind: "negotiated_rotas_rate", status: "confirmed", price: 100, currency: "EUR",
        unit: "per_night", sourceType: "contract", observedAt: "2026-10-01", validFrom: "2026-01-01", validUntil: "2026-12-31",
      }],
    }],
  });
}

describe("7G, critérios do cliente", () => {
  it("guarda apenas critérios de viagem", () => {
    const c = sanitizeCriteria({ ...baseCriteria, passport: "X123", phone: "+239...", price: 999 });
    expect(Object.keys(c)).not.toContain("passport");
    expect(Object.keys(c)).not.toContain("phone");
    expect(Object.keys(c)).not.toContain("price");
    expect(c.adults).toBe(2);
    expect(c.originAirport).toBe("LIS");
  });

  it("valida duração, adultos e datas", () => {
    expect(validateCriteria(sanitizeCriteria(baseCriteria))).toEqual([]);
    expect(validateCriteria(sanitizeCriteria({ ...baseCriteria, adults: 0 })).length).toBe(1);
    expect(validateCriteria(sanitizeCriteria({ ...baseCriteria, duration_days: 0 })).length).toBe(1);
    expect(validateCriteria(sanitizeCriteria({ ...baseCriteria, return_date: "2026-10-01" })).length).toBe(1);
  });
});

describe("7G, validade limitada pelo elemento mais curto", () => {
  it("o voo limita quando expira primeiro", () => {
    const r = resolveQuoteValidity({
      operatorValidUntil: future(30), flightExpiresAt: future(2), rateValidUntil: ["2026-12-31"],
    });
    expect(r.limitedBy).toBe("flight_offer");
  });

  it("a tarifa limita quando é a mais curta", () => {
    const r = resolveQuoteValidity({
      operatorValidUntil: future(30), flightExpiresAt: future(20),
      rateValidUntil: [new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)],
    });
    expect(r.limitedBy).toBe("component_rate");
  });

  it("sem elementos não inventa validade", () => {
    expect(resolveQuoteValidity({}).validUntil).toBeNull();
  });

  it("deteta expiração", () => {
    expect(isExpired(past(1))).toBe(true);
    expect(isExpired(future(1))).toBe(false);
    expect(isExpired(null)).toBe(false);
  });
});

describe("7G, confirmabilidade", () => {
  const ok = {
    pricingStatus: "confirmed" as const, validationErrors: [], policyActive: true,
    rates: [{ validUntil: "2030-01-01", status: "confirmed" }], validUntil: future(5),
  };

  it("confirma quando tudo é válido", () => {
    expect(evaluateConfirmability(ok).confirmable).toBe(true);
  });

  it("voo expirado bloqueia", () => {
    const r = evaluateConfirmability({ ...ok, flight: { present: true, expiresAt: past(1) } });
    expect(r.confirmable).toBe(false);
    expect(r.blockingReasons.join(" ")).toContain("voo");
  });

  it("tarifa expirada bloqueia", () => {
    const r = evaluateConfirmability({ ...ok, rates: [{ validUntil: past(2), status: "confirmed" }] });
    expect(r.confirmable).toBe(false);
  });

  it("tarifa sem validade conhecida bloqueia", () => {
    const r = evaluateConfirmability({ ...ok, rates: [{ validityUnknown: true }] });
    expect(r.confirmable).toBe(false);
  });

  it("política inativa bloqueia", () => {
    expect(evaluateConfirmability({ ...ok, policyActive: false }).confirmable).toBe(false);
  });

  it("cálculo em revisão bloqueia e erros são propagados", () => {
    const r = evaluateConfirmability({ ...ok, pricingStatus: "requires_review", validationErrors: ["Margem mínima"] });
    expect(r.confirmable).toBe(false);
    expect(r.blockingReasons).toContain("Margem mínima");
  });

  it("custos estimados impedem confirmação", () => {
    expect(evaluateConfirmability({ ...ok, pricingStatus: "estimated" }).confirmable).toBe(false);
  });

  it("versão de produto arquivada bloqueia", () => {
    expect(evaluateConfirmability({ ...ok, productStatus: "archived" }).confirmable).toBe(false);
  });

  it("cotação fora de validade bloqueia", () => {
    expect(evaluateConfirmability({ ...ok, validUntil: past(1) }).confirmable).toBe(false);
  });
});

describe("7G, estados", () => {
  it("todas as etiquetas existem", () => {
    expect(Object.keys(QUOTE_STATUS_LABEL)).toHaveLength(8);
  });

  it("aceitação não é reserva nem pagamento", () => {
    expect(canTransitionQuote("sent", "accepted")).toBe(true);
    expect(canTransitionQuote("accepted", "sent")).toBe(false);
    expect(canTransitionQuote("cancelled", "accepted")).toBe(false);
    expect(canTransitionQuote("superseded", "calculated")).toBe(false);
  });

  it("rascunho só avança para calculada ou cancelada", () => {
    expect(canTransitionQuote("draft", "calculated")).toBe(true);
    expect(canTransitionQuote("draft", "accepted")).toBe(false);
  });
});

describe("7G, comparação de preço e versionamento", () => {
  it("deteta subida e calcula diferença", () => {
    const c = comparePrices(800, 850);
    expect(c.changed).toBe(true);
    expect(c.difference).toBe(50);
    expect(c.direction).toBe("up");
    expect(c.differencePct).toBeCloseTo(6.25, 2);
  });

  it("não sinaliza alteração dentro da tolerância", () => {
    expect(comparePrices(800, 800.004).changed).toBe(false);
  });

  it("deteta descida", () => {
    expect(comparePrices(900, 850).direction).toBe("down");
  });
});

describe("7G, idempotência", () => {
  it("mesmos critérios geram a mesma chave", () => {
    const a = quoteIdempotencyKey({ productVersionId: "pv", criteria: sanitizeCriteria(baseCriteria), componentIds: ["b", "a"], policyVersionId: "x" });
    const b = quoteIdempotencyKey({ productVersionId: "pv", criteria: sanitizeCriteria(baseCriteria), componentIds: ["a", "b"], policyVersionId: "x" });
    expect(a).toBe(b);
  });

  it("critérios diferentes geram chaves diferentes", () => {
    const a = quoteIdempotencyKey({ productVersionId: "pv", criteria: sanitizeCriteria(baseCriteria), componentIds: ["a"], policyVersionId: "x" });
    const b = quoteIdempotencyKey({ productVersionId: "pv", criteria: sanitizeCriteria({ ...baseCriteria, adults: 3 }), componentIds: ["a"], policyVersionId: "x" });
    expect(a).not.toBe(b);
  });

  it("voo diferente gera chave diferente", () => {
    const a = quoteIdempotencyKey({ productVersionId: "pv", criteria: sanitizeCriteria(baseCriteria), componentIds: [], flightOfferId: "off_1" });
    const b = quoteIdempotencyKey({ productVersionId: "pv", criteria: sanitizeCriteria(baseCriteria), componentIds: [], flightOfferId: "off_2" });
    expect(a).not.toBe(b);
  });
});

describe("7G, token público", () => {
  it("token é opaco, com 64 hex e não repetível", () => {
    const a = generatePublicToken();
    const b = generatePublicToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
  });

  it("o resumo é estável e diferente do token", async () => {
    const t = generatePublicToken();
    const h1 = await hashPublicToken(t);
    const h2 = await hashPublicToken(t);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(t);
    expect(await hashPublicToken(generatePublicToken())).not.toBe(h1);
  });
});

describe("7G, payload do cliente é sanitizado", () => {
  const quote = {
    quote_number: "Q-000001", status: "sent", sale_currency: "EUR",
    created_at: "2026-09-10T00:00:00Z", expires_at: future(3), notes: "nota interna",
  };
  const version = {
    version_number: 2, total_price: 3200, total_cost: 2400, sale_currency: "EUR",
    cost_currency: "EUR", policy_version_id: "pv-1", pricing_calculation_id: "calc-1",
    customer_criteria: baseCriteria, valid_until: future(3), flight_expires_at: future(1),
    flight_snapshot: { airline: "TAP", departure_date: "2026-11-02", total_amount: 800 },
  };
  const items = [{
    display_name: "Hotel Praia", quantity: 7, unit: "per_night", unit_cost: 100, total_cost: 700,
    selling_price: 875, supplier_id: "s1", supplier_name: "Hotel Lda", rate_kind: "negotiated_rotas_rate",
    source_type: "contract", rule_mode: "markup", rule_pct: 25, cancellation_summary: "Grátis até 7 dias antes",
  }];

  const payload = sanitizeQuoteForCustomer({ quote, version, items, productName: "Rotas Explorar" });
  const flat = JSON.stringify(payload);

  it("mostra apenas o preço final e as linhas legíveis", () => {
    expect(payload.totalPrice).toBe(3200);
    expect(payload.items[0].name).toBe("Hotel Praia");
    expect(payload.productName).toBe("Rotas Explorar");
  });

  it("nunca revela custo, fornecedor, margem, tarifa ou política", () => {
    for (const field of FORBIDDEN_PUBLIC_FIELDS) expect(flat).not.toContain(field);
    expect(flat).not.toContain("2400");
    expect(flat).not.toContain("Hotel Lda");
    expect(flat).not.toContain("negotiated_rotas_rate");
    expect(flat).not.toContain("nota interna");
    expect(flat).not.toContain("pv-1");
  });

  it("o voo mostrado não expõe o custo de fornecedor", () => {
    expect(payload.flight?.airline).toBe("TAP");
    expect(flat).not.toContain("800");
  });
});

describe("7G, o cliente não pode enviar dinheiro", () => {
  it("rejeita preço, margem, markup, custo e política", () => {
    for (const field of ["price", "final_price", "margin", "markup", "policy_version_id", "supplier_cost", "cost"]) {
      expect(rejectForbiddenClientInput({ [field]: 1 })).toContain(field);
    }
  });

  it("aceita apenas critérios", () => {
    expect(rejectForbiddenClientInput({ action: "create", criteria: baseCriteria, component_ids: ["a"] })).toEqual([]);
  });
});

describe("7G, testes críticos de dinheiro", () => {
  const result = pricedPackage();

  it("o preço ao cliente é diferente do custo", () => {
    expect(result.finalPrice).toBeGreaterThan(result.costTotal);
  });

  it("o Pricing Engine é a única fonte do preço", () => {
    expect(result.finalPrice).toBeCloseTo(applyMarkup(700, 25), 2);
  });

  it("não há dupla margem", () => {
    expect(result.finalPrice).toBeCloseTo(875, 2);
    expect(grossMargin(result.costTotal, result.finalPrice)).toBeCloseTo(20, 2);
  });

  it("a tarifa negociada é preservada e usada", () => {
    expect(result.components[0].rateKind).toBe("negotiated_rotas_rate");
    expect(result.components[0].unitPrice).toBe(100);
  });

  it("a fotografia da linha guarda custo, regra e preço", () => {
    const line = result.components[0];
    expect(line.cost).toBe(700);
    expect(line.ruleMode).toBe("markup");
    expect(line.rulePct).toBe(25);
    expect(line.sellPrice).toBeCloseTo(875, 2);
  });

  it("uma tarifa expirada nunca entra no cálculo", () => {
    const r = calculatePricing({
      policy, durationDays: 8, nights: 7, adults: 2, referenceDate: "2026-11-02",
      components: [{
        id: "c1", name: "Hotel", componentType: "accommodation",
        rates: [{ id: "r1", kind: "supplier_cost", status: "expired", price: 100, currency: "EUR", unit: "per_night", sourceType: "email" }],
      }],
    });
    expect(r.status).toBe("requires_review");
    expect(r.finalPrice).toBe(0);
  });

  it("o custo de voo entra como custo de fornecedor, não como preço", () => {
    const r = calculatePricing({
      policy, durationDays: 8, nights: 7, adults: 2, referenceDate: "2026-11-02",
      components: [{
        id: "c1", name: "Hotel", componentType: "accommodation",
        rates: [{ id: "r1", kind: "negotiated_rotas_rate", status: "confirmed", price: 100, currency: "EUR", unit: "per_night", sourceType: "contract", observedAt: "2026-10-01", validFrom: "2026-01-01", validUntil: "2026-12-31" }],
      }],
      flightCost: { amount: 800, currency: "EUR", confirmed: true },
    });
    expect(r.flightCost).toBe(800);
    expect(r.finalPrice).toBeCloseTo(875 + 880, 2);
  });

  it("a versão correta da política fica registada no resultado", () => {
    expect(result.policyVersionId).toBe("pv-1");
    expect(result.policyVersionNumber).toBe(3);
  });

  it("alteração de preço obriga a nova versão", () => {
    const c = comparePrices(result.finalPrice, result.finalPrice + 50);
    expect(c.changed).toBe(true);
    expect(c.difference).toBe(50);
  });
});
