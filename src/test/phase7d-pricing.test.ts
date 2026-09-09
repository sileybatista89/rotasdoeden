import { describe, expect, it } from "vitest";
import {
  applyFlightProtection, applyMarkup, applyTargetMargin, calculatePricing, grossMargin,
  isRateValidOn, marginToMarkup, markupToMargin, resolveQuantity, roundFinal, selectRate,
  type PricingComponentInput, type PricingPolicyVersion, type RateCandidate,
} from "@/lib/pricing";

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

const BASE = {
  durationDays: 7, nights: 6, adults: 2, children: 0, rooms: 1, referenceDate: "2026-06-01",
};

describe("Fase 7D — matemática de markup e margem", () => {
  it("markup 20% sobre 100 dá 120", () => {
    expect(applyMarkup(100, 20)).toBe(120);
  });

  it("margem alvo 20% sobre 100 dá 125", () => {
    expect(applyTargetMargin(100, 20)).toBe(125);
  });

  it("margem alvo 30% sobre 100 dá 142,857...", () => {
    expect(applyTargetMargin(100, 30)).toBeCloseTo(142.857142, 5);
  });

  it("markup 20% equivale a margem bruta 16,67% e não a 20%", () => {
    expect(markupToMargin(20)).toBeCloseTo(16.6667, 3);
    expect(markupToMargin(20)).not.toBeCloseTo(20, 3);
  });

  it("margem 20% exige markup 25%", () => {
    expect(marginToMarkup(20)).toBeCloseTo(25, 6);
  });

  it("margem bruta é calculada sobre o preço", () => {
    expect(grossMargin(100, 125)).toBeCloseTo(20, 6);
  });

  it("margem alvo de 100% ou mais é rejeitada", () => {
    expect(() => applyTargetMargin(100, 100)).toThrow();
    expect(() => marginToMarkup(110)).toThrow();
  });
});

describe("Fase 7D — arredondamento", () => {
  it("arredonda apenas no fim conforme o modo", () => {
    expect(roundFinal(142.857, "none")).toBe(142.86);
    expect(roundFinal(142.857, "nearest_1")).toBe(143);
    expect(roundFinal(142.857, "nearest_5")).toBe(145);
    expect(roundFinal(142.857, "nearest_10")).toBe(140);
    expect(roundFinal(142.857, "nearest_50")).toBe(150);
  });

  it("não existe arredondamento intermédio no motor", () => {
    const res = calculatePricing({
      policy: policy({ roundingMode: "nearest_10", componentRules: { other: { mode: "markup", value: 33.333 } } }),
      components: [component({ rates: [rate({ price: 33.333 })] })],
      ...BASE,
    });
    // custo 33,333 → venda 44,443... → arredondado uma única vez para 40
    expect(res.costTotal).toBeCloseTo(33.333, 3);
    expect(res.subtotal).toBeCloseTo(44.4436, 3);
    expect(res.finalPrice).toBe(40);
  });
});

describe("Fase 7D — unidades e quantidades", () => {
  it("resolve a quantidade de acordo com a unidade", () => {
    const ctx = { durationDays: 7, nights: 6, adults: 2, children: 1, rooms: 2 };
    expect(resolveQuantity("per_person", ctx)).toBe(3);
    expect(resolveQuantity("per_night", ctx)).toBe(6);
    expect(resolveQuantity("per_room", ctx)).toBe(2);
    expect(resolveQuantity("per_day", ctx)).toBe(7);
    expect(resolveQuantity("per_group", ctx)).toBe(1);
    expect(resolveQuantity("per_service", ctx)).toBe(1);
    expect(resolveQuantity("fixed", ctx)).toBe(1);
  });

  it("100 por noite em 6 noites não é igual a 100 por serviço", () => {
    const perNight = calculatePricing({
      policy: policy(), components: [component({ rates: [rate({ unit: "per_night" })] })], ...BASE,
    });
    const perService = calculatePricing({
      policy: policy(), components: [component({ rates: [rate({ unit: "per_service" })] })], ...BASE,
    });
    expect(perNight.costTotal).toBe(600);
    expect(perService.costTotal).toBe(100);
  });
});

describe("Fase 7D — seleção de custos", () => {
  it("a tarifa negociada Rotas tem prioridade sobre o preço público observado", () => {
    const sel = selectRate(
      [
        rate({ id: "obs", kind: "market_observed_price", status: "observed", price: 220, sourceType: "official_website" }),
        rate({ id: "neg", kind: "negotiated_rotas_rate", price: 175 }),
      ],
      "2026-06-01", { adults: 2, children: 0 },
    );
    expect(sel.rate?.id).toBe("neg");
    expect(sel.rate?.price).toBe(175);
    expect(sel.notes.join(" ")).toContain("175");
  });

  it("tarifa expirada é bloqueada", () => {
    const sel = selectRate([rate({ status: "expired" })], "2026-06-01", { adults: 2, children: 0 });
    expect(sel.rate).toBeNull();
  });

  it("tarifa fora de validade é bloqueada", () => {
    expect(isRateValidOn(rate({ validUntil: "2026-03-01" }), "2026-06-01")).toBe(false);
    expect(isRateValidOn(rate({ validFrom: "2026-09-01" }), "2026-06-01")).toBe(false);
  });

  it("validade impossível é rejeitada", () => {
    expect(isRateValidOn(rate({ validFrom: "2026-08-01", validUntil: "2026-07-01" }), "2026-08-15")).toBe(false);
  });

  it("validade desconhecida é rejeitada", () => {
    expect(isRateValidOn(rate({ validityUnknown: true }), "2026-06-01")).toBe(false);
  });

  it("tarifa sem fonte é bloqueada", () => {
    const sel = selectRate([rate({ sourceType: null })], "2026-06-01", { adults: 2, children: 0 });
    expect(sel.rate).toBeNull();
  });

  it("preço zero ou negativo é rejeitado", () => {
    expect(selectRate([rate({ price: 0 })], "2026-06-01", { adults: 2, children: 0 }).rate).toBeNull();
    expect(selectRate([rate({ price: -50 })], "2026-06-01", { adults: 2, children: 0 }).rate).toBeNull();
  });

  it("a tarifa de 2 pessoas não é usada para 4", () => {
    const sel = selectRate([rate({ occupancyTotal: 2 })], "2026-06-01", { adults: 4, children: 0 });
    expect(sel.rate).toBeNull();
  });
});

describe("Fase 7D — estados do cálculo", () => {
  it("custo estimado produz cálculo ESTIMATED", () => {
    const res = calculatePricing({
      policy: policy(), components: [component({ rates: [rate({ kind: "estimated_cost", status: "quoted" })] })], ...BASE,
    });
    expect(res.status).toBe("estimated");
  });

  it("apenas custos confirmados produzem CONFIRMED", () => {
    const res = calculatePricing({ policy: policy(), components: [component()], ...BASE });
    expect(res.status).toBe("confirmed");
  });

  it("componente sem tarifa válida força revisão", () => {
    const res = calculatePricing({
      policy: policy(), components: [component({ rates: [rate({ status: "expired" })] })], ...BASE,
    });
    expect(res.status).toBe("requires_review");
    expect(res.validationErrors.join(" ")).toContain("sem tarifa válida");
  });

  it("moedas diferentes sem câmbio configurado forçam revisão", () => {
    const res = calculatePricing({
      policy: policy({ baseCurrency: "EUR" }),
      components: [component({ rates: [rate({ currency: "USD" })] })],
      ...BASE,
    });
    expect(res.status).toBe("requires_review");
    expect(res.validationErrors.join(" ")).toContain("conversão cambial");
  });

  it("margem abaixo da mínima força revisão com motivo claro", () => {
    const res = calculatePricing({
      policy: policy({ minMarginPct: 30, componentRules: { other: { mode: "markup", value: 10 } } }),
      components: [component()], ...BASE,
    });
    expect(res.status).toBe("requires_review");
    expect(res.validationErrors.join(" ")).toContain("margem mínima");
  });

  it("percentagem inválida é detetada", () => {
    const res = calculatePricing({
      policy: policy({ minMarginPct: 150 }), components: [component()], ...BASE,
    });
    expect(res.validationErrors.join(" ")).toContain("Margem mínima inválida");
  });
});

describe("Fase 7D — taxas, suplementos e dupla marcação", () => {
  it("taxa fixa e percentual são aplicadas", () => {
    const res = calculatePricing({
      policy: policy({ fees: [{ label: "Taxa fixa", kind: "fixed", amount: 20 }, { label: "Taxa %", kind: "percentage", amount: 10, appliesTo: "land" }] }),
      components: [component()], ...BASE,
    });
    expect(res.fees).toBe(30);
    expect(res.subtotal).toBe(130);
  });

  it("taxas duplicadas são ignoradas", () => {
    const fee = { label: "Taxa fixa", kind: "fixed" as const, amount: 20 };
    const res = calculatePricing({ policy: policy({ fees: [fee, { ...fee }] }), components: [component()], ...BASE });
    expect(res.fees).toBe(20);
    expect(res.warnings.join(" ")).toContain("duplicada");
  });

  it("suplementos por pessoa e por noite respeitam as quantidades", () => {
    const res = calculatePricing({
      policy: policy({
        supplements: [
          { label: "Sup pessoa", kind: "per_person", amount: 10 },
          { label: "Sup noite", kind: "per_night", amount: 5 },
        ],
      }),
      components: [component()], ...BASE,
    });
    expect(res.supplements).toBe(20 + 30);
  });

  it("custo operacional que já contém margem não é remarcado", () => {
    const withMargin = calculatePricing({
      policy: policy({
        componentRules: { other: { mode: "markup", value: 20 } },
        operationalCosts: [{ label: "Coordenação", kind: "fixed", amount: 100, marginIncluded: true }],
      }),
      components: [component()], ...BASE,
    });
    const withoutFlag = calculatePricing({
      policy: policy({
        componentRules: { other: { mode: "markup", value: 20 } },
        operationalCosts: [{ label: "Coordenação", kind: "fixed", amount: 100 }],
      }),
      components: [component()], ...BASE,
    });
    expect(withMargin.subtotal).toBe(220);
    expect(withoutFlag.subtotal).toBe(240);
  });

  it("componente marcado como margem incluída não recebe markup", () => {
    const res = calculatePricing({
      policy: policy({ componentRules: { other: { mode: "markup", value: 20, marginIncluded: true } } }),
      components: [component()], ...BASE,
    });
    expect(res.subtotal).toBe(100);
    expect(res.markupTotal).toBe(0);
  });

  it("regra pass_through não aplica margem", () => {
    const res = calculatePricing({
      policy: policy({ componentRules: { insurance: { mode: "pass_through", value: 0 } } }),
      components: [component({ componentType: "insurance" })], ...BASE,
    });
    expect(res.subtotal).toBe(100);
  });
});

describe("Fase 7D — margem por componente e ordem de cálculo", () => {
  it("cada tipo de componente usa a sua própria regra", () => {
    const res = calculatePricing({
      policy: policy({
        componentRules: {
          accommodation: { mode: "markup", value: 20 },
          guide: { mode: "target_margin", value: 20 },
        },
      }),
      components: [
        component({ id: "a", componentType: "accommodation", rates: [rate({ id: "ra" })] }),
        component({ id: "g", componentType: "guide", rates: [rate({ id: "rg" })] }),
      ],
      ...BASE,
    });
    expect(res.components[0].sellPrice).toBe(120);
    expect(res.components[1].sellPrice).toBe(125);
    expect(res.subtotal).toBe(245);
  });

  it("a margem não é aplicada duas vezes", () => {
    const res = calculatePricing({
      policy: policy({ componentRules: { other: { mode: "markup", value: 20 } } }),
      components: [component()], ...BASE,
    });
    expect(res.subtotal).toBe(120);
    expect(res.markupTotal).toBe(20);
    expect(res.grossMarginPct).toBeCloseTo(16.6667, 3);
  });

  it("duração real do pacote é usada e nunca hard-coded", () => {
    const short = calculatePricing({
      policy: policy(), components: [component({ rates: [rate({ unit: "per_day" })] })],
      ...BASE, durationDays: 5, nights: 4,
    });
    const long = calculatePricing({
      policy: policy(), components: [component({ rates: [rate({ unit: "per_day" })] })],
      ...BASE, durationDays: 15, nights: 14,
    });
    expect(short.costTotal).toBe(500);
    expect(long.costTotal).toBe(1500);
  });
});

describe("Fase 7D — proteção de tarifa aérea (estrutura futura)", () => {
  it("percentagem de 10% sobre 800 dá 80 de proteção", () => {
    expect(applyFlightProtection(800, { method: "percentage", value: 10 })).toBe(80);
  });

  it("suporta valor fixo, mínimo, máximo e híbrido", () => {
    expect(applyFlightProtection(800, { method: "fixed_amount", value: 50 })).toBe(50);
    expect(applyFlightProtection(800, { method: "percentage_with_minimum", value: 5, minimum: 100 })).toBe(100);
    expect(applyFlightProtection(800, { method: "percentage_with_maximum", value: 20, maximum: 100 })).toBe(100);
    expect(applyFlightProtection(800, { method: "hybrid", value: 1, minimum: 20, maximum: 50 })).toBe(20);
  });

  it("sem custo de voo não existe proteção nem voo no cálculo", () => {
    const res = calculatePricing({
      policy: policy({ flightProtection: { method: "percentage", value: 10 } }),
      components: [component()], ...BASE,
    });
    expect(res.flightCost).toBe(0);
    expect(res.flightProtection).toBe(0);
  });
});

describe("Fase 7D — segurança do cálculo", () => {
  it("o motor ignora qualquer preço ou margem enviados no input do componente", () => {
    const injected = {
      ...component(),
      finalPrice: 1, sellPrice: 1, margin: 99,
    } as unknown as PricingComponentInput;
    const res = calculatePricing({
      policy: policy({ componentRules: { other: { mode: "markup", value: 20 } } }),
      components: [injected], ...BASE,
    });
    expect(res.finalPrice).toBe(120);
  });

  it("política não ativa avisa que o cálculo é apenas simulação", () => {
    const res = calculatePricing({ policy: policy({ status: "draft" }), components: [component()], ...BASE });
    expect(res.warnings.join(" ")).toContain("simulação");
  });

  it("o resultado guarda sempre a versão de política usada", () => {
    const res = calculatePricing({ policy: policy({ versionNumber: 4 }), components: [component()], ...BASE });
    expect(res.policyVersionId).toBe("v1");
    expect(res.policyVersionNumber).toBe(4);
  });

  it("entradas impossíveis são bloqueadas", () => {
    const res = calculatePricing({ policy: policy(), components: [], ...BASE, adults: 0, durationDays: 0 });
    expect(res.status).toBe("requires_review");
    expect(res.finalPrice).toBe(0);
    expect(res.validationErrors.length).toBeGreaterThanOrEqual(3);
  });
});
