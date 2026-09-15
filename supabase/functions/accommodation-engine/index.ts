/**
 * Fase 11 — Accommodation Engine (server-side, apenas administradores).
 *
 * Ações: config, search, rates, quote, import_rate, offers.
 *
 * Duffel Stays só responde quando o acesso estiver aprovado e a flag
 * DUFFEL_STAYS_ENABLED estiver ligada. Nunca cria reservas nem pagamentos.
 * As credenciais nunca saem do servidor e nunca são registadas.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  StaysProviderError,
  isStayRateExpired,
  nightsBetween,
  toRatePerNight,
  validateStaysSearch,
  type NormalizedStayQuote,
  type NormalizedStayResult,
} from "../_shared/accommodation-provider.ts";
import { DuffelStaysProvider } from "../_shared/duffel-stays-provider.ts";

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
  if (e instanceof StaysProviderError) {
    return json({ error: e.message, code: e.code }, e.status >= 400 && e.status < 600 ? e.status : 400);
  }
  console.error("accommodation-engine error", (e as Error)?.name ?? "error");
  return json({ error: "Erro inesperado no motor de alojamento.", code: "unknown_error" }, 500);
}

function resultRow(r: NormalizedStayResult, mode: string, userId: string) {
  return {
    provider: r.provider,
    provider_mode: mode,
    kind: "search_result",
    provider_search_result_id: r.providerSearchResultId,
    accommodation_name: r.accommodationName,
    provider_accommodation_id: r.providerAccommodationId,
    locality: r.locality,
    country: r.country,
    check_in: r.checkIn || null,
    check_out: r.checkOut || null,
    nights: r.nights,
    total_amount: r.cheapestTotalAmount,
    total_currency: r.cheapestCurrency,
    raw: r as unknown as Record<string, unknown>,
    created_by: userId,
  };
}

function quoteRow(q: NormalizedStayQuote, mode: string, userId: string) {
  return {
    provider: q.provider,
    provider_mode: mode,
    kind: "quote",
    provider_quote_id: q.providerQuoteId,
    provider_rate_id: q.providerRateId,
    accommodation_name: q.accommodationName,
    check_in: q.checkIn,
    check_out: q.checkOut,
    nights: q.checkIn && q.checkOut ? nightsBetween(q.checkIn, q.checkOut) : null,
    adults: q.adults,
    rooms: q.rooms,
    total_amount: q.totalAmount,
    total_currency: q.totalCurrency,
    tax_amount: q.taxAmount,
    fee_amount: q.feeAmount,
    due_at_accommodation_amount: q.dueAtAccommodationAmount,
    public_amount: q.publicAmount,
    public_currency: q.publicCurrency,
    board_type: q.boardType,
    cancellation_type: q.cancellationType,
    cancellation_summary: q.cancellationSummary,
    status: isStayRateExpired(q) ? "expired" : "active",
    expires_at: q.expiresAt,
    raw: q as unknown as Record<string, unknown>,
    created_by: userId,
  };
}

const MEAL_BY_BOARD: Record<string, string> = {
  room_only: "room_only",
  breakfast: "breakfast",
  half_board: "half_board",
  full_board: "full_board",
  all_inclusive: "all_inclusive",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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

    const apiKey = Deno.env.get("DUFFEL_STAYS_TOKEN") ?? Deno.env.get("DUFFEL_TEST_API_KEY");
    const provider = new DuffelStaysProvider({
      apiKey,
      enabled: (Deno.env.get("DUFFEL_STAYS_ENABLED") ?? "").toLowerCase() === "true",
      mode: "test",
    });

    if (action === "config") {
      return json({
        provider: provider.id,
        mode: provider.mode,
        configured: provider.isConfigured(),
        enabled: provider.isEnabled(),
        booking_supported: false,
        note: provider.isEnabled()
          ? "Pesquisa, tarifas e orçamento disponíveis em modo de teste. Reservas continuam desativadas."
          : "Acesso Duffel Stays por ativar: falta aprovação/credencial ou a flag DUFFEL_STAYS_ENABLED.",
      });
    }

    if (action === "offers") {
      const { data } = await admin.from("accommodation_offers").select("*")
        .order("created_at", { ascending: false }).limit(50);
      return json({ offers: data ?? [] });
    }

    // ---- importação de tarifa: funciona com ou sem acesso live ----
    if (action === "import_rate") {
      const componentId = String(body.component_id ?? "");
      if (!componentId) throw new StaysProviderError("invalid_request", 400);
      const offerId = String(body.offer_id ?? "");
      const { data: offer } = await admin.from("accommodation_offers").select("*").eq("id", offerId).maybeSingle();
      if (!offer) return json({ error: "Oferta inexistente.", code: "offer_not_found" }, 404);
      if (offer.kind !== "quote") {
        return json({ error: "Só um orçamento do fornecedor pode originar tarifa.", code: "invalid_state" }, 409);
      }
      if (offer.expires_at && Date.parse(offer.expires_at) <= Date.now()) {
        throw new StaysProviderError("rate_expired", 409);
      }

      const nights = Number(offer.nights ?? 0) || 1;
      const rooms = Number(offer.rooms ?? 1) || 1;
      const { data: rate, error } = await admin.from("component_rates").insert({
        component_id: componentId,
        rate_kind: "supplier_cost",
        status: "quoted",
        price: toRatePerNight({ totalAmount: Number(offer.total_amount ?? 0) }, nights, rooms),
        currency: offer.total_currency,
        unit: "per_room",
        quantity: 1,
        source_type: "live_provider_api",
        source_reference: `${offer.provider}:${offer.provider_quote_id}`,
        observed_at: offer.created_at,
        valid_from: offer.check_in,
        valid_until: offer.check_out,
        validity_unknown: false,
        occupancy_adults: offer.adults,
        occupancy_total: offer.adults,
        meal_plan: MEAL_BY_BOARD[String(offer.board_type ?? "")] ?? "unknown",
        cancellation_type: offer.cancellation_type ?? "unknown",
        cancellation_summary: offer.cancellation_summary,
        public_amount: offer.public_amount,
        public_currency: offer.public_currency,
        provider: offer.provider,
        provider_rate_id: offer.provider_rate_id,
        notes: "Importada de orçamento de fornecedor em tempo real.",
        created_by: user.id,
      }).select("*").single();
      if (error) return json({ error: error.message }, 500);

      await admin.from("accommodation_offers")
        .update({ status: "imported", imported_rate_id: rate.id }).eq("id", offer.id);
      await admin.from("admin_audit_log").insert({
        admin_id: user.id, action: "stays_rate_imported", entity_type: "component_rate", entity_id: rate.id,
        details: { provider: offer.provider, offer_id: offer.id },
      });
      return json({ rate });
    }

    // ---- ações que exigem acesso live ----
    if (action === "search") {
      const params = validateStaysSearch({
        latitude: body.latitude, longitude: body.longitude, radiusKm: body.radius_km,
        checkIn: body.check_in, checkOut: body.check_out,
        adults: body.adults, rooms: body.rooms, maxResults: body.max_results,
      });
      const results = await provider.search(params);
      if (results.length > 0) {
        await admin.from("accommodation_offers").insert(results.map((r) => resultRow(r, provider.mode, user.id)));
      }
      return json({ results, count: results.length });
    }

    if (action === "rates") {
      const result = await provider.getRates(String(body.provider_search_result_id ?? ""));
      return json({ result });
    }

    if (action === "quote") {
      const quote = await provider.createQuote(String(body.provider_rate_id ?? ""));
      const { data: row } = await admin.from("accommodation_offers")
        .insert(quoteRow(quote, provider.mode, user.id)).select("*").single();
      return json({ quote, offer: row });
    }

    if (action === "book" || action === "create_booking") {
      return json({ error: "Reservas de alojamento não estão disponíveis.", code: "unsupported_action" }, 403);
    }

    return json({ error: "Ação desconhecida.", code: "unsupported_action" }, 400);
  } catch (e) {
    return fail(e);
  }
});
