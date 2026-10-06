/**
 * Conclusão de reserva + email pós-viagem (admin, server-side).
 *
 * - action "complete": marca uma reserva paga e confirmada como concluída e
 *   envia o email pós-viagem UMA vez (índice único por reserva).
 * - action "test": envia o email apenas para o próprio admin, sem mudar a
 *   reserva; fica registado como teste.
 *
 * Convite de avaliação (ex.: Trustpilot) NÃO está integrado: o registo guarda
 * review_invite_status = 'not_integrated' para uma integração futura.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const bookingId = String(body.booking_id ?? "");
    if (!["complete", "test"].includes(action) || !UUID.test(bookingId)) return json({ error: "Pedido inválido" }, 400);

    const { data: b } = await admin.from("bookings")
      .select("id, tourist_id, service_title, date, status, payment_status").eq("id", bookingId).maybeSingle();
    if (!b) return json({ error: "Reserva não encontrada" }, 404);

    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", b.tourist_id).maybeSingle();
    const firstName = (prof?.full_name ?? "").trim().split(/\s+/)[0] || undefined;
    const templateData = {
      name: firstName,
      serviceTitle: b.service_title,
      date: b.date ? new Date(b.date).toLocaleDateString("pt-PT") : undefined,
    };

    if (action === "test") {
      if (!user.email) return json({ error: "A sua conta não tem email" }, 400);
      const { data: row } = await admin.from("post_trip_emails").insert({
        booking_id: b.id, is_test: true, triggered_by: user.id,
      }).select("id").single();
      try {
        const r = await sendTemplateEmail("post-trip", user.email, { templateData, idempotencyKey: `post-trip-test-${row!.id}` });
        await admin.from("post_trip_emails").update(r.sent ? { status: "sent", sent_at: new Date().toISOString() } : { status: "suppressed" }).eq("id", row!.id);
        return json({ ok: true, test: true, sent: r.sent });
      } catch (e) {
        await admin.from("post_trip_emails").update({ status: "failed", error: String((e as Error).message).slice(0, 300) }).eq("id", row!.id);
        return json({ error: "O envio de teste falhou" }, 502);
      }
    }

    // Só reservas realmente realizadas: pagas e confirmadas (ou já concluídas sem email).
    if (b.payment_status !== "paid" || !["confirmed", "completed"].includes(b.status)) {
      return json({ error: "Só reservas pagas e confirmadas podem ser concluídas.", code: "not_eligible" }, 409);
    }

    // Reserva o envio antes de enviar: o índice único impede duplicados.
    const { data: existing } = await admin.from("post_trip_emails")
      .select("id, status, sent_at").eq("booking_type", "service").eq("booking_id", b.id).eq("is_test", false).maybeSingle();
    let rowId = existing?.id as string | undefined;
    if (existing?.status === "sent" || existing?.status === "suppressed") {
      if (b.status !== "completed") await admin.from("bookings").update({ status: "completed" }).eq("id", b.id);
      return json({ ok: true, alreadySent: true, sent_at: existing.sent_at });
    }
    if (!rowId) {
      const { data: ins, error } = await admin.from("post_trip_emails")
        .insert({ booking_type: "service", booking_id: b.id, triggered_by: user.id }).select("id").single();
      if (error) return json({ ok: true, alreadySent: true });
      rowId = ins.id;
    }

    if (b.status !== "completed") {
      const { error } = await admin.from("bookings").update({ status: "completed" }).eq("id", b.id);
      if (error) return json({ error: "Não foi possível concluir a reserva" }, 500);
    }

    const { data: au } = await admin.auth.admin.getUserById(b.tourist_id);
    const email = au?.user?.email;
    if (!email) {
      await admin.from("post_trip_emails").update({ status: "failed", error: "Cliente sem email" }).eq("id", rowId);
      return json({ ok: true, completed: true, sent: false, reason: "no_email" });
    }
    try {
      const r = await sendTemplateEmail("post-trip", email, { templateData, idempotencyKey: `post-trip-service-${b.id}` });
      await admin.from("post_trip_emails").update(
        r.sent ? { status: "sent", sent_at: new Date().toISOString(), error: null } : { status: "suppressed" },
      ).eq("id", rowId);
      return json({ ok: true, completed: true, sent: r.sent });
    } catch (e) {
      await admin.from("post_trip_emails").update({ status: "failed", error: String((e as Error).message).slice(0, 300) }).eq("id", rowId);
      return json({ ok: true, completed: true, sent: false, reason: "send_failed" });
    }
  } catch (_e) {
    return json({ error: "Erro interno" }, 500);
  }
});
