/**
 * Fase 7I (passos 2-4) — criação de reservas de pacote (server-side, admin).
 *
 * O que esta função FAZ:
 *  - revalida a cotação aceite através do Quote Engine (que recalcula pelo
 *    Pricing Engine e reconsulta o voo apenas para validar);
 *  - cria a package_booking e a fotografia das suas linhas;
 *  - regista o voo selecionado/revalidado.
 *
 * O que esta função NÃO FAZ (desligado nesta fase):
 *  - Stripe, checkout, payment intent, cobrança, webhook;
 *  - Duffel order, hold real, emissão de bilhete;
 *  - contacto ou confirmação de fornecedores;
 *  - qualquer automação.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  initialFlightStatus,
  packageBookingIdempotencyKey,
  rejectForbiddenBookingInput,
  sanitizeBookingForCustomer,
  snapshotItemsFromQuote,
} from "../_shared/package-booking.ts";

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
    const action = String(body.action ?? "");

    // Preço, custo, margem e estados nunca vêm do pedido.
    const forbidden = rejectForbiddenBookingInput(body);
    if (forbidden.length > 0) {
      return json({ error: `Campos não permitidos: ${forbidden.join(", ")}`, code: "forbidden_input" }, 400);
    }

    const callRevalidation = async (quoteId: string) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/quote-engine`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ action: "revalidate", quote_id: quoteId }),
      });
      const payload = await res.json().catch(() => ({}));
      return { ok: res.ok && payload?.ok === true, status: res.status, payload };
    };

    // ============ REVALIDATE ============
    if (action === "revalidate") {
      const quoteId = String(body.quote_id ?? "");
      if (!quoteId) return json({ error: "quote_id em falta.", code: "missing_quote" }, 400);
      const r = await callRevalidation(quoteId);
      return json(r.payload, r.status);
    }

    // ============ CREATE ============
    if (action === "create") {
      const quoteId = String(body.quote_id ?? "");
      if (!quoteId) return json({ error: "quote_id em falta.", code: "missing_quote" }, 400);

      const { data: quote } = await admin.from("travel_quotes").select("*").eq("id", quoteId).maybeSingle();
      if (!quote) return json({ error: "Cotação inexistente.", code: "quote_not_found" }, 404);
      if (quote.status === "cancelled") return json({ error: "Cotação cancelada.", code: "quote_cancelled" }, 409);
      if (!quote.accepted_at) {
        return json({ error: "A cotação ainda não foi aceite pelo cliente.", code: "not_accepted" }, 409);
      }
      if (quote.requires_reacceptance) {
        return json({ error: "O preço mudou. É necessária nova aceitação do cliente.", code: "requires_reacceptance" }, 409);
      }

      // Idempotência antes de qualquer trabalho.
      const existingKey = packageBookingIdempotencyKey(String(quote.accepted_version_id ?? quote.current_version_id));
      const { data: already } = await admin.from("package_bookings").select("*")
        .eq("idempotency_key", existingKey).maybeSingle();
      if (already && already.booking_status !== "cancelled") {
        return json({ booking: already, idempotent: true, code: "booking_exists" });
      }

      // Revalidação final obrigatória — nunca reutilizar cegamente o preço.
      const reval = await callRevalidation(quoteId);
      if (!reval.ok) {
        return json({
          created: false,
          code: reval.payload?.code ?? "revalidation_failed",
          outcome: reval.payload?.outcome ?? "blocked",
          reasons: reval.payload?.reasons ?? reval.payload?.decision?.reasons ?? [],
          requires_reacceptance: Boolean(reval.payload?.requires_reacceptance),
          error: reval.payload?.error ?? "A revalidação impediu a criação da reserva.",
        }, reval.status === 200 ? 409 : reval.status);
      }

      // Estado após revalidação (pode ter nascido uma nova versão dentro da tolerância).
      const { data: freshQuote } = await admin.from("travel_quotes").select("*").eq("id", quoteId).maybeSingle();
      const versionId = String(freshQuote?.accepted_version_id ?? freshQuote?.current_version_id);
      const { data: version } = await admin.from("travel_quote_versions").select("*").eq("id", versionId).maybeSingle();
      if (!version) return json({ error: "Versão da cotação inexistente.", code: "version_not_found" }, 404);
      if (version.confirmable === false) {
        return json({ created: false, code: "not_confirmable", reasons: version.blocking_reasons ?? [] }, 409);
      }

      const { data: quoteItems } = await admin.from("travel_quote_items").select("*")
        .eq("quote_version_id", version.id).order("line_order");

      // Nomes de fornecedor entram na fotografia para não depender do futuro.
      const supplierIds = [...new Set((quoteItems ?? []).map((i: any) => i.supplier_id).filter(Boolean))] as string[];
      let supplierNames: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sup } = await admin.from("suppliers").select("id, name").in("id", supplierIds);
        supplierNames = Object.fromEntries((sup ?? []).map((s: any) => [s.id, s.name]));
      }

      const idempotencyKey = packageBookingIdempotencyKey(version.id);
      const flightPresent = Boolean(version.flight_offer_id || version.flight_provider_offer_id);

      const insertPayload = {
        quote_id: quote.id,
        quote_version_id: version.id,
        product_id: quote.product_id,
        product_version_id: quote.product_version_id,
        // As cotações não guardam conta de utilizador: o cliente pode não ter conta.
        user_id: null,
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        visitor_id: quote.visitor_id,
        attribution: quote.attribution ?? {},
        booking_status: "awaiting_payment",
        flight_status: initialFlightStatus({ present: flightPresent, revalidated: true }),
        payment_status: "pending",
        operations_status: "preparing",
        confirmed_price: Number(version.total_price ?? 0),
        confirmed_cost: Number(version.total_cost ?? 0),
        currency: version.sale_currency ?? quote.sale_currency ?? "EUR",
        quote_valid_until: version.valid_until,
        quote_accepted_at: quote.accepted_at,
        pricing_calculation_id: version.pricing_calculation_id,
        idempotency_key: idempotencyKey,
        created_by: user.id,
      };

      const { data: booking, error: bookingError } = await admin
        .from("package_bookings").insert(insertPayload).select("*").single();

      if (bookingError) {
        // Concorrência: a constraint única é a autoridade final.
        if (String(bookingError.code) === "23505") {
          const { data: winner } = await admin.from("package_bookings").select("*")
            .eq("quote_version_id", version.id).neq("booking_status", "cancelled").maybeSingle();
          if (winner) return json({ booking: winner, idempotent: true, code: "booking_exists" });
        }
        return json({ error: bookingError.message, code: "booking_failed" }, 500);
      }

      const items = snapshotItemsFromQuote(
        (quoteItems ?? []).map((i: any) => ({ ...i, supplier_name: supplierNames[i.supplier_id] ?? null })),
      ).map((i) => ({ ...i, package_booking_id: booking.id }));
      if (items.length > 0) {
        const { error: itemsError } = await admin.from("package_booking_items").insert(items);
        if (itemsError) return json({ error: itemsError.message, code: "items_failed" }, 500);
      }

      if (flightPresent) {
        const snap = version.flight_snapshot ?? {};
        await admin.from("booking_flight").insert({
          package_booking_id: booking.id,
          flight_offer_id: version.flight_offer_id,
          provider: snap.provider ?? null,
          provider_offer_id: version.flight_provider_offer_id,
          status: "revalidated",
          offer_expires_at: version.flight_expires_at,
          hold_capable: snap.hold_capable ?? null,
          requires_instant_payment: snap.requires_instant_payment ?? null,
          supplier_cost: snap.total_amount ?? null,
          supplier_currency: snap.currency ?? null,
          offer_snapshot: snap,
        });
      }

      await admin.from("travel_quotes").update({ package_booking_id: booking.id }).eq("id", quote.id);
      await admin.from("admin_audit_log").insert({
        admin_id: user.id, action: "package_booking_created_via_engine",
        entity_type: "package_booking", entity_id: booking.id,
        details: {
          booking_number: booking.booking_number, quote_number: quote.quote_number,
          quote_version: version.version_number, price: booking.confirmed_price,
          currency: booking.currency, revalidation: reval.payload?.outcome ?? null,
        },
      });

      let productName: string | null = null;
      if (quote.product_id) {
        const { data: p } = await admin.from("travel_products").select("name").eq("id", quote.product_id).maybeSingle();
        productName = p?.name ?? null;
      }

      return json({
        created: true,
        booking,
        items_count: items.length,
        revalidation: reval.payload?.outcome ?? null,
        // Vista segura para o cliente: sem custos, margens nem dados de fornecedor.
        customer_view: sanitizeBookingForCustomer({
          booking, productName, criteria: version.customer_criteria ?? {},
        }),
      });
    }

    // ============ GET ============
    if (action === "get") {
      const bookingId = String(body.package_booking_id ?? "");
      const { data: booking } = await admin.from("package_bookings").select("*").eq("id", bookingId).maybeSingle();
      if (!booking) return json({ error: "Reserva inexistente.", code: "booking_not_found" }, 404);
      const { data: items } = await admin.from("package_booking_items").select("*")
        .eq("package_booking_id", bookingId).order("line_order");
      const { data: flight } = await admin.from("booking_flight").select("*")
        .eq("package_booking_id", bookingId).maybeSingle();
      return json({ booking, items: items ?? [], flight: flight ?? null });
    }

    return json({ error: "Ação não suportada.", code: "unsupported_action" }, 400);
  } catch (e) {
    console.error("package-booking error", (e as Error)?.name ?? "error");
    return json({ error: "Erro inesperado na criação da reserva." }, 500);
  }
});
