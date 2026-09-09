import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

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

async function handleCheckoutCompleted(session: any) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.error("No bookingId in session metadata");
    return;
  }
  const paid = session.payment_status === "paid";
  const supabase = getSupabase();
  const { data: booking } = await supabase
    .from("bookings")
    .update({
      payment_status: paid ? "paid" : "unpaid",
      status: paid ? "confirmed" : "pending_payment",
      paid_at: paid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select("id, visitor_id, attribution, total_price, currency")
    .maybeSingle();

  // First-party measurement: a paid booking is the only conversion we record.
  if (paid && booking?.visitor_id) {
    const attribution = (booking.attribution ?? {}) as Record<string, string>;
    await supabase.from("traffic_events").insert({
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
  }
}

async function handleCheckoutExpired(session: any) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;
  await getSupabase()
    .from("bookings")
    .update({
      status: "cancelled",
      payment_status: "unpaid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env query:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await handleCheckoutExpired(event.data.object);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
