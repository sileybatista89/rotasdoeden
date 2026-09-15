/**
 * Fase 11 — Abstração de fornecedor de alojamento (server-side).
 *
 * Este ficheiro NÃO conhece a Duffel. Define apenas:
 *  - o modelo interno normalizado de resultados, quartos, tarifas e quotes;
 *  - a interface AccommodationProvider;
 *  - validação de parâmetros, expiry e erros estruturados.
 *
 * Os valores devolvidos são CUSTO DE FORNECEDOR (ou preço público quando o
 * fornecedor o distingue). Nunca contêm margem: essa responsabilidade é
 * exclusiva do Pricing Engine.
 *
 * Nenhuma reserva é criada aqui. Booking live está fora de âmbito.
 */

export type AccommodationProviderId = "duffel_stays";

export type StaysErrorCode =
  | "provider_not_configured"
  | "provider_not_enabled"
  | "provider_unavailable"
  | "authentication_error"
  | "invalid_request"
  | "rate_expired"
  | "rate_no_longer_available"
  | "price_changed"
  | "no_results"
  | "timeout"
  | "rate_limit"
  | "unsupported_action"
  | "unknown_error";

export const STAYS_ERROR_MESSAGE: Record<StaysErrorCode, string> = {
  provider_not_configured: "Fornecedor de alojamento não configurado.",
  provider_not_enabled: "Acesso a alojamento em tempo real ainda não ativado.",
  provider_unavailable: "Fornecedor de alojamento indisponível de momento.",
  authentication_error: "Credenciais do fornecedor de alojamento inválidas.",
  invalid_request: "Parâmetros de pesquisa inválidos.",
  rate_expired: "A tarifa expirou. É necessária nova pesquisa.",
  rate_no_longer_available: "A tarifa já não está disponível.",
  price_changed: "O preço da tarifa mudou.",
  no_results: "Sem alojamentos para esta pesquisa.",
  timeout: "O fornecedor demorou demasiado a responder.",
  rate_limit: "Demasiados pedidos ao fornecedor. Tenta novamente mais tarde.",
  unsupported_action: "Operação não suportada nesta fase.",
  unknown_error: "Erro inesperado no fornecedor de alojamento.",
};

export class StaysProviderError extends Error {
  code: StaysErrorCode;
  status: number;
  requestId: string | null;
  constructor(code: StaysErrorCode, status = 400, requestId: string | null = null) {
    super(STAYS_ERROR_MESSAGE[code]);
    this.name = "StaysProviderError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export interface StaysSearchParams {
  /** Localização por coordenadas com raio (km) — suportado pela maioria dos fornecedores. */
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms?: number;
  maxResults?: number;
}

export interface NormalizedStayRate {
  providerRateId: string;
  /** CUSTO total da estadia para a ocupação pedida. Nunca preço de venda. */
  totalAmount: number;
  totalCurrency: string;
  taxAmount: number | null;
  feeAmount: number | null;
  dueAtAccommodationAmount: number | null;
  /** Preço público anunciado pelo fornecedor, quando existe. Nunca é o custo. */
  publicAmount: number | null;
  publicCurrency: string | null;
  boardType: string | null;
  cancellationType: "refundable" | "non_refundable" | "partially_refundable" | "unknown";
  cancellationSummary: string | null;
  paymentType: string | null;
  availableRooms: number | null;
  expiresAt: string | null;
}

export interface NormalizedStayRoom {
  name: string | null;
  beds: string | null;
  rates: NormalizedStayRate[];
}

export interface NormalizedStayResult {
  provider: AccommodationProviderId;
  providerSearchResultId: string;
  accommodationName: string;
  providerAccommodationId: string | null;
  address: string | null;
  locality: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: NormalizedStayRoom[];
  /** Menor custo total encontrado, para ordenação interna. */
  cheapestTotalAmount: number | null;
  cheapestCurrency: string | null;
  retrievedAt: string;
}

export interface NormalizedStayQuote {
  provider: AccommodationProviderId;
  providerQuoteId: string;
  providerRateId: string;
  accommodationName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  totalAmount: number;
  totalCurrency: string;
  taxAmount: number | null;
  feeAmount: number | null;
  dueAtAccommodationAmount: number | null;
  publicAmount: number | null;
  publicCurrency: string | null;
  boardType: string | null;
  cancellationType: NormalizedStayRate["cancellationType"];
  cancellationSummary: string | null;
  adults: number | null;
  rooms: number | null;
  expiresAt: string | null;
  retrievedAt: string;
}

/** Interface que qualquer fornecedor de alojamento tem de implementar. */
export interface AccommodationProvider {
  readonly id: AccommodationProviderId;
  readonly mode: "test" | "live";
  isConfigured(): boolean;
  isEnabled(): boolean;
  search(params: StaysSearchParams): Promise<NormalizedStayResult[]>;
  getRates(providerSearchResultId: string): Promise<NormalizedStayResult>;
  createQuote(providerRateId: string): Promise<NormalizedStayQuote>;
  /** Fase futura e protegida — nunca disponível nesta fase. */
  createBooking(...args: unknown[]): Promise<never>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateStaysSearch(raw: Partial<StaysSearchParams>): StaysSearchParams {
  const checkIn = String(raw.checkIn ?? "").trim();
  const checkOut = String(raw.checkOut ?? "").trim();
  if (!ISO_DATE.test(checkIn) || Number.isNaN(Date.parse(checkIn))) throw new StaysProviderError("invalid_request", 400);
  if (!ISO_DATE.test(checkOut) || Number.isNaN(Date.parse(checkOut))) throw new StaysProviderError("invalid_request", 400);
  if (checkOut <= checkIn) throw new StaysProviderError("invalid_request", 400);

  const adults = Math.trunc(Number(raw.adults ?? 0));
  if (!Number.isFinite(adults) || adults < 1 || adults > 9) throw new StaysProviderError("invalid_request", 400);
  const rooms = Math.min(Math.max(Math.trunc(Number(raw.rooms ?? 1)) || 1, 1), 5);

  const latitude = raw.latitude == null ? null : Number(raw.latitude);
  const longitude = raw.longitude == null ? null : Number(raw.longitude);
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new StaysProviderError("invalid_request", 400);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new StaysProviderError("invalid_request", 400);
  }
  const radiusKm = Math.min(Math.max(Math.trunc(Number(raw.radiusKm ?? 20)) || 20, 1), 100);
  const maxResults = Math.min(Math.max(Math.trunc(Number(raw.maxResults ?? 20)) || 20, 1), 50);

  return { latitude, longitude, radiusKm, checkIn, checkOut, adults, rooms, maxResults };
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(Math.round((b - a) / 86_400_000), 0);
}

export function isStayRateExpired(rate: { expiresAt?: string | null }, now = new Date()): boolean {
  if (!rate.expiresAt) return false;
  const t = Date.parse(rate.expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

/**
 * Custo por noite/quarto entregue ao registo de tarifas.
 * O preço público do fornecedor nunca substitui o custo.
 */
export function toRatePerNight(quote: { totalAmount: number }, nights: number, rooms = 1): number {
  const divisor = Math.max(nights, 1) * Math.max(rooms, 1);
  return Number((quote.totalAmount / divisor).toFixed(2));
}
