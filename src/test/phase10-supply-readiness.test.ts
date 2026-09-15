import { describe, expect, it } from "vitest";
import {
  catalogCommercialState,
  classifyRate,
  componentReadiness,
  isRateEligibleForPricing,
  productReadiness,
  type ComponentFacts,
  type RateFacts,
} from "@/lib/supply";

const TODAY = new Date("2026-09-15T00:00:00Z");

const rate = (over: Partial<RateFacts> = {}): RateFacts => ({
  rate_kind: "supplier_cost",
  status: "confirmed",
  source_type: "supplier_quote",
  source_reference: "TEST-REF",
  observed_at: "2026-09-01T00:00:00Z",
  valid_until: "2026-12-31",
  validity_unknown: false,
  ...over,
});

const component = (over: Partial<ComponentFacts> = {}): ComponentFacts => ({
  id: "c1",
  status: "approved",
  supplier_id: "s1",
  component_type: "experience",
  ...over,
});

describe("classificação de tarifas", () => {
  it("tarifa confirmada, válida e com fonte é elegível", () => {
    expect(classifyRate(rate(), TODAY)).toBe("confirmada");
    expect(isRateEligibleForPricing(rate(), TODAY)).toBe(true);
  });

  it("tarifa expirada nunca é usada como preço atual", () => {
    const r = rate({ valid_until: "2026-01-31" });
    expect(classifyRate(r, TODAY)).toBe("expirada");
    expect(isRateEligibleForPricing(r, TODAY)).toBe(false);
  });

  it("validade desconhecida não vira certeza comercial", () => {
    const r = rate({ validity_unknown: true, valid_until: null, status: "quoted" });
    expect(classifyRate(r, TODAY)).toBe("validade_desconhecida");
    expect(isRateEligibleForPricing(r, TODAY)).toBe(false);
  });

  it("tarifa estimada e preço público observado não são elegíveis", () => {
    expect(classifyRate(rate({ rate_kind: "estimated_cost", status: "quoted" }), TODAY)).toBe("estimada");
    expect(isRateEligibleForPricing(rate({ rate_kind: "market_observed_price" }), TODAY)).toBe(false);
  });

  it("tarifa sem fonte ou sem data de observação fica de fora", () => {
    expect(classifyRate(rate({ source_type: null }), TODAY)).toBe("sem_fonte");
    expect(isRateEligibleForPricing(rate({ observed_at: null }), TODAY)).toBe(false);
  });
});

describe("prontidão de componentes", () => {
  it("componente aprovado com fornecedor e tarifa válida fica pronto", () => {
    const r = componentReadiness(component(), [rate()], TODAY);
    expect(r.ready).toBe(true);
    expect(r.eligibleRates).toBe(1);
    expect(r.gaps).toEqual([]);
  });

  it("componente sem fornecedor não é comercializável", () => {
    const r = componentReadiness(component({ supplier_id: null }), [rate()], TODAY);
    expect(r.ready).toBe(false);
    expect(r.gaps).toContain("componente_sem_fornecedor");
  });

  it("componente sem tarifa e componente por aprovar são sinalizados", () => {
    expect(componentReadiness(component(), [], TODAY).gaps).toContain("componente_sem_tarifa");
    expect(componentReadiness(component({ status: "draft" }), [rate()], TODAY).gaps)
      .toContain("componente_nao_aprovado");
  });

  it("só tarifas expiradas contam como falta de tarifa válida", () => {
    const r = componentReadiness(component(), [rate({ valid_until: "2026-01-01" })], TODAY);
    expect(r.ready).toBe(false);
    expect(r.gaps).toContain("componente_sem_tarifa_elegivel");
    expect(r.gaps).toContain("tarifa_expirada");
  });
});

describe("editorial vs comercial", () => {
  it("local sem ligação real continua inspiração", () => {
    expect(catalogCommercialState({ service_id: null, package_component_id: null })).toBe("inspiracao");
  });

  it("ligação a componente só conta quando o componente está pronto", () => {
    expect(catalogCommercialState({ package_component_id: "c1", componentReady: false })).toBe("inspiracao");
    expect(catalogCommercialState({ package_component_id: "c1", componentReady: true })).toBe("confirmado");
  });

  it("serviço aprovado torna o local confirmado", () => {
    expect(catalogCommercialState({ service_id: "s1", serviceApproved: true })).toBe("confirmado");
    expect(catalogCommercialState({ service_id: "s1", serviceApproved: false })).toBe("inspiracao");
  });
});

describe("prontidão de produto", () => {
  it("produto sem componentes não gera proposta", () => {
    const p = productReadiness([]);
    expect(p.quoteReady).toBe(false);
    expect(p.gaps).toContain("produto_sem_componentes");
  });

  it("produto só fica pronto quando todos os componentes estão prontos", () => {
    const ok = componentReadiness(component(), [rate()], TODAY);
    const missing = componentReadiness(component({ id: "c2", supplier_id: null }), [], TODAY);
    expect(productReadiness([ok]).quoteReady).toBe(true);
    const partial = productReadiness([ok, missing]);
    expect(partial.quoteReady).toBe(false);
    expect(partial.readyComponents).toBe(1);
    expect(partial.totalComponents).toBe(2);
  });
});
