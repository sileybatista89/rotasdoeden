import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSET_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
  CHANNEL_LABEL,
  MARKET_STATE_LABEL,
  PLAN_DECISION_LABEL,
  PLAN_STATUS_LABEL,
  useAcquisitionOpportunity,
  useAcquisitionPlanDetail,
  useAcquisitionPlanRelated,
  useAcquisitionRun,
  useSetPlanStatus,
  type PlanAdminStatus,
} from "@/hooks/useAcquisition";

interface Props {
  planId: string | null;
  onClose: () => void;
}

function fmt(date: string | null | undefined) {
  return date ? new Date(date).toLocaleString("pt-PT") : "n/d";
}

function Json({ value }: { value: unknown }) {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }
  return (
    <pre className="text-xs bg-muted/40 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AcquisitionDetailDrawer({ planId, onClose }: Props) {
  const detail = useAcquisitionPlanDetail(planId);
  const related = useAcquisitionPlanRelated(planId);
  const plan = detail.data ?? null;
  const opportunity = useAcquisitionOpportunity(plan?.discovery_opportunity_id ?? null);
  const run = useAcquisitionRun(plan?.run_id ?? null, plan?.task_id ?? null);
  const setStatus = useSetPlanStatus();
  const [note, setNote] = useState("");

  const act = async (status: PlanAdminStatus) => {
    if (!planId) return;
    if ((status === "rejeitado" || status === "arquivado") && note.trim().length < 2) {
      toast.error("Indica o motivo antes de rejeitar ou arquivar.");
      return;
    }
    try {
      await setStatus.mutateAsync({ id: planId, status, note: note.trim() || null });
      setNote("");
      toast.success(`Estado atualizado para ${PLAN_STATUS_LABEL[status]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o estado.");
    }
  };

  return (
    <Sheet open={Boolean(planId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">
            {detail.isLoading ? "A carregar…" : plan ? `${plan.market}${plan.country ? ` · ${plan.country}` : ""}` : "Plano"}
          </SheetTitle>
        </SheetHeader>

        {detail.isLoading ? (
          <div className="space-y-3 mt-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !plan ? (
          <p className="mt-4 text-sm text-muted-foreground">Este plano já não existe.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={plan.status === "rejeitado" ? "destructive" : "outline"}>
                {PLAN_STATUS_LABEL[plan.status] ?? plan.status}
              </Badge>
              <Badge variant="outline">{CHANNEL_LABEL[plan.channel] ?? plan.channel}</Badge>
              <Badge variant="outline">{MARKET_STATE_LABEL[plan.market_state] ?? plan.market_state}</Badge>
              <Badge variant="outline">{PLAN_DECISION_LABEL[plan.decision] ?? plan.decision}</Badge>
              <Badge variant="outline">Score {Number(plan.acquisition_score ?? 0).toFixed(0)}</Badge>
              <Badge variant="outline">Confiança {Number(plan.confidence_score ?? 0).toFixed(2)}</Badge>
            </div>

            <Tabs defaultValue="plano">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="plano">Plano</TabsTrigger>
                <TabsTrigger value="evidencia">Evidência</TabsTrigger>
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="ativos">Ativos e campanhas</TabsTrigger>
                <TabsTrigger value="execucao">Execução</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="plano" className="space-y-3 pt-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hipótese</p>
                  <p className="text-sm text-foreground">{plan.hypothesis}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</p>
                  <p className="text-sm text-foreground">{plan.objective ?? "n/d"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Público</p>
                  <Json value={plan.audience} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Mensagem</p>
                  <Json value={plan.message} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Oferta</p>
                  <Json value={plan.offer} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Métrica alvo</p>
                  <Json value={plan.target_metric} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Custo estimado registado: {Number(plan.estimated_cost ?? 0).toFixed(2)}, nenhum valor é gasto por este painel.
                </p>
              </TabsContent>

              <TabsContent value="evidencia" className="space-y-3 pt-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidência observada</p>
                  <Json value={plan.evidence} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Oportunidade Discovery</p>
                  {opportunity.data ? (
                    <Json value={opportunity.data} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem oportunidade associada.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="score" className="space-y-3 pt-3">
                <Json value={plan.score_breakdown} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Racional</p>
                  <p className="text-sm text-foreground">{plan.rationale ?? "n/d"}</p>
                </div>
              </TabsContent>

              <TabsContent value="ativos" className="space-y-3 pt-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Ativos</p>
                  {(related.data?.assets ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum ativo pedido.</p>
                  ) : (
                    <ul className="space-y-2">
                      {related.data?.assets.map((a) => (
                        <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{a.asset_type}</span>
                            <Badge variant="outline">{ASSET_STATUS_LABEL[a.status] ?? a.status}</Badge>
                            {a.language && <Badge variant="outline">{a.language}</Badge>}
                          </div>
                          {a.purpose && <p className="text-muted-foreground mt-1">{a.purpose}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Campanhas</p>
                  {(related.data?.campaigns ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma campanha em rascunho.</p>
                  ) : (
                    <ul className="space-y-2">
                      {related.data?.campaigns.map((c) => (
                        <li key={c.id} className="rounded-xl border border-border p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{c.name}</span>
                            <Badge variant="outline">{CAMPAIGN_STATUS_LABEL[c.status] ?? c.status}</Badge>
                            <Badge variant="outline">{CHANNEL_LABEL[c.channel] ?? c.channel}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1">
                            Orçamento pedido {Number(c.requested_budget ?? 0).toFixed(2)} {c.currency} · limite {Number(c.budget_cap ?? 0).toFixed(2)} {c.currency}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Nenhum canal pago está ligado. Nada é publicado nem pago a partir daqui.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Resultados medidos</p>
                  {(related.data?.results ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ainda não há resultados: nada foi executado.</p>
                  ) : (
                    <Json value={related.data?.results} />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="execucao" className="space-y-3 pt-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Tarefa: {run.data?.task?.task_type ?? "n/d"} ({run.data?.task?.status ?? "n/d"})</p>
                  <p>Execução: {run.data?.run?.status ?? "n/d"} · {fmt(run.data?.run?.started_at)}</p>
                  <p>
                    Modelo: {run.data?.run?.model_provider ?? "n/d"} / {run.data?.run?.model_name ?? "n/d"}
                  </p>
                  <p>
                    Custo: {(run.data?.costs ?? []).reduce((t, c) => t + Number(c.estimated_cost ?? 0), 0).toFixed(4)} €
                  </p>
                  <p>Aprovações pendentes: {(run.data?.approvals ?? []).filter((a) => a.status === "pending").length}</p>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="space-y-2 pt-3">
                {(related.data?.history ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem histórico.</p>
                ) : (
                  <ul className="space-y-2">
                    {related.data?.history.map((h) => (
                      <li key={h.id} className="rounded-xl border border-border p-3 text-sm">
                        <p className="font-medium">{h.action}</p>
                        <p className="text-muted-foreground">
                          {h.previous_status ?? "n/d"} → {h.new_status ?? "n/d"} · {h.actor_kind} · {fmt(h.created_at)}
                        </p>
                        {h.note && <p className="text-muted-foreground mt-1">{h.note}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>

            <div className="rounded-2xl border border-border p-4 space-y-2">
              <p className="text-sm font-medium">Decisão</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota (obrigatória para rejeitar ou arquivar)"
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => act("em_revisao")} disabled={setStatus.isPending}>Enviar para revisão</Button>
                <Button size="sm" variant="outline" onClick={() => act("rascunho")} disabled={setStatus.isPending}>Voltar a rascunho</Button>
                <Button size="sm" variant="destructive" onClick={() => act("rejeitado")} disabled={setStatus.isPending}>Rejeitar</Button>
                <Button size="sm" variant="outline" onClick={() => act("arquivado")} disabled={setStatus.isPending}>Arquivar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Estas ações apenas classificam o plano. Não publicam, não contactam ninguém e não gastam dinheiro.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
