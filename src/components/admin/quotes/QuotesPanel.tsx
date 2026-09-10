import { useMemo, useState } from "react";
import { AlertTriangle, Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTravelProducts } from "@/hooks/useTravelProducts";
import {
  useIssueQuoteToken, useQuoteDetail, useQuoteStats, useQuotes, useRepriceQuote, useSetQuoteStatus,
  type QuoteFilters,
} from "@/hooks/useQuotes";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/quotes";

const ALL = "__all__";

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(Number(value));
}

function dt(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const tone =
    status === "accepted" ? "bg-primary/10 text-primary border-primary/30"
    : status === "cancelled" || status === "expired" ? "bg-destructive/10 text-destructive border-destructive/30"
    : status === "superseded" ? "bg-muted text-muted-foreground border-border"
    : "bg-secondary/15 text-foreground border-border";
  return <Badge variant="outline" className={tone}>{QUOTE_STATUS_LABEL[status] ?? status}</Badge>;
}

export function QuotesPanel() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<QuoteFilters>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useQuoteStats();
  const products = useTravelProducts();
  const quotes = useQuotes(filters);
  const detail = useQuoteDetail(openId);
  const reprice = useRepriceQuote();
  const setStatus = useSetQuoteStatus();
  const issueToken = useIssueQuoteToken();

  const productName = useMemo(() => {
    const map = new Map<string, string>();
    (products.data ?? []).forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [products.data]);

  const current = detail.data?.versions?.find((v) => v.id === detail.data?.quote.current_version_id)
    ?? detail.data?.versions?.[0];

  const setFilter = (key: keyof QuoteFilters) => (value: string) =>
    setFilters((f) => ({ ...f, [key]: value === ALL ? undefined : value }));

  async function onReprice(quoteId: string) {
    try {
      const res: any = await reprice.mutateAsync(quoteId);
      toast({
        title: res.changed ? "Nova versão criada" : "Sem alteração.",
        description: res.changed
          ? `${money(res.comparison.previousPrice, current?.sale_currency)} → ${money(res.comparison.newPrice, current?.sale_currency)}`
          : "O preço e as condições mantêm-se.",
      });
    } catch (e) {
      toast({ title: "Não foi possível recalcular", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function onStatus(quoteId: string, status: QuoteStatus) {
    try {
      await setStatus.mutateAsync({ quoteId, status });
      toast({ title: `Cotação marcada como ${QUOTE_STATUS_LABEL[status].toLowerCase()}` });
    } catch (e) {
      toast({ title: "Ação não permitida", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function onToken(quoteId: string) {
    try {
      const res = await issueToken.mutateAsync(quoteId);
      await navigator.clipboard.writeText(res.token).catch(() => undefined);
      toast({
        title: "Ligação do cliente criada",
        description: `Código copiado. Válido até ${dt(res.expires_at)}. O cliente só vê o preço final, nunca custos.`,
      });
    } catch (e) {
      toast({ title: "Não foi possível criar a ligação", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Cotações", value: stats.data?.total ?? 0 },
          { label: "Calculadas", value: stats.data?.calculated ?? 0 },
          { label: "Enviadas", value: stats.data?.sent ?? 0 },
          { label: "Aceites", value: stats.data?.accepted ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-display font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <Label className="text-xs">Estado</Label>
          <Select value={filters.status ?? ALL} onValueChange={setFilter("status")}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {Object.entries(QUOTE_STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Produto</Label>
          <Select value={filters.productId ?? ALL} onValueChange={setFilter("productId")}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {(products.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Origem</Label>
          <Select value={filters.channel ?? ALL} onValueChange={setFilter("channel")}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              <SelectItem value="admin">Equipa</SelectItem>
              <SelectItem value="public">Site</SelectItem>
              <SelectItem value="agent">Agente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={filters.from?.slice(0, 10) ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined }))} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={filters.to?.slice(0, 10) ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined }))} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {quotes.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">A carregar…</p>
        ) : (quotes.data ?? []).length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-display font-semibold text-foreground mb-1">Ainda não há cotações</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              As cotações aparecem aqui assim que existirem fornecedores com tarifas válidas e uma política de preços ativa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {["Número", "Produto", "Preço", "Estado", "Criação", "Validade", "Versão", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(quotes.data ?? []).map((q) => (
                  <tr key={q.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{q.quote_number}</td>
                    <td className="px-4 py-3">{q.product_id ? productName.get(q.product_id) ?? "—" : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{q.sale_currency}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{dt(q.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{dt(q.expires_at)}</td>
                    <td className="px-4 py-3">v{q.version_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(q.id)}>Ver</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">
              {detail.data?.quote.quote_number ?? "Cotação"}
            </SheetTitle>
          </SheetHeader>

          {detail.isLoading || !detail.data ? (
            <p className="text-sm text-muted-foreground mt-6">A carregar…</p>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={detail.data.quote.status} />
                <Badge variant="outline">Versão {current?.version_number}</Badge>
                {current?.confirmable ? (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                    <ShieldCheck size={12} /> Confirmável
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                    <AlertTriangle size={12} /> Não confirmável
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Preço ao cliente</p><p className="font-semibold">{money(current?.total_price, current?.sale_currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Custo interno</p><p>{money(current?.total_cost, current?.cost_currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Validade</p><p>{dt(current?.valid_until)}</p></div>
                <div><p className="text-xs text-muted-foreground">Limitada por</p><p>{current?.validity_limited_by ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Política</p><p>v{current?.policy_version_number ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Voo</p><p>{current?.flight_provider_offer_id ?? "Sem voo"}</p></div>
              </div>

              {(current?.blocking_reasons ?? []).length > 0 && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive mb-1">Bloqueios</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    {current!.blocking_reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Linhas da cotação</p>
                <div className="space-y-2">
                  {detail.data.items.length === 0 && <p className="text-xs text-muted-foreground">Sem linhas.</p>}
                  {detail.data.items.map((i) => (
                    <div key={i.id} className="border border-border rounded-xl p-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-foreground">{i.display_name}</span>
                        <span>{money(i.selling_price, i.currency)}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {i.quantity} × {money(i.unit_cost, i.currency)} ({i.unit ?? "—"}) · custo {money(i.total_cost, i.currency)} · tarifa {i.rate_kind ?? "—"} · fonte {i.source_type ?? "—"} · válida até {i.rate_valid_until ?? "desconhecida"}
                      </p>
                      {i.cancellation_summary && <p className="text-muted-foreground mt-1">{i.cancellation_summary}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Histórico de versões</p>
                <div className="space-y-2">
                  {detail.data.versions.map((v) => (
                    <div key={v.id} className="border border-border rounded-xl p-3 text-xs">
                      <div className="flex justify-between">
                        <span>v{v.version_number} · {QUOTE_STATUS_LABEL[v.status] ?? v.status}</span>
                        <span>{money(v.total_price, v.sale_currency)}</span>
                      </div>
                      {v.previous_price != null && (
                        <p className="text-muted-foreground mt-1">
                          Anterior {money(v.previous_price, v.sale_currency)} · diferença {money(v.price_difference, v.sale_currency)}
                        </p>
                      )}
                      {v.change_reason && <p className="text-muted-foreground mt-1">{v.change_reason}</p>}
                      <p className="text-muted-foreground mt-1">{dt(v.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" disabled={reprice.isPending}
                  onClick={() => onReprice(detail.data!.quote.id)}>
                  <RefreshCw size={14} className="mr-1" /> Recalcular
                </Button>
                <Button size="sm" variant="outline" onClick={() => onStatus(detail.data!.quote.id, "sent")}>Enviar</Button>
                <Button size="sm" variant="outline" onClick={() => onStatus(detail.data!.quote.id, "accepted")}>Cliente aceitou</Button>
                <Button size="sm" variant="outline" onClick={() => onStatus(detail.data!.quote.id, "cancelled")}>Cancelar</Button>
                <Button size="sm" variant="outline" onClick={() => onToken(detail.data!.quote.id)}>
                  <Copy size={14} className="mr-1" /> Ligação do cliente
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Aceitar significa apenas aceitação comercial. Não cria reserva, não cobra e não emite bilhetes.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
