import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceBlock } from "./EvidenceBlock";
import { ScoreBreakdown } from "./ScoreBreakdown";
import {
  useOpportunityDetail,
  useOpportunityHistory,
  useOpportunityRun,
  useSetOpportunityStatus,
  type OpportunityStatus,
} from "@/hooks/useDiscovery";

const STATUS_LABEL: Record<string, string> = {
  nova: "Nova", em_analise: "Em análise", aceite: "Aceite", rejeitada: "Rejeitada", expirada: "Expirada",
};

interface Props {
  opportunityId: string | null;
  onClose: () => void;
  configWeights: Record<string, number> | null;
}

export function DiscoveryDetailDrawer({ opportunityId, onClose, configWeights }: Props) {
  const detail = useOpportunityDetail(opportunityId);
  const history = useOpportunityHistory(opportunityId);
  const opportunity = detail.data ?? null;
  const run = useOpportunityRun(opportunity?.run_id ?? null, opportunity?.task_id ?? null);
  const setStatus = useSetOpportunityStatus();
  const [note, setNote] = useState("");

  const act = async (status: OpportunityStatus) => {
    if (!opportunityId) return;
    if ((status === "rejeitada" || status === "expirada") && note.trim().length < 2) {
      toast.error("Indica um motivo para rejeitar ou expirar esta oportunidade.");
      return;
    }
    try {
      await setStatus.mutateAsync({ id: opportunityId, status, note: note.trim() || null });
      setNote("");
      toast.success(`Estado atualizado para ${STATUS_LABEL[status]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o estado.");
    }
  };

  return (
    <Sheet open={Boolean(opportunityId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">
            {detail.isLoading ? "A carregar…" : opportunity?.query ?? "Oportunidade"}
          </SheetTitle>
        </SheetHeader>

        {detail.isLoading && <div className="space-y-3 mt-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>}
        {detail.error && <p className="mt-6 text-sm text-destructive">{detail.error.message}</p>}
        {!detail.isLoading && !detail.error && !opportunity && (
          <p className="mt-6 text-sm text-muted-foreground">Oportunidade não encontrada.</p>
        )}

        {opportunity && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{STATUS_LABEL[opportunity.status] ?? opportunity.status}</Badge>
              <Badge variant="outline">{opportunity.country}</Badge>
              <Badge variant="outline">{opportunity.language}</Badge>
              {opportunity.market && <Badge variant="outline">{opportunity.market}</Badge>}
              <Badge variant="outline">Fonte: {opportunity.source}</Badge>
            </div>

            <Tabs defaultValue="evidencia">
              <TabsList className="w-full flex-wrap h-auto">
                <TabsTrigger value="evidencia">Evidência</TabsTrigger>
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="fonte">Fonte</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="execucao">Execução</TabsTrigger>
              </TabsList>

              <TabsContent value="evidencia" className="mt-4">
                <EvidenceBlock opportunity={opportunity} />
              </TabsContent>

              <TabsContent value="score" className="mt-4">
                <ScoreBreakdown opportunity={opportunity} configWeights={configWeights} />
              </TabsContent>

              <TabsContent value="fonte" className="mt-4">
                <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-2">
                  <p><span className="text-muted-foreground">Fonte:</span> {opportunity.source}</p>
                  <p><span className="text-muted-foreground">Descoberta:</span> {new Date(opportunity.discovered_at).toLocaleString("pt-PT")}</p>
                  <p><span className="text-muted-foreground">Expira:</span> {opportunity.expires_at ? new Date(opportunity.expires_at).toLocaleString("pt-PT") : ","}</p>
                  <pre className="text-xs bg-muted rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(opportunity.source_reference, null, 2)}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                {history.isLoading && <Skeleton className="h-24 rounded-2xl" />}
                {!history.isLoading && (history.data?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">Sem histórico registado.</p>
                )}
                <ul className="space-y-2">
                  {(history.data ?? []).map((h) => (
                    <li key={h.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {h.status ? `${STATUS_LABEL[h.previous_status ?? ""] ?? h.previous_status ?? ","} → ${STATUS_LABEL[h.status] ?? h.status}` : "Snapshot de deteção"}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(h.recorded_at).toLocaleString("pt-PT")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Score {h.opportunity_score !== null ? Number(h.opportunity_score).toFixed(1) : ","} · Confiança{" "}
                        {h.confidence_score !== null ? Number(h.confidence_score).toFixed(1) : ","}
                        {h.source ? ` · ${h.source}` : ""}
                      </p>
                      {h.note && <p className="text-sm mt-2 whitespace-pre-wrap">{h.note}</p>}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="execucao" className="mt-4">
                {run.isLoading && <Skeleton className="h-24 rounded-2xl" />}
                {!run.isLoading && !run.data?.run && !run.data?.task && (
                  <p className="text-sm text-muted-foreground">Sem execução associada registada.</p>
                )}
                {run.data?.run && (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Estado:</span> {run.data.run.status}</p>
                    <p><span className="text-muted-foreground">Modelo:</span> {run.data.run.model_provider ?? ","} / {run.data.run.model_name ?? ","}</p>
                    <p><span className="text-muted-foreground">Tokens:</span> {run.data.run.input_tokens} entrada · {run.data.run.output_tokens} saída</p>
                    <p><span className="text-muted-foreground">Duração:</span> {run.data.run.duration_ms ?? ","} ms</p>
                    <p><span className="text-muted-foreground">Custo estimado:</span> {Number(run.data.run.estimated_cost).toFixed(6)}</p>
                    {run.data.run.error_message && <p className="text-destructive">{run.data.run.error_message}</p>}
                  </div>
                )}
                {(run.data?.costs?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-2">
                    {run.data!.costs.map((c) => (
                      <li key={c.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                        {c.provider} / {c.model} · {Number(c.estimated_cost).toFixed(6)} {c.currency} · {c.usage_date}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Ações</p>
              <Textarea
                placeholder="Nota (obrigatória ao rejeitar ou expirar)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={setStatus.isPending} onClick={() => act("aceite")}>Aceitar</Button>
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => act("em_analise")}>Em análise</Button>
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => act("expirada")}>Expirar</Button>
                <Button size="sm" variant="destructive" disabled={setStatus.isPending} onClick={() => act("rejeitada")}>Rejeitar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                As ações apenas alteram o estado e ficam registadas na auditoria. Nenhuma campanha ou publicação é executada.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
