import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { resolvePaymentGate } from "../_shared/payment-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_COMMISSION = 0.15; // 15%

const ATTRIBUTION_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer_host", "language",
] as const;

function sanitizeAttribution(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  for (const key of ATTRIBUTION_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim().slice(0, 150);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const body = await req.json();
    const { serviceId, date, numPeople, specialRequests, returnUrl, visitorId, attribution } = body ?? {};
    if (!serviceId || !date || !numPeople || !returnUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Payment mode comes ONLY from public.commerce_settings (default: test,
    // sales off). A live key existing never selects live mode. Checked before
    // any booking row or checkout session is created.
    const gateClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings, error: settingsErr } = await gateClient
      .from("commerce_settings").select("sales_enabled, payment_mode").eq("id", true).maybeSingle();
    if (settingsErr) {
      return new Response(JSON.stringify({ error: "Pagamentos indisponíveis de momento.", code: "config_unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const gate = resolvePaymentGate(settings, {
      hasSandboxKey: !!Deno.env.get("STRIPE_SANDBOX_API_KEY"),
      hasLiveKey: !!Deno.env.get("STRIPE_LIVE_API_KEY"),
    }, body?.environment);
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: gate.message, code: gate.code }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const environment: StripeEnv = gate.env;
    const peopleCount = Number(numPeople);
    if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 50) {
      return new Response(JSON.stringify({ error: "Invalid numPeople" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate date server-side: must be a real date, today or in the future.
    // Client min={today} can be bypassed by direct API callers.
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: "Invalid date format (expected YYYY-MM-DD)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const bookingDate = new Date(`${date}T00:00:00Z`);
    if (isNaN(bookingDate.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid date" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    if (bookingDate < todayUtc) {
      return new Response(JSON.stringify({ error: "Booking date must be today or in the future" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    // Service-role to read service (bypass RLS quirks) and insert booking
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: service, error: svcErr } = await admin
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("is_active", true)
      .maybeSingle();
    if (svcErr || !service) {
      return new Response(JSON.stringify({ error: "Service not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (peopleCount < service.min_people || peopleCount > service.max_people) {
      return new Response(JSON.stringify({ error: `Number of people must be between ${service.min_people} and ${service.max_people}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (service.guide_id === userId) {
      return new Response(JSON.stringify({ error: "You cannot book your own service" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const unitPrice = Number(service.price_per_person);
    const totalPrice = +(unitPrice * peopleCount).toFixed(2);
    const commissionAmount = +(totalPrice * PLATFORM_COMMISSION).toFixed(2);
    const guidePayout = +(totalPrice - commissionAmount).toFixed(2);
    const currency = (service.currency || "EUR").toLowerCase();

    // Create booking row first (pending_payment) so webhook can confirm later
    const { data: booking, error: bookErr } = await admin
      .from("bookings")
      .insert({
        tourist_id: userId,
        guide_id: service.guide_id,
        service_id: service.id,
        service_title: service.title,
        date,
        num_people: peopleCount,
        total_price: totalPrice,
        currency: service.currency || "EUR",
        commission_amount: commissionAmount,
        guide_payout: guidePayout,
        special_requests: specialRequests || null,
        status: "pending_payment",
        payment_status: "unpaid",
        // First-party attribution only. Unknown keys are dropped, values are capped.
        visitor_id: typeof visitorId === "string" && /^[0-9a-f-]{36}$/i.test(visitorId) ? visitorId : null,
        attribution: sanitizeAttribution(attribution),
      })
      .select()
      .single();
    if (bookErr || !booking) {
      console.error("Booking insert error:", bookErr);
      return new Response(JSON.stringify({ error: "Could not create booking" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = createStripeClient(environment);
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: service.title,
            description: `${peopleCount} ${peopleCount === 1 ? "pessoa" : "pessoas"} · ${date}`,
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: peopleCount,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      automatic_tax: { enabled: true },
      ...(userEmail && { customer_email: userEmail }),
      metadata: {
        bookingId: booking.id,
        userId,
        serviceId: service.id,
        guideId: service.guide_id,
      },
    });

    await admin
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);

    return new Response(JSON.stringify({ clientSecret: session.client_secret, bookingId: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: "Payment could not be initialised. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

});
