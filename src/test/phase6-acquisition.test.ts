import { describe, expect, it } from "vitest";
import {
  attributeBookings,
  canTransitionCampaign,
  canTransitionPlan,
  checkCampaignBudget,
  checkOpportunityEligibility,
  DEFAULT_WEIGHTS,
  decideFromScore,
  planDedupKey,
  resolveMarketState,
  resolvePlanBatchLimit,
  scoreAcquisition,
  shouldStopCampaign,
} from "../../supabase/functions/_shared/agents/acquisition";
import {
  parseAttributionFromLocation,
} from "@/lib/attribution";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("elegibilidade da oportunidade", () => {
  it("aceita oportunidade aceite e não expirada", () => {
    expect(
      checkOpportunityEligibility({ id: "1", status: "aceite", expires_at: future, language: "pt" }),
    ).toEqual({ eligible: true });
  });

  it("rejeita oportunidade não aceite", () => {
    const r = checkOpportunityEligibility({ id: "1", status: "nova", language: "pt" });
    expect(r.eligible).toBe(false);
  });

  it("rejeita oportunidade expirada", () => {
    const r = checkOpportunityEligibility({ id: "1", status: "aceite", expires_at: past, language: "pt" });
    expect(r.eligible).toBe(false);
  });

  it("rejeita confiança abaixo do mínimo", () => {
    const r = checkOpportunityEligibility(
      { id: "1", status: "aceite", language: "pt", confidence_score: 0.2 },
      new Date(),
      0.5,
    );
    expect(r.eligible).toBe(false);
  });
});

describe("estado do mercado", () => {
  it("sem sinais observados é sem_evidencia", () => {
    expect(resolveMarketState({ observedSignals: 0, bookings: 0, servingCapacity: 3 })).toBe("sem_evidencia");
  });
  it("sinais sem capacidade é descoberto", () => {
    expect(resolveMarketState({ observedSignals: 5, bookings: 0, servingCapacity: 0 })).toBe("descoberto");
  });
  it("sinais com capacidade é potencial", () => {
    expect(resolveMarketState({ observedSignals: 5, bookings: 0, servingCapacity: 2 })).toBe("potencial");
  });
  it("reservas com capacidade é prioritario", () => {
    expect(resolveMarketState({ observedSignals: 5, bookings: 2, servingCapacity: 2 })).toBe("prioritario");
  });
  it("campanha a correr é ativo", () => {
    expect(
      resolveMarketState({ observedSignals: 5, bookings: 2, servingCapacity: 2, activeCampaign: true }),
    ).toBe("ativo");
  });
});

describe("scoring", () => {
  it("tudo a zero dá zero", () => {
    expect(scoreAcquisition({}, 1).score).toBe(0);
  });

  it("tudo no máximo com confiança total dá 100", () => {
    const factors = Object.fromEntries(
      Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 1]),
    ) as Record<keyof typeof DEFAULT_WEIGHTS, number>;
    expect(scoreAcquisition(factors, 1).score).toBe(100);
  });

  it("confiança multiplica em vez de somar", () => {
    const factors = Object.fromEntries(
      Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 1]),
    ) as Record<keyof typeof DEFAULT_WEIGHTS, number>;
    expect(scoreAcquisition(factors, 0.5).score).toBe(50);
  });

  it("é determinístico e limita fatores fora do intervalo", () => {
    const a = scoreAcquisition({ travel_intent: 5, margin: -3 }, 1);
    const b = scoreAcquisition({ travel_intent: 1, margin: 0 }, 1);
    expect(a.score).toBe(b.score);
  });

  it("mercado sem evidência é sempre descartado", () => {
    const result = scoreAcquisition({ travel_intent: 1 }, 1);
    expect(decideFromScore(result, "sem_evidencia", 0.5)).toBe("descartar");
  });

  it("confiança baixa faz esperar", () => {
    const factors = Object.fromEntries(
      Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 1]),
    ) as Record<keyof typeof DEFAULT_WEIGHTS, number>;
    const result = scoreAcquisition(factors, 0.4);
    expect(decideFromScore(result, "potencial", 0.5)).toBe("esperar");
  });

  it("score alto com confiança suficiente faz perseguir", () => {
    const factors = Object.fromEntries(
      Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 1]),
    ) as Record<keyof typeof DEFAULT_WEIGHTS, number>;
    const result = scoreAcquisition(factors, 0.9);
    expect(decideFromScore(result, "prioritario", 0.5)).toBe("perseguir");
  });
});

describe("orçamento de campanha", () => {
  const zero = { campaign_budget_cap: 0, period_budget_cap: 0, total_budget_cap: 0 };

  it("com limites a zero nada é autorizado", () => {
    expect(checkCampaignBudget(10, zero, 0, 0)).toEqual({ allowed: false, reason: "not_authorised" });
  });

  it("respeita o teto por campanha", () => {
    const limits = { campaign_budget_cap: 50, period_budget_cap: 500, total_budget_cap: 1000 };
    expect(checkCampaignBudget(80, limits, 0, 0).allowed).toBe(false);
    expect(checkCampaignBudget(50, limits, 0, 0).allowed).toBe(true);
  });

  it("respeita o teto do período e o total", () => {
    const limits = { campaign_budget_cap: 100, period_budget_cap: 100, total_budget_cap: 150 };
    expect(checkCampaignBudget(60, limits, 60, 0)).toEqual({ allowed: false, reason: "period_cap" });
    expect(checkCampaignBudget(60, limits, 0, 100)).toEqual({ allowed: false, reason: "total_cap" });
  });
});

describe("condições de paragem", () => {
  const base = {
    spend: 10,
    budgetCap: 100,
    bookings: 2,
    maxCostPerBooking: 50,
    daysRunning: 20,
    minDaysBeforeEvaluation: 14,
    measurementAvailable: true,
    globalPaused: false,
  };

  it("pausa global pára tudo", () => {
    expect(shouldStopCampaign({ ...base, globalPaused: true }).reason).toBe("sistema_em_pausa");
  });
  it("sem medição pára", () => {
    expect(shouldStopCampaign({ ...base, measurementAvailable: false }).reason).toBe("sem_medicao");
  });
  it("orçamento esgotado pára", () => {
    expect(shouldStopCampaign({ ...base, spend: 100 }).reason).toBe("orcamento_esgotado");
  });
  it("sem resultados após o período mínimo pára", () => {
    expect(shouldStopCampaign({ ...base, bookings: 0 }).reason).toBe("sem_resultados");
  });
  it("custo por reserva acima do limite pára", () => {
    expect(shouldStopCampaign({ ...base, spend: 90, bookings: 1 }).reason)
      .toBe("custo_por_reserva_acima_do_limite");
  });
  it("dentro dos limites continua", () => {
    expect(shouldStopCampaign(base).stop).toBe(false);
  });
});

describe("estados e chaves", () => {
  it("o plano não salta de aprovado para rascunho", () => {
    expect(canTransitionPlan("aprovado", "rascunho")).toBe(false);
    expect(canTransitionPlan("rascunho", "aprovado")).toBe(true);
  });

  it("a campanha só fica ativa depois de aprovada", () => {
    expect(canTransitionCampaign("rascunho", "ativa")).toBe(false);
    expect(canTransitionCampaign("aprovada", "ativa")).toBe(true);
  });

  it("a chave de deduplicação é estável", () => {
    expect(planDedupKey("op-1", " Portugal ", "PT", "SEO"))
      .toBe(planDedupKey("op-1", "portugal", "pt", "seo"));
  });

  it("o limite de planos por execução nunca ultrapassa o configurado", () => {
    expect(resolvePlanBatchLimit(10, 3)).toBe(3);
    expect(resolvePlanBatchLimit(undefined, 3)).toBe(3);
    expect(resolvePlanBatchLimit(1, 3)).toBe(1);
  });
});

describe("atribuição", () => {
  it("lê apenas parâmetros UTM conhecidos", () => {
    const a = parseAttributionFromLocation(
      "?utm_source=google&utm_campaign=stp-verao&foo=bar",
      "",
      "pt-PT",
    );
    expect(a.utm_source).toBe("google");
    expect(a.utm_campaign).toBe("stp-verao");
    expect((a as Record<string, unknown>).foo).toBeUndefined();
  });

  it("uma reserva é contada uma só vez", () => {
    const result = attributeBookings([
      { id: "b1", attribution: { utm_campaign: "stp-verao" } },
      { id: "b1", attribution: { utm_campaign: "stp-verao" } },
      { id: "b2", attribution: {} },
    ]);
    expect(result["stp-verao"]).toBe(1);
    expect(result["direto"]).toBe(1);
  });
});
