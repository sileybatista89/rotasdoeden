import { describe, expect, it } from "vitest";
import {
  CANCELLATION_LABEL, COMPONENT_TYPE_LABEL, DOCUMENT_BACKED_SOURCES, MEAL_PLAN_LABEL,
  RATE_KIND_LABEL, RATE_UNIT_LABEL, SOURCE_TYPE_LABEL, SUPPLIER_TYPE_LABEL,
  canTransitionRate, canTransitionSupply, isApprovedForCommercialUse, isExpired,
  isUsableAsCurrentCost, validateConfirmation, validateRate,
  type RateInput,
} from "@/lib/supply";

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const baseRate = (over: Partial<RateInput> = {}): RateInput => ({
  component_id: "c1",
  rate_kind: "supplier_cost",
  price: 175,
  currency: "EUR",
  unit: "per_night",
  source_type: "supplier_quote",
  observed_at: iso(-1),
  validity_unknown: true,
  ...over,
});

describe("fornecedores, alojamentos e quartos", () => {
  it("cobre os tipos de fornecedor esperados sem inventar dados", () => {
    expect(Object.keys(SUPPLIER_TYPE_LABEL)).toContain("accommodation");
    expect(Object.keys(SUPPLIER_TYPE_LABEL)).toContain("guide");
    expect(Object.keys(SUPPLIER_TYPE_LABEL)).toContain("insurance");
    expect(Object.keys(SUPPLIER_TYPE_LABEL)).toContain("airline");
  });

  it("registar não é aprovar para venda", () => {
    expect(isApprovedForCommercialUse("draft")).toBe(false);
    expect(isApprovedForCommercialUse("under_review")).toBe(false);
    expect(isApprovedForCommercialUse("approved")).toBe(true);
  });

  it("não aprova diretamente a partir de rascunho", () => {
    expect(canTransitionSupply("draft", "approved")).toBe(false);
    expect(canTransitionSupply("draft", "under_review")).toBe(true);
    expect(canTransitionSupply("under_review", "approved")).toBe(true);
  });
});

describe("componentes", () => {
  it("prepara voo apenas como estrutura futura", () => {
    expect(Object.keys(COMPONENT_TYPE_LABEL)).toContain("flight");
    expect(COMPONENT_TYPE_LABEL.flight).toMatch(/futura/i);
  });

  it("inclui alojamento, quarto, guia e experiência reutilizáveis", () => {
    for (const t of ["accommodation", "room", "guide", "experience", "insurance", "meal"]) {
      expect(Object.keys(COMPONENT_TYPE_LABEL)).toContain(t);
    }
  });
});

describe("validação de tarifas", () => {
  it("exige fonte", () => {
    expect(validateRate(baseRate({ source_type: null }))).toMatch(/fonte/i);
  });

  it("exige data de observação e recusa datas futuras", () => {
    expect(validateRate(baseRate({ observed_at: null }))).toMatch(/observ/i);
    expect(validateRate(baseRate({ observed_at: iso(30) }))).toMatch(/futuro/i);
  });

  it("exige moeda válida e unidade", () => {
    expect(validateRate(baseRate({ currency: "" }))).toMatch(/moeda/i);
    expect(validateRate(baseRate({ currency: "euros" }))).toMatch(/moeda/i);
    expect(validateRate(baseRate({ unit: null }))).toMatch(/unidade/i);
  });

  it("exige preço válido e componente", () => {
    expect(validateRate(baseRate({ price: null }))).toMatch(/valor/i);
    expect(validateRate(baseRate({ price: -5 }))).toMatch(/valor/i);
    expect(validateRate(baseRate({ component_id: null }))).toMatch(/componente/i);
  });

  it("recusa validade impossível", () => {
    expect(validateRate(baseRate({ valid_from: iso(10), valid_until: iso(2) }))).toMatch(/validade/i);
  });

  it("recusa ocupação incompatível", () => {
    expect(validateRate(baseRate({ occupancy_adults: 2, occupancy_children: 2, occupancy_total: 3 })))
      .toMatch(/ocupação/i);
  });

  it("aceita uma tarifa completa", () => {
    expect(validateRate(baseRate())).toBeNull();
  });

  it("cobre regimes alimentares e cancelamento sem inventar", () => {
    expect(MEAL_PLAN_LABEL.unknown).toBeTruthy();
    expect(CANCELLATION_LABEL.unknown).toBeTruthy();
    expect(Object.keys(MEAL_PLAN_LABEL)).toHaveLength(7);
    expect(Object.keys(CANCELLATION_LABEL)).toHaveLength(4);
    expect(Object.keys(RATE_UNIT_LABEL)).toContain("per_night");
  });
});

describe("preço observado vs custo vs tarifa negociada", () => {
  it("distingue os três conceitos", () => {
    expect(RATE_KIND_LABEL.market_observed_price).toMatch(/observado/i);
    expect(RATE_KIND_LABEL.supplier_cost).toMatch(/fornecedor/i);
    expect(RATE_KIND_LABEL.negotiated_rotas_rate).toMatch(/Rotas/i);
  });

  it("um preço público observado nunca vira custo confirmado", () => {
    expect(validateConfirmation(baseRate({ rate_kind: "market_observed_price", validity_unknown: false, valid_until: iso(30) })))
      .toMatch(/observado/i);
    expect(isUsableAsCurrentCost({ status: "confirmed", rate_kind: "market_observed_price", validity_unknown: false, valid_until: iso(30) }))
      .toBe(false);
  });

  it("permite guardar preço observado e tarifa Rotas em paralelo", () => {
    expect(validateRate(baseRate({ rate_kind: "market_observed_price", price: 220, source_type: "booking_channel" }))).toBeNull();
    expect(validateRate(baseRate({ rate_kind: "negotiated_rotas_rate", price: 175, source_type: "supplier_contract" }))).toBeNull();
  });
});

describe("validade e estados da tarifa", () => {
  it("custo confirmado exige validade conhecida", () => {
    expect(validateConfirmation(baseRate({ validity_unknown: true }))).toMatch(/validade/i);
    expect(validateConfirmation(baseRate({ validity_unknown: false, valid_until: iso(30) }))).toBeNull();
  });

  it("uma tarifa expirada não serve como custo atual", () => {
    const expiredRate = { status: "confirmed" as const, rate_kind: "supplier_cost" as const, validity_unknown: false, valid_until: iso(-2) };
    expect(isExpired(expiredRate)).toBe(true);
    expect(isUsableAsCurrentCost(expiredRate)).toBe(false);
    expect(validateConfirmation(baseRate({ validity_unknown: false, valid_until: iso(-2) }))).toMatch(/expirada/i);
  });

  it("mantém o histórico: estados fechados não reabrem", () => {
    expect(canTransitionRate("expired", "confirmed")).toBe(false);
    expect(canTransitionRate("withdrawn", "observed")).toBe(false);
    expect(canTransitionRate("expired", "withdrawn")).toBe(true);
    expect(canTransitionRate("observed", "negotiated")).toBe(true);
  });

  it("reconhece fontes com documento de suporte", () => {
    expect(DOCUMENT_BACKED_SOURCES).toContain("supplier_contract");
    expect(DOCUMENT_BACKED_SOURCES).not.toContain("booking_channel");
    expect(SOURCE_TYPE_LABEL.internal_service).toMatch(/interno/i);
  });
});
