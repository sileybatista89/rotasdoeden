/**
 * Fase 11 — Implementação Duffel Stays do AccommodationProvider.
 *
 * Fluxo suportado: search -> rates -> quote. NÃO cria bookings nem pagamentos.
 * O acesso a Stays tem de ser pedido à Duffel; enquanto não estiver aprovado
 * o provider comporta-se como "não ativado" e nada é inventado.
 *
 * Ativação futura: definir DUFFEL_STAYS_ENABLED=true e a credencial
 * DUFFEL_STAYS_TOKEN (ou reutilizar DUFFEL_API_KEY). Sem refatoração.
 */
import {
  StaysProviderError,
  nightsBetween,
  type AccommodationProvider,
  type NormalizedStayQuote,
  type NormalizedStayRate,
  type NormalizedStayResult,
  type NormalizedStayRoom,
  type StaysSearchParams,
} from "./accommodation-provider.ts";

const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapStaysError(status: number, body: unknown): StaysProviderError {
  const errors = (body as { errors?: { type?: string; code?: string }[] } | null)?.errors ?? [];
  const code = errors[0]?.code ?? "";
  if (code === "rate_no_longer_available" || code === "search_result_not_found") {
    return new StaysProviderError("rate_no_longer_available", 409);
  }
  if (code === "rate_expired") return new StaysProviderError("rate_expired", 409);
  if (code === "price_changed") return new StaysProviderError("price_changed", 409);
  if (status === 401 || status === 403) return new StaysProviderError("authentication_error", 502);
  if (status === 404) return new StaysProviderError("rate_no_longer_available", 404);
  if (status === 422 || status === 400) return new StaysProviderError("invalid_request", 400);
  if (status === 429) return new StaysProviderError("rate_limit", 429);
  if (status >= 500) return new StaysProviderError("provider_unavailable", 502);
  return new StaysProviderError("unknown_error", 502);
}

function cancellationOf(rate: Record<string, any>): {
  type: NormalizedStayRate["cancellationType"];
  summary: string | null;
} {
  const timeline = Array.isArray(rate.cancellation_timeline) ? rate.cancellation_timeline : [];
  if (timeline.length === 0) return { type: "unknown", summary: null };
  const refundables = timeline.filter((t: Record<string, any>) => num(t.refund_amount) !== null && Number(t.refund_amount) > 0);
  const summary = timeline
    .map((t: Record<string, any>) => `até ${t.before ?? "?"}: reembolso ${t.refund_amount ?? "?"} ${t.currency ?? ""}`.trim())
    .slice(0, 3)
    .join(" · ");
  if (refundables.length === 0) return { type: "non_refundable", summary };
  if (refundables.length === timeline.length) return { type: "refundable", summary };
  return { type: "partially_refundable", summary };
}

export function normalizeDuffelStayRate(rate: Record<string, any>): NormalizedStayRate {
  const cancellation = cancellationOf(rate);
  return {
    providerRateId: String(rate.id ?? ""),
    totalAmount: num(rate.total_amount) ?? 0,
    totalCurrency: String(rate.total_currency ?? "").toUpperCase(),
    taxAmount: num(rate.tax_amount),
    feeAmount: num(rate.fee_amount),
    dueAtAccommodationAmount: num(rate.due_at_accommodation_amount),
    // Preço público anunciado — referência, nunca o custo final.
    publicAmount: num(rate.public_amount),
    publicCurrency: rate.public_currency ? String(rate.public_currency).toUpperCase() : null,
    boardType: rate.board_type ?? null,
    cancellationType: cancellation.type,
    cancellationSummary: cancellation.summary,
    paymentType: rate.payment_type ?? null,
    availableRooms: num(rate.available_rooms),
    expiresAt: rate.expires_at ?? null,
  };
}

export function normalizeDuffelStayResult(result: Record<string, any>): NormalizedStayResult {
  const acc = result.accommodation ?? {};
  const rooms: NormalizedStayRoom[] = Array.isArray(acc.rooms)
    ? acc.rooms.map((r: Record<string, any>) => ({
        name: r.name ?? null,
        beds: Array.isArray(r.beds)
          ? r.beds.map((b: Record<string, any>) => `${b.count ?? 1}× ${b.type ?? "cama"}`).join(", ")
          : null,
        rates: Array.isArray(r.rates) ? r.rates.map(normalizeDuffelStayRate) : [],
      }))
    : [];

  const allRates = rooms.flatMap((r) => r.rates).filter((r) => r.totalAmount > 0);
  allRates.sort((a, b) => a.totalAmount - b.totalAmount);
  const checkIn = String(result.check_in_date ?? "");
  const checkOut = String(result.check_out_date ?? "");

  return {
    provider: "duffel_stays",
    providerSearchResultId: String(result.id ?? ""),
    accommodationName: acc.name ?? "",
    providerAccommodationId: acc.id ?? null,
    address: acc.location?.address?.line_one ?? null,
    locality: acc.location?.address?.city_name ?? null,
    country: acc.location?.address?.country_code ?? null,
    latitude: num(acc.location?.geographic_coordinates?.latitude),
    longitude: num(acc.location?.geographic_coordinates?.longitude),
    rating: num(acc.rating),
    checkIn,
    checkOut,
    nights: nightsBetween(checkIn, checkOut),
    rooms,
    cheapestTotalAmount: allRates[0]?.totalAmount ?? null,
    cheapestCurrency: allRates[0]?.totalCurrency ?? null,
    retrievedAt: new Date().toISOString(),
  };
}

export function normalizeDuffelStayQuote(quote: Record<string, any>): NormalizedStayQuote {
  const cancellation = cancellationOf(quote);
  return {
    provider: "duffel_stays",
    providerQuoteId: String(quote.id ?? ""),
    providerRateId: String(quote.rate_id ?? ""),
    accommodationName: quote.accommodation?.name ?? null,
    checkIn: quote.check_in_date ?? null,
    checkOut: quote.check_out_date ?? null,
    totalAmount: num(quote.total_amount) ?? 0,
    totalCurrency: String(quote.total_currency ?? "").toUpperCase(),
    taxAmount: num(quote.tax_amount),
    feeAmount: num(quote.fee_amount),
    dueAtAccommodationAmount: num(quote.due_at_accommodation_amount),
    publicAmount: num(quote.public_amount),
    publicCurrency: quote.public_currency ? String(quote.public_currency).toUpperCase() : null,
    boardType: quote.board_type ?? null,
    cancellationType: cancellation.type,
    cancellationSummary: cancellation.summary,
    adults: num(quote.guests?.length ?? quote.adults),
    rooms: num(quote.rooms),
    expiresAt: quote.expires_at ?? null,
    retrievedAt: new Date().toISOString(),
  };
}

export interface DuffelStaysOptions {
  apiKey: string | null | undefined;
  /** Feature flag: só ativa quando o acesso Stays estiver aprovado. */
  enabled?: boolean;
  mode?: "test" | "live";
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export class DuffelStaysProvider implements AccommodationProvider {
  readonly id = "duffel_stays" as const;
  readonly mode: "test" | "live";
  private apiKey: string | null;
  private enabled: boolean;
  private timeoutMs: number;
  private maxRetries: number;
  private fetchImpl: typeof fetch;
  lastRequestId: string | null = null;

  constructor(opts: DuffelStaysOptions) {
    this.apiKey = opts.apiKey?.trim() || null;
    this.enabled = opts.enabled === true;
    this.mode = opts.mode ?? "test";
    this.timeoutMs = opts.timeoutMs ?? 25000;
    this.maxRetries = opts.maxRetries ?? 1;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  isEnabled(): boolean {
    return this.enabled && this.isConfigured();
  }

  private ensureReady() {
    if (!this.isConfigured()) throw new StaysProviderError("provider_not_configured", 503);
    if (!this.enabled) throw new StaysProviderError("provider_not_enabled", 503);
  }

  private async request(path: string, init: RequestInit = {}, attempt = 0): Promise<any> {
    this.ensureReady();
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
      this.lastRequestId = res.headers?.get?.("x-request-id") ?? null;
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const err = mapStaysError(res.status, body);
        if ((err.code === "provider_unavailable" || err.code === "rate_limit") && attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          return this.request(path, init, attempt + 1);
        }
        err.requestId = this.lastRequestId;
        throw err;
      }
      return body;
    } catch (e) {
      if (e instanceof StaysProviderError) throw e;
      if ((e as Error)?.name === "AbortError") {
        if (attempt < this.maxRetries) return this.request(path, init, attempt + 1);
        throw new StaysProviderError("timeout", 504);
      }
      throw new StaysProviderError("provider_unavailable", 502);
    } finally {
      clearTimeout(timer);
    }
  }

  async search(p: StaysSearchParams): Promise<NormalizedStayResult[]> {
    const payload = {
      data: {
        check_in_date: p.checkIn,
        check_out_date: p.checkOut,
        rooms: p.rooms ?? 1,
        guests: Array.from({ length: p.adults }, () => ({ type: "adult" })),
        location: {
          radius: p.radiusKm ?? 20,
          geographic_coordinates: { latitude: p.latitude, longitude: p.longitude },
        },
      },
    };
    const body = await this.request(`/stays/search`, { method: "POST", body: JSON.stringify(payload) });
    const results: Record<string, any>[] = Array.isArray(body?.data?.results) ? body.data.results : [];
    if (results.length === 0) throw new StaysProviderError("no_results", 404);
    return results.slice(0, p.maxResults ?? 20).map(normalizeDuffelStayResult);
  }

  async getRates(providerSearchResultId: string): Promise<NormalizedStayResult> {
    if (!providerSearchResultId) throw new StaysProviderError("invalid_request", 400);
    const body = await this.request(
      `/stays/search_results/${providerSearchResultId}/actions/fetch_all_rates`,
      { method: "POST" },
    );
    return normalizeDuffelStayResult(body?.data ?? {});
  }

  async createQuote(providerRateId: string): Promise<NormalizedStayQuote> {
    if (!providerRateId) throw new StaysProviderError("invalid_request", 400);
    const body = await this.request(`/stays/quotes`, {
      method: "POST",
      body: JSON.stringify({ data: { rate_id: providerRateId } }),
    });
    return normalizeDuffelStayQuote(body?.data ?? {});
  }

  /** Reserva live bloqueada por desenho nesta fase. */
  createBooking(): Promise<never> {
    return Promise.reject(new StaysProviderError("unsupported_action", 403));
  }
}
