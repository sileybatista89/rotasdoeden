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
  useBuilderRequests,
  useCreatePackageBooking, useIssueQuoteToken, usePackageBookingForQuote, useQuoteDetail,
  useQuoteRevalidations, useQuoteStats, useQuotes, useRepriceQuote, useRevalidateQuote,
  useSetQuoteStatus, REVALIDATION_OUTCOME_LABEL, QUOTE_STAGE_LABEL, quoteStage,
  type QuoteFilters, type QuoteRow,
} from "@/hooks/useQuotes";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/quotes";

const ALL = "__all__";

const COMMERCIAL_STATE_LABEL: Record<string, string> = {
  confirmed_pricing: "Preços confirmados por fornecedor",
  market_based_pricing: "Preços de mercado observados (indicativa)",
  pending_validation: "Pendente de validação",
};

const PROVENANCE_LABEL: Record<string, string> = {
  confirmed: "Confirmado por fornecedor",
  market_observed: "Preço de mercado observado",
  estimated: "Estimado",
  expired: "Expirado",
  unavailable: "Sem custo utilizável",
  pending_validation: "Por validar",
};


function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null) return ",";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(Number(value));
}

function dt(value: string | null | undefined) {
  if (!value) return ",";
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

/** Fase do ciclo comercial: criada, enviada, aceite, revalidação, pagamento. */
function StageBadge({ quote }: { quote: QuoteRow }) {
  const stage = quoteStage(quote);
  const tone =
    stage === "pronta_pagamento" ? "bg-primary/10 text-primary border-primary/30"
    : stage === "aguarda_revalidacao" ? "bg-destructive/10 text-destructive border-destructive/30"
    : stage === "encerrada" ? "bg-muted text-muted-foreground border-border"
    : "bg-secondary/15 text-foreground border-border";
  return <Badge variant="outline" className={tone}>{QUOTE_STAGE_LABEL[stage]}</Badge>;
}

const BUILDER_STATUS_LABEL: Record<string, string> = {
  submetido: "Pedido recebido",
  em_analise: "Em análise",
  cotado: "Proposta gerada",
  arquivado: "Arquivado",
};

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
  const revalidate = useRevalidateQuote();
  const createBooking = useCreatePackageBooking();
  const revalidations = useQuoteRevalidations(openId);
  const booking = usePackageBookingForQuote(openId);
  const builderRequests = useBuilderRequests();

  async function onRevalidate(quoteId: string) {
    try {
      const res: any = await revalidate.mutateAsync(quoteId);
      const outcome = res?.revalidation?.outcome as keyof typeof REVALIDATION_OUTCOME_LABEL | undefined;
      toast({
        title: outcome ? REVALIDATION_OUTCOME_LABEL[outcome] : "Revalidação concluída",
        description: (res?.revalidation?.reasons ?? []).join(" ") || "Condições verificadas junto das tarifas e do voo.",
        variant: outcome === "blocked" ? "destructive" : undefined,
      });
    } catch (e) {
      toast({ title: "Não foi possível revalidar", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function onCreateBooking(quoteId: string) {
    try {
      const res: any = await createBooking.mutateAsync(quoteId);
      toast({
        title: res?.already_existed ? "Reserva já existia" : "Reserva de pacote criada",
        description: `${res?.booking?.bookingNumber ?? ""}, aguarda pagamento. Nada foi cobrado.`,
      });
    } catch (e) {
      toast({ title: "Não foi possível criar a reserva", description: (e as Error).message, variant: "destructive" });
    }
  }

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
                  {["Número", "Produto", "Preço", "Estado", "Fase", "Criação", "Validade", "Versão", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(quotes.data ?? []).map((q) => (
                  <tr key={q.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{q.quote_number}</td>
                    <td className="px-4 py-3">{q.product_id ? productName.get(q.product_id) ?? "," : ","}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {money((q as unknown as { total_price?: number | null }).total_price ?? undefined, q.sale_currency)}
                    </td>

                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3"><StageBadge quote={q} /></td>
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

      {/* Pedidos vindos do configurador público */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">Pedidos do configurador</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configurações enviadas pelos visitantes. Quando existe política ativa e componentes reais, a proposta é gerada automaticamente.
        </p>
        {(builderRequests.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há pedidos enviados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {["Cliente", "Produto", "Viagem", "Estado", "Enviado", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(builderRequests.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <span className="block">{r.contact_name ?? ","}</span>
                      <span className="text-xs text-muted-foreground">{r.contact_email ?? ","}</span>
                    </td>
                    <td className="px-4 py-3">{r.product_id ? productName.get(r.product_id) ?? "," : ","}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {r.duration_days} dias · {r.adults} adultos{r.children ? ` · ${r.children} crianças` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{BUILDER_STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{dt(r.submitted_at ?? r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.quote_id ? (
                        <Button size="sm" variant="outline" onClick={() => setOpenId(r.quote_id!)}>Ver proposta</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">A preparar</span>
                      )}
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
                {(() => {
                  const state = (current as any)?.commercial_state as string | undefined;
                  if (!state) return null;
                  const tone = state === "confirmed_pricing"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/20 text-foreground border-border";
                  return <Badge variant="outline" className={tone}>{COMMERCIAL_STATE_LABEL[state] ?? state}</Badge>;
                })()}
                {(current as any)?.requires_validation && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    Exige reconfirmação antes de fechar
                  </Badge>
                )}
              </div>


              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Preço ao cliente</p><p className="font-semibold">{money(current?.total_price, current?.sale_currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Custo interno</p><p>{money(current?.total_cost, current?.cost_currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Validade</p><p>{dt(current?.valid_until)}</p></div>
                <div><p className="text-xs text-muted-foreground">Limitada por</p><p>{current?.validity_limited_by ?? ","}</p></div>
                <div><p className="text-xs text-muted-foreground">Política</p><p>v{current?.policy_version_number ?? ","}</p></div>
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

              {((current as any)?.category_subtotals ?? []).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Subtotais por categoria</p>
                  <div className="space-y-1 text-xs">
                    {((current as any).category_subtotals as any[]).map((c, idx) => (
                      <div key={idx} className="flex justify-between gap-3 border border-border rounded-xl px-3 py-2">
                        <span>{c.componentType} · {c.lines} linha(s)</span>
                        <span>{money(c.sellPrice, current?.sale_currency)}</span>
                      </div>
                    ))}
                  </div>
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
                      {(i as any).provenance && (
                        <Badge variant="outline" className="mt-1">
                          {PROVENANCE_LABEL[(i as any).provenance] ?? (i as any).provenance}
                        </Badge>
                      )}
                      <p className="text-muted-foreground mt-1">
                        {i.quantity} × {money(i.unit_cost, i.currency)} ({i.unit ?? ","}) · custo {money(i.total_cost, i.currency)} · tarifa {i.rate_kind ?? ","} · fonte {i.source_type ?? ","} · válida até {i.rate_valid_until ?? "desconhecida"}
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

              <div>
                <p className="text-sm font-medium mb-2">Aceitação do cliente</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Aceite em</p>
                    <p>{dt((detail.data.quote as any).accepted_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Canal</p>
                    <p>{(detail.data.quote as any).accepted_channel ?? ","}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Última revalidação</p>
                    <p>{dt((detail.data.quote as any).last_revalidated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nova aceitação necessária</p>
                    <p>{(detail.data.quote as any).requires_reacceptance ? "Sim" : "Não"}</p>
                  </div>
                </div>
              </div>

              {(revalidations.data ?? []).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Revalidações</p>
                  <div className="space-y-2">
                    {(revalidations.data ?? []).map((r) => (
                      <div key={r.id} className="border border-border rounded-xl p-3 text-xs">
                        <div className="flex justify-between gap-3">
                          <span>{REVALIDATION_OUTCOME_LABEL[r.outcome] ?? r.outcome}</span>
                          <span>{money(r.new_price, r.currency)}</span>
                        </div>
                        {r.previous_price != null && (
                          <p className="text-muted-foreground mt-1">
                            Anterior {money(r.previous_price, r.currency)} · diferença {money(r.price_difference, r.currency)}
                          </p>
                        )}
                        {(r.blocking_reasons ?? []).length > 0 && (
                          <p className="text-muted-foreground mt-1">{r.blocking_reasons.join(" ")}</p>
                        )}
                        <p className="text-muted-foreground mt-1">{dt(r.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.data && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Reserva de pacote {booking.data.booking_number}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estado {booking.data.booking_status} · pagamento {booking.data.payment_status} · operações {booking.data.operations_status}
                    {" · "}{money(booking.data.confirmed_price, booking.data.currency)}
                  </p>
                </div>
              )}

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
                <Button size="sm" variant="outline" disabled={revalidate.isPending}
                  onClick={() => onRevalidate(detail.data!.quote.id)}>
                  Revalidar
                </Button>
                <Button size="sm" disabled={createBooking.isPending || !!booking.data}
                  onClick={() => onCreateBooking(detail.data!.quote.id)}>
                  Criar reserva de pacote
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
