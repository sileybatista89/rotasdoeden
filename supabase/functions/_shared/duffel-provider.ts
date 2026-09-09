/**
 * Fase 7E — Implementação Duffel do FlightProvider. APENAS TEST MODE.
 *
 * O token é injetado no construtor (nunca lido no frontend, nunca registado).
 * Não cria orders, não paga, não emite bilhetes.
 */
import {
  FlightProviderError,
  type FlightProvider,
  type FlightSearchParams,
  type NormalizedFlightOffer,
  type NormalizedSegment,
  type NormalizedSlice,
  type PassengerRequirements,
} from "./flight-provider.ts";

const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Traduz o erro HTTP/estrutural da Duffel para o nosso código interno. */
export function mapDuffelError(status: number, body: unknown): FlightProviderError {
  const errors = (body as { errors?: { type?: string; code?: string }[] } | null)?.errors ?? [];
  const code = errors[0]?.code ?? "";
  if (code === "offer_no_longer_available" || code === "offer_request_not_found") {
    return new FlightProviderError("offer_no_longer_available", 409);
  }
  if (code === "offer_expired") return new FlightProviderError("offer_expired", 409);
  if (code === "price_changed") return new FlightProviderError("price_changed", 409);
  if (status === 401 || status === 403) return new FlightProviderError("authentication_error", 502);
  if (status === 404) return new FlightProviderError("offer_no_longer_available", 404);
  if (status === 422 || status === 400) return new FlightProviderError("invalid_request", 400);
  if (status === 429) return new FlightProviderError("rate_limit", 429);
  if (status >= 500) return new FlightProviderError("provider_unavailable", 502);
  return new FlightProviderError("unknown_error", 502);
}

function normalizeSegment(seg: Record<string, any>): NormalizedSegment {
  const passenger = Array.isArray(seg.passengers) ? seg.passengers[0] ?? {} : {};
  return {
    origin: seg.origin?.iata_code ?? "",
    destination: seg.destination?.iata_code ?? "",
    departingAt: seg.departing_at ?? null,
    arrivingAt: seg.arriving_at ?? null,
    marketingCarrier: seg.marketing_carrier?.iata_code ?? null,
    marketingCarrierName: seg.marketing_carrier?.name ?? null,
    marketingFlightNumber: seg.marketing_carrier_flight_number ?? null,
    operatingCarrier: seg.operating_carrier?.iata_code ?? null,
    operatingCarrierName: seg.operating_carrier?.name ?? null,
    aircraft: seg.aircraft?.name ?? null,
    duration: seg.duration ?? null,
    baggage: Array.isArray(passenger.baggages)
      ? passenger.baggages.map((b: Record<string, any>) => ({ type: b.type ?? "unknown", quantity: Number(b.quantity ?? 0) }))
      : [],
    cabinClass: passenger.cabin_class ?? passenger.cabin?.name ?? null,
    fareBasis: passenger.fare_basis_code ?? null,
  };
}

function normalizeSlice(slice: Record<string, any>): NormalizedSlice {
  return {
    origin: slice.origin?.iata_code ?? "",
    destination: slice.destination?.iata_code ?? "",
    duration: slice.duration ?? null,
    segments: Array.isArray(slice.segments) ? slice.segments.map(normalizeSegment) : [],
  };
}

/** Duffel → modelo interno normalizado. Função pura e testável. */
export function normalizeDuffelOffer(offer: Record<string, any>, offerRequestId?: string | null): NormalizedFlightOffer {
  if (!offer?.id) throw new FlightProviderError("unknown_error", 502);
  const pr = offer.payment_requirements ?? {};
  const requiresInstantPayment = pr.requires_instant_payment !== false;
  const slices: NormalizedSlice[] = Array.isArray(offer.slices) ? offer.slices.map(normalizeSlice) : [];
  const firstSlice = Array.isArray(offer.slices) ? offer.slices[0] ?? {} : {};
  const firstSegPassenger = firstSlice?.segments?.[0]?.passengers?.[0] ?? {};

  return {
    provider: "duffel",
    providerOfferId: offer.id,
    providerOfferRequestId: offer.offer_request_id ?? offerRequestId ?? null,
    totalAmount: num(offer.total_amount) ?? 0,
    totalCurrency: String(offer.total_currency ?? "").toUpperCase(),
    taxAmount: num(offer.tax_amount),
    baseAmount: num(offer.base_amount),
    owner: offer.owner?.iata_code ?? null,
    ownerName: offer.owner?.name ?? null,
    createdAt: offer.created_at ?? new Date().toISOString(),
    expiresAt: offer.expires_at ?? null,
    slices,
    services: Array.isArray(offer.available_services)
      ? offer.available_services.map((s: Record<string, any>) => ({
        type: s.type ?? "unknown",
        total_amount: num(s.total_amount),
        currency: s.total_currency ?? null,
      }))
      : [],
    fareConditions: {
      conditions: offer.conditions ?? null,
      slice_conditions: Array.isArray(offer.slices) ? offer.slices.map((s: Record<string, any>) => s.conditions ?? null) : [],
      fare_brand_name: firstSegPassenger.fare_brand_name ?? firstSlice.fare_brand_name ?? null,
      partial: offer.partial ?? null,
    },
    paymentRequirements: {
      requiresInstantPayment,
      paymentRequiredBy: pr.payment_required_by ?? null,
      priceGuaranteeExpiresAt: pr.price_guarantee_expires_at ?? null,
    },
    holdCapable: requiresInstantPayment === false,
    passengerIds: Array.isArray(offer.passengers) ? offer.passengers.map((p: Record<string, any>) => p.id) : [],
  };
}

export interface DuffelOptions {
  apiKey: string | null | undefined;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export class DuffelFlightProvider implements FlightProvider {
  readonly id = "duffel" as const;
  /** Fase 7E: exclusivamente test mode. */
  readonly mode = "test" as const;
  private apiKey: string | null;
  private timeoutMs: number;
  private maxRetries: number;
  private fetchImpl: typeof fetch;
  lastRequestId: string | null = null;
  lastDurationMs = 0;

  constructor(opts: DuffelOptions) {
    this.apiKey = opts.apiKey?.trim() || null;
    this.timeoutMs = opts.timeoutMs ?? 20000;
    this.maxRetries = opts.maxRetries ?? 1;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async request(path: string, init: RequestInit = {}, attempt = 0): Promise<any> {
    if (!this.apiKey) throw new FlightProviderError("provider_not_configured", 503);
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${DUFFEL_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Duffel-Version": DUFFEL_VERSION,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });
      this.lastDurationMs = Date.now() - started;
      this.lastRequestId = res.headers?.get?.("x-request-id") ?? null;
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const err = mapDuffelError(res.status, body);
        // Retry controlado apenas para falhas transitórias.
        if ((err.code === "provider_unavailable" || err.code === "rate_limit") && attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          return this.request(path, init, attempt + 1);
        }
        err.requestId = this.lastRequestId;
        throw err;
      }
      return body;
    } catch (e) {
      this.lastDurationMs = Date.now() - started;
      if (e instanceof FlightProviderError) throw e;
      if ((e as Error)?.name === "AbortError") {
        if (attempt < this.maxRetries) return this.request(path, init, attempt + 1);
        throw new FlightProviderError("timeout", 504);
      }
      throw new FlightProviderError("provider_unavailable", 502);
    } finally {
      clearTimeout(timer);
    }
  }

  async searchOffers(p: FlightSearchParams): Promise<NormalizedFlightOffer[]> {
    const slices = [{ origin: p.origin, destination: p.destination, departure_date: p.departureDate }];
    if (p.returnDate) slices.push({ origin: p.destination, destination: p.origin, departure_date: p.returnDate });

    const passengers: { type: string }[] = [];
    for (let i = 0; i < p.adults; i++) passengers.push({ type: "adult" });
    for (let i = 0; i < (p.children ?? 0); i++) passengers.push({ type: "child" });
    for (let i = 0; i < (p.infants ?? 0); i++) passengers.push({ type: "infant_without_seat" });

    const payload: Record<string, unknown> = {
      data: {
        slices,
        passengers,
        cabin_class: p.cabin,
        ...(p.maxConnections !== null && p.maxConnections !== undefined ? { max_connections: p.maxConnections } : {}),
      },
    };

    const body = await this.request(
      `/air/offer_requests?return_offers=true&supplier_timeout=15000`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const data = body?.data ?? {};
    const offers: Record<string, any>[] = Array.isArray(data.offers) ? data.offers : [];
    if (offers.length === 0) throw new FlightProviderError("no_results", 404);
    return offers
      .slice(0, p.maxResults ?? 20)
      .map((o) => normalizeDuffelOffer(o, data.id ?? null));
  }

  async getOffer(providerOfferId: string): Promise<NormalizedFlightOffer> {
    if (!/^off_[A-Za-z0-9_-]+$/.test(providerOfferId)) throw new FlightProviderError("invalid_request", 400);
    const body = await this.request(`/air/offers/${providerOfferId}?return_available_services=true`);
    return normalizeDuffelOffer(body?.data ?? {});
  }

  /** A Duffel repreça a oferta ao ser lida novamente. */
  async refreshOffer(providerOfferId: string): Promise<NormalizedFlightOffer> {
    return this.getOffer(providerOfferId);
  }

  async getPassengerRequirements(providerOfferId: string): Promise<PassengerRequirements> {
    const offer = await this.getOffer(providerOfferId);
    const body = await this.request(`/air/offers/${providerOfferId}`);
    const raw = body?.data ?? {};
    return {
      providerOfferId: offer.providerOfferId,
      requiresPassportNumber: raw.passenger_identity_documents_required === true,
      requiresKnownTravellerNumber: raw.supported_passenger_identity_document_types?.includes?.("known_traveler_number") === true,
      passengers: Array.isArray(raw.passengers)
        ? raw.passengers.map((p: Record<string, any>) => ({ id: p.id, type: p.type ?? null, age: p.age ?? null }))
        : [],
    };
  }

  /** Fase futura. Bloqueado por design na Fase 7E. */
  createOrder(): Promise<never> {
    return Promise.reject(new FlightProviderError("unsupported_action", 403));
  }
}
