import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Página pública da proposta. O cliente entra apenas com o código da ligação.
 * Mostra somente informação sanitizada (nunca custos, margens ou fornecedores)
 * e permite aceitar. Aceitar não reserva nem cobra.
 */

interface PublicQuote {
  quoteNumber: string;
  productName: string | null;
  currency: string;
  totalPrice: number;
  validUntil: string | null;
  version: number;
  criteria: Record<string, any>;
  items: { name: string; quantity: number; unit: string | null; cancellationSummary: string | null }[];
  flight: { airline: string | null; departureDate: string | null; returnDate: string | null } | null;
}

const fn = supabase as unknown as {
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

function money(v: number, c: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: c || "EUR" }).format(v);
}
function day(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString("pt-PT", { dateStyle: "long" }) : "—";
}

export default function PropostaPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "A sua proposta de viagem | Rotas do Éden";
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setState("error"); setMessage("Ligação inválida."); return; }
      const { data, error } = await fn.functions.invoke("quote-public", { body: { action: "get", token } });
      if (!active) return;
      if (error || data?.error) {
        setState("error");
        setMessage(data?.error ?? "Não foi possível abrir esta proposta.");
        return;
      }
      setQuote(data.quote);
      setAccepted(Boolean(data.accepted));
      setState("ready");
    })();
    return () => { active = false; };
  }, [token]);

  const nights = useMemo(() => quote?.criteria?.nights ?? null, [quote]);

  async function accept() {
    if (!quote) return;
    setBusy(true);
    setMessage(null);
    const { data, error } = await fn.functions.invoke("quote-public", {
      body: { action: "accept", token, version_number: quote.version },
    });
    setBusy(false);
    if (error || data?.accepted !== true) {
      setMessage(data?.error ?? "Não foi possível registar a aceitação.");
      return;
    }
    setAccepted(true);
    setMessage("Aceitação registada. Vamos confirmar a disponibilidade antes de qualquer pagamento.");
  }

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">Rotas do Éden</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">A sua proposta de viagem</h1>
        </header>

        {state === "loading" && <p className="text-muted-foreground">A carregar…</p>}

        {state === "error" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <p className="text-destructive">{message}</p>
          </div>
        )}

        {state === "ready" && quote && (
          <>
            <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Proposta {quote.quoteNumber}</p>
                  <h2 className="font-display text-xl font-semibold">{quote.productName ?? "Viagem à medida"}</h2>
                </div>
                <p className="text-2xl font-semibold text-primary">{money(quote.totalPrice, quote.currency)}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Partida</dt><dd>{day(quote.criteria?.departureDate)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Regresso</dt><dd>{day(quote.criteria?.returnDate)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Duração</dt><dd>{quote.criteria?.durationDays ?? "—"} dias{nights ? ` · ${nights} noites` : ""}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Viajantes</dt><dd>{quote.criteria?.adults ?? "—"} adultos{quote.criteria?.children ? ` · ${quote.criteria.children} crianças` : ""}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-muted-foreground">Proposta válida até</dt><dd>{day(quote.validUntil)}</dd></div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-3">O que está incluído</h3>
              <ul className="space-y-2 text-sm">
                {quote.items.length === 0 && <li className="text-muted-foreground">Sem itens listados.</li>}
                {quote.items.map((i, idx) => (
                  <li key={idx} className="border-b border-border last:border-0 pb-2 last:pb-0">
                    <span className="text-foreground">{i.name}</span>
                    <span className="text-muted-foreground"> · {i.quantity} {i.unit ?? ""}</span>
                    {i.cancellationSummary && <p className="text-xs text-muted-foreground">{i.cancellationSummary}</p>}
                  </li>
                ))}
              </ul>
            </section>

            {message && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">{message}</div>
            )}

            <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
              {accepted ? (
                <p className="flex items-center gap-2 text-primary">
                  <CheckCircle2 size={18} /> Proposta aceite. Entraremos em contacto para os próximos passos.
                </p>
              ) : (
                <>
                  <Button onClick={accept} disabled={busy} size="lg">
                    {busy ? "A registar…" : "Aceitar proposta"}
                  </Button>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                    Aceitar não é pagar. Não há qualquer cobrança nesta etapa: confirmamos primeiro a
                    disponibilidade com os parceiros e só depois enviamos as instruções de pagamento.
                  </p>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
