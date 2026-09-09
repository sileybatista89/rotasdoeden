import { describe, expect, it } from "vitest";
import {
  CABIN_CLASSES,
  DuffelFlightProvider,
  FLIGHT_ERROR_MESSAGE,
  FlightProviderError,
  compareOffers,
  isOfferExpired,
  itineraryKey,
  mapDuffelError,
  normalizeDuffelOffer,
  searchCacheKey,
  toPricingFlightCost,
  validateSearchParams,
  type NormalizedFlightOffer,
} from "@/lib/flights";
import { applyFlightProtection, applyMarkup } from "@/lib/pricing";

const FUTURE = new Date(Date.now() + 3600_000).toISOString();
const PAST = new Date(Date.now() - 3600_000).toISOString();

/** Mock de resposta Duffel — usado APENAS em testes, nunca em produção. */
function duffelOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: "off_test_123",
    offer_request_id: "orq_test_1",
    total_amount: "845.30",
    total_currency: "EUR",
    base_amount: "700.00",
    tax_amount: "145.30",
    created_at: new Date().toISOString(),
    expires_at: FUTURE,
    owner: { iata_code: "TP", name: "TAP Air Portugal" },
    payment_requirements: { requires_instant_payment: false, payment_required_by: FUTURE, price_guarantee_expires_at: FUTURE },
    passengers: [{ id: "pas_1", type: "adult" }],
    slices: [{
      origin: { iata_code: "LIS" },
      destination: { iata_code: "TMS" },
      duration: "PT7H",
      conditions: { change_before_departure: null },
      segments: [{
        origin: { iata_code: "LIS" },
        destination: { iata_code: "TMS" },
        departing_at: "2026-11-02T10:00:00",
        arriving_at: "2026-11-02T17:00:00",
        marketing_carrier: { iata_code: "TP", name: "TAP Air Portugal" },
        marketing_carrier_flight_number: "1531",
        operating_carrier: { iata_code: "TP", name: "TAP Air Portugal" },
        aircraft: { name: "Airbus A330" },
        duration: "PT7H",
        passengers: [{ cabin_class: "economy", fare_basis_code: "KLGT", baggages: [{ type: "checked", quantity: 1 }] }],
      }],
    }],
    available_services: [{ type: "baggage", total_amount: "40.00", total_currency: "EUR" }],
    conditions: { refund_before_departure: null },
    ...overrides,
  };
}

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
      json: async () => body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("Fase 7E — validação de parâmetros", () => {
  const base = { origin: "lis", destination: "TMS", departureDate: "2026-11-02", adults: 2, cabin: "economy" as const };

  it("normaliza e aceita uma pesquisa válida", () => {
    const p = validateSearchParams(base);
    expect(p.origin).toBe("LIS");
    expect(p.destination).toBe("TMS");
    expect(p.maxResults).toBe(20);
  });

  it("rejeita origem inválida", () => {
    expect(() => validateSearchParams({ ...base, origin: "LISBOA" })).toThrow(FlightProviderError);
    expect(() => validateSearchParams({ ...base, origin: "TMS" })).toThrow(FlightProviderError);
  });

  it("rejeita datas inválidas e volta antes da ida", () => {
    expect(() => validateSearchParams({ ...base, departureDate: "02-11-2026" })).toThrow();
    expect(() => validateSearchParams({ ...base, returnDate: "2026-11-01" })).toThrow();
    expect(validateSearchParams({ ...base, returnDate: "2026-11-10" }).returnDate).toBe("2026-11-10");
  });

  it("valida a contagem de passageiros", () => {
    expect(() => validateSearchParams({ ...base, adults: 0 })).toThrow();
    expect(() => validateSearchParams({ ...base, adults: 1, infants: 2 })).toThrow();
    expect(() => validateSearchParams({ ...base, adults: 9, children: 2 })).toThrow();
    expect(validateSearchParams({ ...base, children: 1, infants: 1 }).children).toBe(1);
  });

  it("valida cabina e escalas", () => {
    expect(() => validateSearchParams({ ...base, cabin: "luxury" as never })).toThrow();
    expect(() => validateSearchParams({ ...base, maxConnections: 5 })).toThrow();
    expect(CABIN_CLASSES).toContain("business");
  });

  it("limita o número de resultados", () => {
    expect(validateSearchParams({ ...base, maxResults: 500 }).maxResults).toBe(50);
  });
});

describe("Fase 7E — cache e idempotência", () => {
  const p = validateSearchParams({ origin: "LIS", destination: "TMS", departureDate: "2026-11-02", adults: 2, cabin: "economy" });

  it("a mesma pesquisa gera a mesma chave", () => {
    const q = validateSearchParams({ origin: "lis", destination: "tms", departureDate: "2026-11-02", adults: 2, cabin: "economy" });
    expect(searchCacheKey("duffel", p)).toBe(searchCacheKey("duffel", q));
  });

  it("parâmetros diferentes geram chaves diferentes", () => {
    const q = validateSearchParams({ ...p, adults: 3 });
    expect(searchCacheKey("duffel", p)).not.toBe(searchCacheKey("duffel", q));
  });
});

describe("Fase 7E — normalização Duffel", () => {
  it("guarda muito mais do que o preço", () => {
    const o = normalizeDuffelOffer(duffelOffer());
    expect(o.provider).toBe("duffel");
    expect(o.providerOfferId).toBe("off_test_123");
    expect(o.providerOfferRequestId).toBe("orq_test_1");
    expect(o.totalAmount).toBe(845.3);
    expect(o.totalCurrency).toBe("EUR");
    expect(o.owner).toBe("TP");
    expect(o.expiresAt).toBe(FUTURE);
    expect(o.slices[0].segments[0].marketingCarrier).toBe("TP");
    expect(o.slices[0].segments[0].operatingCarrier).toBe("TP");
    expect(o.slices[0].segments[0].baggage[0]).toEqual({ type: "checked", quantity: 1 });
    expect(o.services[0].type).toBe("baggage");
    expect(o.fareConditions).toBeTruthy();
  });

  it("deteta ofertas com hold", () => {
    expect(normalizeDuffelOffer(duffelOffer()).holdCapable).toBe(true);
  });

  it("deteta pagamento imediato obrigatório", () => {
    const o = normalizeDuffelOffer(duffelOffer({ payment_requirements: { requires_instant_payment: true } }));
    expect(o.holdCapable).toBe(false);
    expect(o.paymentRequirements.requiresInstantPayment).toBe(true);
  });

  it("assume pagamento imediato quando o campo não existe", () => {
    const o = normalizeDuffelOffer(duffelOffer({ payment_requirements: {} }));
    expect(o.holdCapable).toBe(false);
  });
});

describe("Fase 7E — expiry e reprice", () => {
  const offer = normalizeDuffelOffer(duffelOffer());

  it("uma oferta futura não está expirada", () => {
    expect(isOfferExpired(offer)).toBe(false);
  });

  it("uma oferta passada ou sem validade está expirada", () => {
    expect(isOfferExpired({ expiresAt: PAST })).toBe(true);
    expect(isOfferExpired({ expiresAt: null })).toBe(true);
  });

  it("reprice sem alteração", () => {
    expect(compareOffers(offer, normalizeDuffelOffer(duffelOffer())).status).toBe("unchanged");
  });

  it("deteta alteração de preço", () => {
    const r = compareOffers(offer, normalizeDuffelOffer(duffelOffer({ total_amount: "899.00" })));
    expect(r.status).toBe("price_changed");
    expect(r.difference).toBeCloseTo(53.7, 2);
  });

  it("deteta alteração de moeda", () => {
    expect(compareOffers(offer, normalizeDuffelOffer(duffelOffer({ total_currency: "USD" }))).status).toBe("currency_changed");
  });

  it("deteta alteração de itinerário", () => {
    const changed = duffelOffer();
    (changed.slices as any[])[0].segments[0].marketing_carrier_flight_number = "999";
    expect(compareOffers(offer, normalizeDuffelOffer(changed)).status).toBe("itinerary_changed");
  });

  it("deteta oferta expirada e indisponível", () => {
    expect(compareOffers(offer, normalizeDuffelOffer(duffelOffer({ expires_at: PAST }))).status).toBe("expired");
    expect(compareOffers(offer, null).status).toBe("unavailable");
    expect(itineraryKey(offer)).toContain("LIS-TMS");
  });
});

describe("Fase 7E — segurança de preço e integração com o Pricing Engine", () => {
  const offer = normalizeDuffelOffer(duffelOffer());

  it("o Flight Engine devolve custo de fornecedor sem margem", () => {
    const cost = toPricingFlightCost(offer);
    expect(cost.amount).toBe(offer.totalAmount);
    expect(cost.currency).toBe("EUR");
    expect(cost.confirmed).toBe(true);
  });

  it("uma oferta expirada não é custo confirmado", () => {
    expect(toPricingFlightCost(normalizeDuffelOffer(duffelOffer({ expires_at: PAST }))).confirmed).toBe(false);
  });

  it("a margem e a proteção continuam a ser calculadas pelo Pricing Engine", () => {
    const cost = toPricingFlightCost(offer);
    expect(applyMarkup(cost.amount, 10)).toBeCloseTo(929.83, 2);
    expect(applyFlightProtection(cost.amount, { method: "percentage", value: 5 })).toBeCloseTo(42.27, 2);
  });

  it("o modelo normalizado não contém margem, markup nem preço final", () => {
    const keys = Object.keys(offer as unknown as Record<string, unknown>).join(",");
    expect(keys).not.toMatch(/markup|margin|final|sell/i);
  });
});

describe("Fase 7E — mapeamento de erros", () => {
  it("distingue os erros do fornecedor", () => {
    expect(mapDuffelError(401, null).code).toBe("authentication_error");
    expect(mapDuffelError(422, null).code).toBe("invalid_request");
    expect(mapDuffelError(429, null).code).toBe("rate_limit");
    expect(mapDuffelError(503, null).code).toBe("provider_unavailable");
    expect(mapDuffelError(409, { errors: [{ code: "offer_no_longer_available" }] }).code).toBe("offer_no_longer_available");
    expect(mapDuffelError(409, { errors: [{ code: "price_changed" }] }).code).toBe("price_changed");
    expect(mapDuffelError(418, null).code).toBe("unknown_error");
  });

  it("as mensagens não expõem detalhes da API", () => {
    for (const msg of Object.values(FLIGHT_ERROR_MESSAGE)) {
      expect(msg).not.toMatch(/duffel|token|bearer|api\.duffel/i);
    }
  });
});

describe("Fase 7E — DuffelFlightProvider", () => {
  it("sem chave configurada falha em segurança e não inventa ofertas", async () => {
    const p = new DuffelFlightProvider({ apiKey: null });
    expect(p.isConfigured()).toBe(false);
    await expect(p.searchOffers(validateSearchParams({
      origin: "LIS", destination: "TMS", departureDate: "2026-11-02", adults: 1, cabin: "economy",
    }))).rejects.toMatchObject({ code: "provider_not_configured" });
  });

  it("usa sempre test mode e nunca cria orders", async () => {
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc" });
    expect(p.mode).toBe("test");
    await expect(p.createOrder()).rejects.toMatchObject({ code: "unsupported_action" });
  });

  it("faz uma pesquisa válida e normaliza as ofertas", async () => {
    const { impl, calls } = mockFetch(200, { data: { id: "orq_test_1", offers: [duffelOffer(), duffelOffer({ id: "off_test_456", total_amount: "910.00" })] } }, { "x-request-id": "req_1" });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl });
    const offers = await p.searchOffers(validateSearchParams({
      origin: "LIS", destination: "TMS", departureDate: "2026-11-02", returnDate: "2026-11-12", adults: 2, children: 1, cabin: "economy", maxConnections: 1,
    }));
    expect(offers).toHaveLength(2);
    expect(offers[1].providerOfferId).toBe("off_test_456");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.data.slices).toHaveLength(2);
    expect(body.data.passengers).toHaveLength(3);
    expect(body.data.cabin_class).toBe("economy");
    expect(body.data.max_connections).toBe(1);
    expect(p.lastRequestId).toBe("req_1");
  });

  it("não envia dados pessoais na pesquisa", async () => {
    const { impl, calls } = mockFetch(200, { data: { id: "orq_1", offers: [duffelOffer()] } });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl });
    await p.searchOffers(validateSearchParams({ origin: "LIS", destination: "TMS", departureDate: "2026-11-02", adults: 1, cabin: "economy" }));
    const raw = String(calls[0].init.body);
    expect(raw).not.toMatch(/name|email|phone|passport|card/i);
  });

  it("sem resultados devolve no_results", async () => {
    const { impl } = mockFetch(200, { data: { id: "orq_1", offers: [] } });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl });
    await expect(p.searchOffers(validateSearchParams({ origin: "LIS", destination: "TMS", departureDate: "2026-11-02", adults: 1, cabin: "economy" })))
      .rejects.toMatchObject({ code: "no_results" });
  });

  it("erro de autenticação é mapeado sem expor o token", async () => {
    const { impl } = mockFetch(401, { errors: [{ code: "unauthorized" }] });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl });
    await expect(p.getOffer("off_test_123")).rejects.toMatchObject({ code: "authentication_error" });
  });

  it("rejeita identificadores de oferta inválidos", async () => {
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: mockFetch(200, {}).impl });
    await expect(p.getOffer("../../secret")).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("faz retry controlado em rate limit e depois desiste", async () => {
    const { impl, calls } = mockFetch(429, { errors: [{ code: "rate_limit_exceeded" }] });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl, maxRetries: 1 });
    await expect(p.getOffer("off_test_123")).rejects.toMatchObject({ code: "rate_limit" });
    expect(calls).toHaveLength(2);
  });

  it("timeout devolve o erro estruturado", async () => {
    const impl = (async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }) as unknown as typeof fetch;
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl, maxRetries: 0 });
    await expect(p.getOffer("off_test_123")).rejects.toMatchObject({ code: "timeout" });
  });

  it("o token nunca aparece no erro nem na mensagem", async () => {
    const { impl } = mockFetch(500, { errors: [{ code: "internal" }] });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_super_secreto", fetchImpl: impl, maxRetries: 0 });
    const err = await p.getOffer("off_test_123").catch((e) => e as Error);
    expect(JSON.stringify({ msg: err.message, err: String(err) })).not.toContain("duffel_test_super_secreto");
  });

  it("reconsulta a oferta e devolve o modelo normalizado", async () => {
    const { impl } = mockFetch(200, { data: duffelOffer({ total_amount: "860.00" }) });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl });
    const refreshed = await p.refreshOffer("off_test_123");
    expect(refreshed.totalAmount).toBe(860);
  });

  it("lê os requisitos de passageiro sem enviar dados pessoais", async () => {
    const { impl, calls } = mockFetch(200, { data: { ...duffelOffer(), passenger_identity_documents_required: true } });
    const p = new DuffelFlightProvider({ apiKey: "duffel_test_abc", fetchImpl: impl });
    const reqs = await p.getPassengerRequirements("off_test_123");
    expect(reqs.requiresPassportNumber).toBe(true);
    expect(reqs.passengers[0].id).toBe("pas_1");
    expect(calls.every((c) => !c.init.body)).toBe(true);
  });
});

describe("Fase 7E — o cliente nunca controla preço nem provider", () => {
  it("o modelo interno não aceita markup nem preço final do cliente", () => {
    const offer = normalizeDuffelOffer(duffelOffer({ markup: 500, final_price: 9999 } as Record<string, unknown>));
    const asAny = offer as unknown as Record<string, unknown>;
    expect(asAny.markup).toBeUndefined();
    expect(asAny.final_price).toBeUndefined();
    expect(offer.totalAmount).toBe(845.3);
  });

  it("uma oferta sem id é rejeitada", () => {
    expect(() => normalizeDuffelOffer({} as Record<string, unknown>)).toThrow(FlightProviderError);
  });
});

describe("Fase 7E — regressão", () => {
  it("as fórmulas do Pricing Engine mantêm-se intactas", () => {
    expect(applyMarkup(100, 25)).toBe(125);
    expect(applyFlightProtection(1000, { method: "percentage", value: 3 })).toBe(30);
  });

  it("nenhuma oferta expirada pode alimentar uma reserva futura", () => {
    const expired: NormalizedFlightOffer = normalizeDuffelOffer(duffelOffer({ expires_at: PAST }));
    expect(isOfferExpired(expired)).toBe(true);
    expect(toPricingFlightCost(expired).confirmed).toBe(false);
  });
});
