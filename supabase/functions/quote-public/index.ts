/**
 * Fase 7G/7I — Acesso público a uma cotação, apenas por token opaco.
 *
 * Ações: "get" (leitura sanitizada) e "accept" (aceitação comercial).
 *
 * Aceitar NÃO é reservar, NÃO é pagar, NÃO cria order de voo nem bilhete.
 * Nunca devolve custos, tarifas de fornecedor, margens, markup nem política.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { hashPublicToken, isExpired, sanitizeQuoteForCustomer } from "../_shared/quote-engine.ts";
import { evaluateAcceptance } from "../_shared/package-booking.ts";

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

// Limite simples em memória por instância: trava tentativas de adivinhar tokens.
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (rateLimited(ip)) return json({ error: "Demasiados pedidos. Tenta novamente daqui a pouco." }, 429);

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "get";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "Cotação não encontrada.", code: "invalid_token" }, 404);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const hash = await hashPublicToken(token);
    const { data: quote } = await admin.from("travel_quotes").select("*").eq("public_token_hash", hash).maybeSingle();
    if (!quote) return json({ error: "Cotação não encontrada.", code: "quote_not_found" }, 404);

    if (isExpired(quote.public_token_expires_at)) return json({ error: "Esta ligação expirou.", code: "quote_expired" }, 410);
    if (["cancelled", "superseded"].includes(quote.status)) return json({ error: "Cotação não disponível.", code: "quote_superseded" }, 410);

    const { data: version } = await admin.from("travel_quote_versions").select("*")
      .eq("id", quote.current_version_id).maybeSingle();
    if (!version) return json({ error: "Cotação não disponível.", code: "version_not_found" }, 410);

    const { data: items } = await admin.from("travel_quote_items").select("*")
      .eq("quote_version_id", version.id).order("line_order");

    let productName: string | null = null;
    if (quote.product_id) {
      const { data: p } = await admin.from("travel_products").select("name").eq("id", quote.product_id).maybeSingle();
      productName = p?.name ?? null;
    }

    // ============ ACCEPT ============
    if (action === "accept") {
      // Revalidação obrigatória antes de aceitar: preço e disponibilidade são
      // sempre reconfirmados pelo Quote Engine, nunca reutilizados às cegas.
      let quoteRow = quote;
      let versionRow = version;
      let itemRows = items ?? [];

      if (!quote.accepted_at || quote.requires_reacceptance) {
        const revalidation = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/quote-engine`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "revalidate", quote_id: quote.id }),
        }).then((r) => r.json()).catch(() => null);

        if (!revalidation) {
          return json({ accepted: false, code: "revalidation_failed", error: "Não foi possível confirmar a proposta agora. Tente novamente dentro de instantes." }, 503);
        }

        if (revalidation.outcome === "blocked") {
          return json({
            accepted: false,
            code: "revalidation_blocked",
            error: "Esta proposta precisa de ser revista pela nossa equipa antes de ser aceite. Entramos em contacto consigo.",
          }, 409);
        }

        if (revalidation.changed) {
          // Nasceu uma nova versão. Recarregamos sempre o que o cliente vê.
          const { data: freshQuote } = await admin.from("travel_quotes").select("*").eq("id", quote.id).maybeSingle();
          const { data: freshVersion } = await admin.from("travel_quote_versions").select("*")
            .eq("id", freshQuote?.current_version_id).maybeSingle();
          const { data: freshItems } = await admin.from("travel_quote_items").select("*")
            .eq("quote_version_id", freshVersion?.id).order("line_order");
          if (freshQuote && freshVersion) {
            quoteRow = freshQuote;
            versionRow = freshVersion;
            itemRows = freshItems ?? [];
          }

          if (revalidation.requires_reacceptance) {
            return json({
              accepted: false,
              code: "quote_updated",
              error: "O preço desta viagem foi atualizado. Reveja a proposta atualizada e confirme de novo.",
              updated: true,
              previous_price: revalidation.revalidation?.previous_price ?? null,
              new_price: revalidation.revalidation?.new_price ?? null,
              quote: sanitizeQuoteForCustomer({ quote: quoteRow, version: versionRow, items: itemRows, productName }),
            }, 409);
          }
        }
      }

      let productVersionStatus: string | null = null;
      if (quoteRow.product_version_id) {
        const { data: pv } = await admin.from("travel_product_versions").select("status")
          .eq("id", quoteRow.product_version_id).maybeSingle();
        productVersionStatus = pv?.status ?? null;
      }

      const evaluation = evaluateAcceptance({
        quote: quoteRow,
        version: versionRow,
        expectedVersionNumber: null,
        productVersionStatus,
      });

      if (!evaluation.ok) {
        await admin.from("admin_audit_log").insert({
          admin_id: null, action: "quote_acceptance_failed", entity_type: "travel_quote", entity_id: quote.id,
          details: { code: evaluation.code, reason: evaluation.reason, version: version.version_number },
        });
        return json({ accepted: false, code: evaluation.code, error: evaluation.reason }, 409);
      }

      if (evaluation.alreadyAccepted) {
        return json({
          accepted: true, already_accepted: true, accepted_at: quote.accepted_at,
          quote: sanitizeQuoteForCustomer({ quote, version, items: items ?? [], productName }),
        });
      }

      const acceptedAt = new Date().toISOString();
      // Concorrência: primeira aceitação exige accepted_at nulo; a re-aceitação
      // (preço mudou) exige que a versão aceite anterior ainda seja a registada.
      let update = admin.from("travel_quotes").update({
        status: "accepted",
        accepted_at: acceptedAt,
        accepted_version_id: version.id,
        accepted_channel: "public_token",
        requires_reacceptance: false,
        // Contexto mínimo: sem PII adicional, sem documentos de passageiros.
        acceptance_context: { channel: "public_token", version_number: version.version_number, user_agent_present: Boolean(req.headers.get("user-agent")) },
      }).eq("id", quote.id);

      update = quote.requires_reacceptance
        ? update.eq("requires_reacceptance", true)
        : update.is("accepted_at", null);

      const { data: updated, error: updateError } = await update.select("*").maybeSingle();


      if (updateError) return json({ accepted: false, code: "acceptance_failed", error: "Não foi possível registar a aceitação." }, 500);
      if (!updated) {
        // Outro pedido aceitou primeiro: resultado idempotente, não um erro.
        const { data: fresh } = await admin.from("travel_quotes").select("*").eq("id", quote.id).maybeSingle();
        return json({
          accepted: true, already_accepted: true, accepted_at: fresh?.accepted_at ?? null,
          quote: sanitizeQuoteForCustomer({ quote: fresh ?? quote, version, items: items ?? [], productName }),
        });
      }

      await admin.from("admin_audit_log").insert({
        admin_id: null, action: "quote_accepted", entity_type: "travel_quote", entity_id: quote.id,
        details: {
          quote_number: quote.quote_number, version: version.version_number,
          price: Number(version.total_price), currency: version.sale_currency,
          channel: "public_token", accepted_at: acceptedAt,
        },
      });

      return json({
        accepted: true,
        accepted_at: acceptedAt,
        quote: sanitizeQuoteForCustomer({ quote: updated, version, items: items ?? [], productName }),
        next_steps: [
          "A Rotas do Éden vai confirmar a disponibilidade antes de qualquer pagamento.",
          "Receberá depois as instruções para concluir a reserva.",
        ],
      });
    }

    // ============ GET ============
    const payload = sanitizeQuoteForCustomer({ quote, version, items: items ?? [], productName });
    return json({
      quote: payload,
      expired: isExpired(version.valid_until),
      accepted: Boolean(quote.accepted_at) && quote.accepted_version_id === version.id && !quote.requires_reacceptance,
      requires_reacceptance: Boolean(quote.requires_reacceptance),
    });
  } catch (e) {
    console.error("quote-public error", (e as Error)?.name ?? "error");
    return json({ error: "Erro inesperado." }, 500);
  }
});
