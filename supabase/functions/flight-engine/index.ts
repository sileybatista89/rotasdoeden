/**
 * Fase 7E — Flight Engine (server-side, apenas administradores).
 *
 * Ações: config, search, get_offer, refresh_offer, passenger_requirements,
 * pricing_flight_cost.
 *
 * Duffel APENAS em TEST MODE. Nunca cria orders, nunca paga, nunca emite.
 * O token nunca sai do servidor e nunca é registado.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  FlightProviderError,
  isOfferExpired,
  compareOffers,
  searchCacheKey,
  toPricingFlightCost,
  validateSearchParams,
  type NormalizedFlightOffer,
} from "../_shared/flight-provider.ts";
import { DuffelFlightProvider } from "../_shared/duffel-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(e: unknown) {
  if (e instanceof FlightProviderError) {
    return json({ error: e.message, code: e.code }, e.status >= 400 && e.status < 600 ? e.status : 400);
  }
  console.error("flight-engine error", (e as Error)?.name ?? "error");
  return json({ error: "Erro inesperado no motor de voos.", code: "unknown_error" }, 500);
}

function rowToOffer(row: Record<string, any>): NormalizedFlightOffer {
  return {
    provider: row.provider,
    providerOfferId: row.provider_offer_id,
    providerOfferRequestId: row.provider_offer_request_id,
    totalAmount: Number(row.total_amount),
    totalCurrency: row.total_currency,
    taxAmount: row.tax_amount === null ? null : Number(row.tax_amount),
    baseAmount: row.base_amount === null ? null : Number(row.base_amount),
    owner: row.owner_carrier,
    ownerName: row.owner_name,
    createdAt: row.provider_created_at ?? row.created_at,
    expiresAt: row.expires_at,
    slices: row.slices ?? [],
    services: row.services ?? [],
    fareConditions: row.fare_conditions ?? {},
    paymentRequirements: row.payment_requirements ?? {
      requiresInstantPayment: row.requires_instant_payment,
      paymentRequiredBy: row.payment_required_by,
      priceGuaranteeExpiresAt: row.price_guarantee_expires_at,
    },
    holdCapable: row.hold_capable,
    passengerIds: [],
  };
}

function offerRow(offer: NormalizedFlightOffer, searchId: string | null) {
  return {
    search_id: searchId,
    provider: offer.provider,
    provider_offer_id: offer.providerOfferId,
    provider_offer_request_id: offer.providerOfferRequestId,
    total_amount: offer.totalAmount,
    total_currency: offer.totalCurrency,
    base_amount: offer.baseAmount,
    tax_amount: offer.taxAmount,
    owner_carrier: offer.owner,
    owner_name: offer.ownerName,
    slices: offer.slices,
    services: offer.services,
    fare_conditions: offer.fareConditions,
    payment_requirements: offer.paymentRequirements,
    requires_instant_payment: offer.paymentRequirements.requiresInstantPayment,
    hold_capable: offer.holdCapable,
    payment_required_by: offer.paymentRequirements.paymentRequiredBy,
    price_guarantee_expires_at: offer.paymentRequirements.priceGuaranteeExpiresAt,
    provider_created_at: offer.createdAt,
    expires_at: offer.expiresAt,
    status: isOfferExpired(offer) ? "expired" : "active",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "config");

    const provider = new DuffelFlightProvider({ apiKey: Deno.env.get("DUFFEL_TEST_API_KEY") });

    if (action === "config") {
      return json({ provider: provider.id, mode: provider.mode, configured: provider.isConfigured() });
    }

    if (!provider.isConfigured()) throw new FlightProviderError("provider_not_configured", 503);

    if (action === "search") {
      const params = validateSearchParams({
        origin: body.origin, destination: body.destination,
        departureDate: body.departure_date, returnDate: body.return_date,
        adults: body.adults, children: body.children, infants: body.infants,
        cabin: body.cabin, maxConnections: body.max_connections, maxResults: body.max_results,
      });
      const cacheKey = searchCacheKey(provider.id, params);
      const nowIso = new Date().toISOString();

      // Cache: reutiliza a pesquisa recente apenas enquanto houver ofertas por expirar.
      if (body.force !== true) {
        const { data: cached } = await admin
          .from("flight_searches")
          .select("id, created_at, provider_offer_request_id")
          .eq("cache_key", cacheKey)
          .eq("status", "ok")
          .gt("expires_at", nowIso)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cached) {
          const { data: offers } = await admin
            .from("flight_offers")
            .select("*")
            .eq("search_id", cached.id)
            .gt("expires_at", nowIso)
            .order("total_amount", { ascending: true });
          if (offers && offers.length > 0) {
            return json({ search_id: cached.id, cached: true, offers, count: offers.length });
          }
        }
      }

      const started = Date.now();
      try {
        const offers = await provider.searchOffers(params);
        const expiresAt = offers
          .map((o) => o.expiresAt)
          .filter(Boolean)
          .sort()[0] ?? nowIso;

        const { data: search, error: searchError } = await admin
          .from("flight_searches")
          .insert({
            provider: provider.id,
            provider_mode: provider.mode,
            provider_offer_request_id: offers[0]?.providerOfferRequestId ?? null,
            cache_key: cacheKey,
            origin: params.origin,
            destination: params.destination,
            departure_date: params.departureDate,
            return_date: params.returnDate,
            adults: params.adults,
            children: params.children ?? 0,
            infants: params.infants ?? 0,
            cabin: params.cabin,
            max_connections: params.maxConnections,
            status: "ok",
            offers_count: offers.length,
            duration_ms: Date.now() - started,
            provider_request_id: provider.lastRequestId,
            expires_at: expiresAt,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (searchError) throw searchError;

        const { data: stored, error: offersError } = await admin
          .from("flight_offers")
          .upsert(offers.map((o) => offerRow(o, search.id)), { onConflict: "provider,provider_offer_id" })
          .select("*");
        if (offersError) throw offersError;

        return json({ search_id: search.id, cached: false, offers: stored ?? [], count: offers.length });
      } catch (e) {
        const code = e instanceof FlightProviderError ? e.code : "unknown_error";
        await admin.from("flight_searches").insert({
          provider: provider.id,
          provider_mode: provider.mode,
          cache_key: cacheKey,
          origin: params.origin,
          destination: params.destination,
          departure_date: params.departureDate,
          return_date: params.returnDate,
          adults: params.adults,
          children: params.children ?? 0,
          infants: params.infants ?? 0,
          cabin: params.cabin,
          max_connections: params.maxConnections,
          status: "failed",
          error_code: code,
          offers_count: 0,
          duration_ms: Date.now() - started,
          provider_request_id: provider.lastRequestId,
          created_by: user.id,
        });
        throw e;
      }
    }

    if (action === "get_offer" || action === "refresh_offer" || action === "passenger_requirements" || action === "pricing_flight_cost") {
      const offerId = String(body.provider_offer_id ?? "");
      const { data: row } = await admin
        .from("flight_offers")
        .select("*")
        .eq("provider", provider.id)
        .eq("provider_offer_id", offerId)
        .maybeSingle();

      if (action === "get_offer") {
        if (!row) throw new FlightProviderError("offer_no_longer_available", 404);
        const expired = isOfferExpired({ expires_at: row.expires_at });
        if (expired && row.status !== "expired") {
          await admin.from("flight_offers").update({ status: "expired" }).eq("id", row.id);
          row.status = "expired";
        }
        return json({ offer: row, expired });
      }

      if (action === "pricing_flight_cost") {
        if (!row) throw new FlightProviderError("offer_no_longer_available", 404);
        if (isOfferExpired({ expires_at: row.expires_at })) throw new FlightProviderError("offer_expired", 409);
        // Custo de fornecedor puro. Margem/proteção/arredondamento continuam no Pricing Engine.
        return json({ flight_cost: toPricingFlightCost(rowToOffer(row)) });
      }

      if (action === "passenger_requirements") {
        const reqs = await provider.getPassengerRequirements(offerId);
        return json({ requirements: reqs });
      }

      // refresh_offer / reprice
      if (!row) throw new FlightProviderError("offer_no_longer_available", 404);
      let current: NormalizedFlightOffer | null = null;
      try {
        current = await provider.refreshOffer(offerId);
      } catch (e) {
        if (e instanceof FlightProviderError && (e.code === "offer_no_longer_available" || e.code === "offer_expired")) {
          await admin.from("flight_offers").update({
            status: e.code === "offer_expired" ? "expired" : "unavailable",
            refreshed_at: new Date().toISOString(),
          }).eq("id", row.id);
          return json({ reprice: compareOffers(rowToOffer(row), null) });
        }
        throw e;
      }
      const result = compareOffers(rowToOffer(row), current);
      // O valor histórico fica preservado em last_reprice; o estado passa a refletir a alteração.
      if (result.status !== "unchanged") {
        await admin.from("flight_offers").update({
          status: result.status === "expired"
            ? "expired"
            : result.status === "unavailable"
            ? "unavailable"
            : "price_changed",
          total_amount: current.totalAmount,
          total_currency: current.totalCurrency,
          expires_at: current.expiresAt,
          payment_requirements: current.paymentRequirements,
          requires_instant_payment: current.paymentRequirements.requiresInstantPayment,
          hold_capable: current.holdCapable,
          refreshed_at: new Date().toISOString(),
          last_reprice: result as unknown as Record<string, unknown>,
        }).eq("id", row.id);
      } else {

        await admin.from("flight_offers").update({
          refreshed_at: new Date().toISOString(),
          last_reprice: result as unknown as Record<string, unknown>,
        }).eq("id", row.id);
      }
      return json({ reprice: result });
    }

    throw new FlightProviderError("unsupported_action", 400);
  } catch (e) {
    return fail(e);
  }
});
