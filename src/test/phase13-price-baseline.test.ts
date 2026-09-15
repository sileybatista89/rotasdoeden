import { describe, it, expect } from "vitest";
import {
  computeBaseline,
  normalizeBaselineConfig,
  publicBaseline,
  rateExpiry,
  selectBaselineComponents,
  type BaselineConfig,
} from "@/lib/priceBaseline";
import type { PricingComponentInput, PricingPolicyVersion, RateCandidate } from "@/lib/pricing";

const TODAY = "2026-09-20";
const OBSERVED = "2026-09-15";

const policy: PricingPolicyVersion = {
  id: "pol-v1",
  policyId: "pol",
  versionNumber: 1,
  status: "active",
  baseCurrency: "EUR",
  marginMode: "target_margin",
  minMarginPct: 0,
  targetMarginPct: 0,
  componentRules: {},
  flightProtection: { method: "percentage", value: 0 },
  fees: [],
  supplements: [],
  operationalCosts: [],
  roundingMode: "none",
  validFrom: null,
  validUntil: null,
};

function rate(over: Partial<RateCandidate> = {}): RateCandidate {
  return {
    id: "r1",
    kind: "market_observed_price",
    status: "observed",
    price: 580,
    currency: "EUR",
    unit: "per_person",
    quantity: 1,
    occupancyAdults: null,
    occupancyChildren: null,
    occupancyTotal: null,
    validFrom: null,
    validUntil: null,
    validityUnknown: true,
    sourceType: "official_website",
    observedAt: OBSERVED,
    ...over,
  };
}

function comp(id: string, type: string, rates: RateCandidate[]): PricingComponentInput {
  return { id, name: id, componentType: type as PricingComponentInput["componentType"], rates };
}

const config: BaselineConfig = { enabled: true, adults: 2, rooms: 1, required: ["flight", "room"], optional: [] };

const components = [
  comp("voo", "flight", [rate({ id: "r-voo", price: 580, unit: "per_person" })]),
  comp("quarto", "room", [rate({ id: "r-quarto", price: 200, unit: "per_night" })]),
];

const base = { policy, config, durationDays: 5, nights: 4, components, referenceDate: TODAY };

describe("Fase 13 — preço de referência 'desde €X'", () => {
  it("lê a configuração de baseline do produto", () => {
    expect(normalizeBaselineConfig({ baseline: { enabled: true, adults: 2, rooms: 1, required: ["flight"] } }))
      .toMatchObject({ adults: 2, required: ["flight"] });
    expect(normalizeBaselineConfig({})).toBeNull();
    expect(normalizeBaselineConfig({ baseline: { enabled: true, required: [] } })).toBeNull();
  });

  it("calcula o preço pelo Pricing Engine com preços observados no mercado", () => {
    const r = computeBaseline(base);
    expect(r.status).toBe("published");
    expect(r.pricePerPerson).toBeGreaterThan(0);
    expect(r.commercialState).toBe("market_based_pricing");
    expect(r.sourceRateIds).toContain("r-voo");
    // preços de mercado entram como retalho (pass-through): 580*2 + 200*4 = 1960.
    expect(r.priceTotal).toBe(1960);
    expect(r.pricePerPerson).toBe(980);
  });

  it("bloqueia quando a margem mínima da política não é atingida", () => {
    const r = computeBaseline({ ...base, policy: { ...policy, minMarginPct: 15 } });
    expect(r.status).toBe("blocked");
    expect(r.pricePerPerson).toBeNull();
    expect(r.blockedReason).toMatch(/margem/i);
  });

  it("não publica preço sem política de preços ativa", () => {
    const r = computeBaseline({ ...base, policy: null });
    expect(r.status).toBe("blocked");
    expect(r.pricePerPerson).toBeNull();
    expect(r.blockedReason).toMatch(/política/i);
  });

  it("não preenche componentes em falta com zero", () => {
    const r = computeBaseline({ ...base, components: [components[0]] });
    expect(r.status).toBe("blocked");
    expect(r.missing).toContain("room");
    expect(r.pricePerPerson).toBeNull();
  });

  it("rejeita observações expiradas ou sem proveniência", () => {
    const stale = comp("quarto", "room", [rate({ id: "r-old", unit: "per_night", observedAt: "2020-01-01" })]);
    expect(selectBaselineComponents(["room"], [stale], TODAY,
      { durationDays: 5, nights: 4, adults: 2, children: 0, rooms: 1 }).missing).toContain("room");

    const noSource = comp("quarto", "room", [rate({ id: "r-ns", unit: "per_night", sourceType: null })]);
    expect(selectBaselineComponents(["room"], [noSource], TODAY,
      { durationDays: 5, nights: 4, adults: 2, children: 0, rooms: 1 }).missing).toContain("room");
  });

  it("marca quando a referência precisa de atualização", () => {
    const r = computeBaseline(base);
    expect(r.expiresAt).toBeTruthy();
    expect(rateExpiry(rate({ validUntil: "2026-12-31" }))).toContain("2026-12-31");
  });

  it("o valor público não expõe custo, margem nem fornecedor", () => {
    const r = computeBaseline(base);
    const pub = publicBaseline({
      status: r.status,
      currency: r.currency,
      price_per_person: r.pricePerPerson,
      commercial_state: r.commercialState,
      duration_days: r.durationDays,
      adults: r.adults,
      computed_at: new Date().toISOString(),
      expires_at: r.expiresAt,
      includes_flight: r.includesFlight,
    })!;
    expect(Object.keys(pub).sort()).toEqual(
      ["adults", "computed_at", "currency", "duration_days", "includes_flight", "indicative", "price_per_person"],
    );
    expect(pub.indicative).toBe(true);
  });

  // ---- correção: voo opcional e ocupação filtrada antes da escolha ----

  const landConfig: BaselineConfig = {
    enabled: true, adults: 2, rooms: 1,
    required: ["room", "transport", "experience"], optional: ["flight"],
  };
  const land = [
    comp("quarto", "room", [rate({ id: "r-quarto", price: 200, unit: "per_night" })]),
    comp("carro", "transport", [rate({ id: "r-carro", price: 40, unit: "per_day" })]),
    comp("tour", "experience", [rate({ id: "r-tour", price: 60, unit: "per_person" })]),
  ];

  it("lê categorias opcionais da configuração do produto", () => {
    expect(normalizeBaselineConfig({
      baseline: { enabled: true, adults: 2, rooms: 1, required: ["room"], optional: ["flight", "room"] },
    })).toMatchObject({ required: ["room"], optional: ["flight"] });
  });

  it("publica preço de base terrestre sem voo disponível", () => {
    const r = computeBaseline({ ...base, config: landConfig, components: land });
    expect(r.status).toBe("published");
    expect(r.includesFlight).toBe(false);
    // 200*4 + 40*5 + 60*2 = 1120 → 560 por pessoa.
    expect(r.priceTotal).toBe(1120);
    expect(r.pricePerPerson).toBe(560);
  });

  it("inclui o voo no preço quando existe dado elegível", () => {
    const withFlight = [...land, comp("voo", "flight", [rate({ id: "r-voo", price: 580, unit: "per_person" })])];
    const r = computeBaseline({ ...base, config: landConfig, components: withFlight });
    expect(r.includesFlight).toBe(true);
    expect(r.priceTotal).toBe(1120 + 1160);
  });

  it("não escolhe tarifa incompatível com a ocupação configurada", () => {
    const rooms = comp("quarto", "room", [
      rate({ id: "r-single", price: 120, unit: "per_night", occupancyAdults: 1 }),
      rate({ id: "r-duplo", price: 200, unit: "per_night" }),
    ]);
    const r = computeBaseline({ ...base, config: landConfig, components: [rooms, land[1], land[2]] });
    expect(r.status).toBe("published");
    expect(r.sourceRateIds).toContain("r-duplo");
    expect(r.sourceRateIds).not.toContain("r-single");
  });

  it("continua a bloquear quando falta uma categoria obrigatória", () => {
    const r = computeBaseline({ ...base, config: landConfig, components: [land[0], land[1]] });
    expect(r.status).toBe("blocked");
    expect(r.missing).toContain("experience");
    expect(r.priceTotal).toBeNull();
  });

  it("não mostra publicamente um baseline bloqueado ou expirado", () => {
    const row = {
      status: "published", currency: "EUR", price_per_person: 1200, commercial_state: "market_based_pricing",
      duration_days: 5, adults: 2, computed_at: new Date().toISOString(),
    };
    expect(publicBaseline({ ...row, expires_at: "2020-01-01T00:00:00Z" })).toBeNull();
    expect(publicBaseline({ ...row, status: "blocked", expires_at: null })).toBeNull();
  });
});
