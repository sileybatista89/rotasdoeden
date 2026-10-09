import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { decideEventAction, paidTransition, validateSessionForBooking } from "../_shared/payment-gate.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

type Outcome = { result: string; bookingId: string | null };

async function loadBooking(bookingId: string | undefined) {
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return null;
  const { data } = await getSupabase()
    .from("bookings")
    .select("id, stripe_session_id, payment_status, status, visitor_id, attribution, total_price, currency")
    .eq("id", bookingId)
    .maybeSingle();
  return data as any;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv): Promise<Outcome> {
  const booking = await loadBooking(session.metadata?.bookingId);
  const valid = validateSessionForBooking(session, env, booking);
  if (!valid.ok) return { result: `ignored:${valid.reason}`, bookingId: booking?.id ?? null };

  const t = paidTransition(session, booking);
  if (!t.update) return { result: "no_change", bookingId: booking.id };

  const supabase = getSupabase();
  // Conditional update: only an unpaid booking can become paid (safe on retries/races).
  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      payment_status: t.payment_status,
      status: t.status,
      paid_at: new Date().toISOString(),
      stripe_session_id: booking.stripe_session_id ?? session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .neq("payment_status", "paid")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`booking_update_failed: ${error.message}`);
  if (!updated) return { result: "already_paid", bookingId: booking.id };

  if (booking.visitor_id) {
    const attribution = (booking.attribution ?? {}) as Record<string, string>;
    const { error: eventError } = await supabase.from("traffic_events").insert({
      visitor_id: booking.visitor_id,
      event_type: "booking_paid",
      entity_type: "booking",
      entity_id: booking.id,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_content: attribution.utm_content ?? null,
      utm_term: attribution.utm_term ?? null,
      referrer_host: attribution.referrer_host ?? null,
      language: attribution.language ?? null,
      value: booking.total_price,
      currency: booking.currency,
    });
    if (eventError) console.error("traffic_events insert failed:", eventError.message);
  }
  return { result: "booking_paid", bookingId: booking.id };
}

async function handleCheckoutExpired(session: any, env: StripeEnv): Promise<Outcome> {
  const booking = await loadBooking(session.metadata?.bookingId);
  const valid = validateSessionForBooking(session, env, booking);
  if (!valid.ok) return { result: `ignored:${valid.reason}`, bookingId: booking?.id ?? null };
  const { error } = await getSupabase()
    .from("bookings")
    .update({ status: "cancelled", payment_status: "unpaid", updated_at: new Date().toISOString() })
    .eq("id", booking.id)
    .neq("payment_status", "paid");
  if (error) throw new Error(`booking_update_failed: ${error.message}`);
  return { result: "booking_cancelled", bookingId: booking.id };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env query:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;

  // 1. Signature first. Invalid signature → nothing is read or written.
  let event: any;
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("Webhook signature rejected:", (e as Error).message);
    return new Response("Webhook error", { status: 400 });
  }
  const eventId: string | undefined = event?.id;
  if (!eventId) return new Response("Missing event id", { status: 400 });

  const supabase = getSupabase();
  const obj = event.data?.object ?? {};

  // 2. Idempotency on (provider, event_id) — unique index.
  const { data: existing } = await supabase
    .from("payment_events")
    .select("id, status, attempts")
    .eq("provider", "stripe")
    .eq("event_id", eventId)
    .maybeSingle();
  if (decideEventAction(existing as any) === "skip") {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (existing) {
    await supabase.from("payment_events")
      .update({ status: "processing", attempts: ((existing as any).attempts ?? 1) + 1, error: null, updated_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
  } else {
    const { error: insErr } = await supabase.from("payment_events").insert({
      provider: "stripe",
      event_id: eventId,
      event_type: event.type,
      environment: env,
      status: "processing",
      checkout_session_id: typeof obj.id === "string" && obj.id.startsWith("cs_") ? obj.id : null,
      amount_total: typeof obj.amount_total === "number" ? obj.amount_total : null,
      currency: typeof obj.currency === "string" ? obj.currency : null,
    });
    if (insErr) {
      // Concurrent delivery already claimed it.
      if ((insErr as any).code === "23505") {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      console.error("payment_events insert failed:", insErr.message);
      return new Response("Webhook error", { status: 500 }); // provider retries
    }
  }

  // 3. Process; on failure keep the event as 'failed' and ask provider to retry.
  try {
    let outcome: Outcome = { result: "unhandled", bookingId: null };
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        outcome = await handleCheckoutCompleted(obj, env);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        outcome = await handleCheckoutExpired(obj, env);
        break;
    }
    await supabase.from("payment_events")
      .update({ status: "processed", result: outcome.result, booking_id: outcome.bookingId, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("provider", "stripe").eq("event_id", eventId);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 300) ?? "error";
    console.error("Webhook processing failed:", msg);
    await supabase.from("payment_events")
      .update({ status: "failed", error: msg, updated_at: new Date().toISOString() })
      .eq("provider", "stripe").eq("event_id", eventId);
    return new Response("Webhook error", { status: 500 });
  }
});
