/**
 * Fase 7E — Abstração de fornecedor aéreo (server-side).
 *
 * Este ficheiro NÃO conhece a Duffel. Define apenas:
 *  - o modelo interno normalizado de ofertas;
 *  - a interface FlightProvider;
 *  - validação de parâmetros, expiry, cache key e comparação de reprice;
 *  - erros estruturados.
 *
 * O custo devolvido é sempre CUSTO DE FORNECEDOR AÉREO.
 * Nunca contém margem, markup, proteção nem preço final ao cliente:
 * essa responsabilidade é exclusiva do Pricing Engine (Fase 7D).
 */

export type FlightProviderId = "duffel";

export type FlightErrorCode =
  | "provider_not_configured"
  | "provider_unavailable"
  | "authentication_error"
  | "invalid_request"
  | "offer_expired"
  | "offer_no_longer_available"
  | "price_changed"
  | "no_results"
  | "timeout"
  | "rate_limit"
  | "unsupported_action"
  | "unknown_error";

/** Mensagens seguras para o utilizador — nunca expõem detalhes da API. */
export const FLIGHT_ERROR_MESSAGE: Record<FlightErrorCode, string> = {
  provider_not_configured: "Fornecedor de voos não configurado.",
  provider_unavailable: "Fornecedor de voos indisponível de momento.",
  authentication_error: "Credenciais do fornecedor de voos inválidas.",
  invalid_request: "Parâmetros de pesquisa inválidos.",
  offer_expired: "A oferta expirou. É necessária nova pesquisa.",
  offer_no_longer_available: "A oferta já não está disponível.",
  price_changed: "O preço da oferta mudou.",
  no_results: "Sem resultados para esta pesquisa.",
  timeout: "O fornecedor demorou demasiado a responder.",
  rate_limit: "Demasiados pedidos ao fornecedor. Tenta novamente mais tarde.",
  unsupported_action: "Operação não suportada nesta fase.",
  unknown_error: "Erro inesperado no fornecedor de voos.",
};

export class FlightProviderError extends Error {
  code: FlightErrorCode;
  status: number;
  requestId: string | null;
  constructor(code: FlightErrorCode, status = 400, requestId: string | null = null) {
    super(FLIGHT_ERROR_MESSAGE[code]);
    this.name = "FlightProviderError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export const CABIN_CLASSES: CabinClass[] = ["economy", "premium_economy", "business", "first"];

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  children?: number;
  infants?: number;
  cabin: CabinClass;
  maxConnections?: number | null;
  maxResults?: number;
}

export interface NormalizedSegment {
  origin: string;
  destination: string;
  departingAt: string | null;
  arrivingAt: string | null;
  marketingCarrier: string | null;
  marketingCarrierName: string | null;
  marketingFlightNumber: string | null;
  operatingCarrier: string | null;
  operatingCarrierName: string | null;
  aircraft: string | null;
  duration: string | null;
  baggage: { type: string; quantity: number }[];
  cabinClass: string | null;
  fareBasis: string | null;
}

export interface NormalizedSlice {
  origin: string;
  destination: string;
  duration: string | null;
  segments: NormalizedSegment[];
}

export interface NormalizedFlightOffer {
  provider: FlightProviderId;
  providerOfferId: string;
  providerOfferRequestId: string | null;
  /** CUSTO de fornecedor. Nunca preço final ao cliente. */
  totalAmount: number;
  totalCurrency: string;
  taxAmount: number | null;
  baseAmount: number | null;
  owner: string | null;
  ownerName: string | null;
  createdAt: string;
  expiresAt: string | null;
  slices: NormalizedSlice[];
  services: { type: string; total_amount: number | null; currency: string | null }[];
  fareConditions: Record<string, unknown>;
  paymentRequirements: {
    requiresInstantPayment: boolean;
    paymentRequiredBy: string | null;
    priceGuaranteeExpiresAt: string | null;
  };
  holdCapable: boolean;
  passengerIds: string[];
}

export interface PassengerRequirements {
  providerOfferId: string;
  requiresPassportNumber: boolean;
  requiresKnownTravellerNumber: boolean;
  passengers: { id: string; type: string | null; age: number | null }[];
}

export interface RepriceResult {
  status: "unchanged" | "price_changed" | "currency_changed" | "itinerary_changed" | "expired" | "unavailable";
  previous: { amount: number; currency: string; itineraryKey: string };
  current: { amount: number; currency: string; itineraryKey: string } | null;
  difference: number | null;
  offer: NormalizedFlightOffer | null;
}

/** Interface que qualquer fornecedor aéreo tem de implementar. */
export interface FlightProvider {
  readonly id: FlightProviderId;
  readonly mode: "test" | "live";
  isConfigured(): boolean;
  searchOffers(params: FlightSearchParams): Promise<NormalizedFlightOffer[]>;
  getOffer(providerOfferId: string): Promise<NormalizedFlightOffer>;
  refreshOffer(providerOfferId: string): Promise<NormalizedFlightOffer>;
  getPassengerRequirements(providerOfferId: string): Promise<PassengerRequirements>;
  /** Fase futura e protegida — nunca disponível na Fase 7E. */
  createOrder(...args: unknown[]): Promise<never>;
}

const IATA = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateSearchParams(raw: Partial<FlightSearchParams>): FlightSearchParams {
  const origin = String(raw.origin ?? "").trim().toUpperCase();
  const destination = String(raw.destination ?? "").trim().toUpperCase();
  if (!IATA.test(origin) || !IATA.test(destination)) throw new FlightProviderError("invalid_request", 400);
  if (origin === destination) throw new FlightProviderError("invalid_request", 400);

  const departureDate = String(raw.departureDate ?? "").trim();
  if (!ISO_DATE.test(departureDate) || Number.isNaN(Date.parse(departureDate))) {
    throw new FlightProviderError("invalid_request", 400);
  }
  const returnDate = raw.returnDate ? String(raw.returnDate).trim() : null;
  if (returnDate) {
    if (!ISO_DATE.test(returnDate) || Number.isNaN(Date.parse(returnDate))) {
      throw new FlightProviderError("invalid_request", 400);
    }
    if (returnDate < departureDate) throw new FlightProviderError("invalid_request", 400);
  }

  const adults = Math.trunc(Number(raw.adults ?? 0));
  const children = Math.trunc(Number(raw.children ?? 0));
  const infants = Math.trunc(Number(raw.infants ?? 0));
  if (!Number.isFinite(adults) || adults < 1 || adults > 9) throw new FlightProviderError("invalid_request", 400);
  if (children < 0 || infants < 0) throw new FlightProviderError("invalid_request", 400);
  if (adults + children + infants > 9) throw new FlightProviderError("invalid_request", 400);
  if (infants > adults) throw new FlightProviderError("invalid_request", 400);

  const cabin = (raw.cabin ?? "economy") as CabinClass;
  if (!CABIN_CLASSES.includes(cabin)) throw new FlightProviderError("invalid_request", 400);

  const maxConnections = raw.maxConnections === null || raw.maxConnections === undefined
    ? null
    : Math.trunc(Number(raw.maxConnections));
  if (maxConnections !== null && (maxConnections < 0 || maxConnections > 2)) {
    throw new FlightProviderError("invalid_request", 400);
  }

  const maxResults = Math.min(Math.max(Math.trunc(Number(raw.maxResults ?? 20)) || 20, 1), 50);

  return { origin, destination, departureDate, returnDate, adults, children, infants, cabin, maxConnections, maxResults };
}

/** Chave determinística de cache: provider + parâmetros de pesquisa. */
export function searchCacheKey(provider: FlightProviderId, p: FlightSearchParams): string {
  return [
    provider, p.origin, p.destination, p.departureDate, p.returnDate ?? "-",
    p.adults, p.children ?? 0, p.infants ?? 0, p.cabin,
    p.maxConnections ?? "-",
  ].join("|");
}

export function isOfferExpired(offer: { expiresAt?: string | null; expires_at?: string | null }, now = new Date()): boolean {
  const raw = offer.expiresAt ?? offer.expires_at ?? null;
  if (!raw) return true;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

export function itineraryKey(offer: NormalizedFlightOffer): string {
  return offer.slices
    .map((s) =>
      s.segments
        .map((g) => `${g.marketingCarrier ?? "?"}${g.marketingFlightNumber ?? "?"}:${g.origin}-${g.destination}:${g.departingAt ?? "?"}`)
        .join(">")
    )
    .join("||");
}

export function compareOffers(previous: NormalizedFlightOffer, current: NormalizedFlightOffer | null): RepriceResult {
  const prev = { amount: previous.totalAmount, currency: previous.totalCurrency, itineraryKey: itineraryKey(previous) };
  if (!current) {
    return { status: "unavailable", previous: prev, current: null, difference: null, offer: null };
  }
  const cur = { amount: current.totalAmount, currency: current.totalCurrency, itineraryKey: itineraryKey(current) };
  const difference = Number((cur.amount - prev.amount).toFixed(2));
  let status: RepriceResult["status"] = "unchanged";
  if (isOfferExpired(current)) status = "expired";
  else if (cur.currency !== prev.currency) status = "currency_changed";
  else if (cur.itineraryKey !== prev.itineraryKey) status = "itinerary_changed";
  else if (Math.abs(difference) > 0.009) status = "price_changed";
  return { status, previous: prev, current: cur, difference, offer: current };
}

/**
 * Custo aéreo entregue ao Pricing Engine.
 * Estrutura idêntica à já aceite pelo Pricing Engine na Fase 7D —
 * nenhuma regra de margem é aqui aplicada nem duplicada.
 */
export function toPricingFlightCost(
  offer: NormalizedFlightOffer,
  now = new Date(),
): { amount: number; currency: string; confirmed: boolean } {
  return {
    amount: offer.totalAmount,
    currency: offer.totalCurrency,
    // Só é "confirmado" enquanto a oferta do fornecedor continuar válida.
    confirmed: !isOfferExpired(offer, now),
  };
}
