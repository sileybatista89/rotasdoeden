import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ContentQualityBlock } from "./ContentQualityBlock";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  useContentDetail,
  useContentReviews,
  useContentRun,
  useContentSources,
  useContentVersions,
  useRestoreContentVersion,
  useSetContentStatus,
  type ContentStatus,
} from "@/hooks/useContent";

interface Props {
  contentId: string | null;
  onClose: () => void;
}

interface Block {
  type?: string;
  level?: number;
  text?: string;
  items?: string[];
  question?: string;
  answer?: string;
  source_refs?: number[];
}

function fmt(date: string | null | undefined) {
  return date ? new Date(date).toLocaleString("pt-PT") : "—";
}

export function ContentDetailDrawer({ contentId, onClose }: Props) {
  const detail = useContentDetail(contentId);
  const versions = useContentVersions(contentId);
  const sources = useContentSources(contentId);
  const reviews = useContentReviews(contentId);
  const item = detail.data ?? null;
  const run = useContentRun(item?.run_id ?? null, item?.task_id ?? null);
  const setStatus = useSetContentStatus();
  const restore = useRestoreContentVersion();
  const [note, setNote] = useState("");

  const current = versions.data?.find((v) => v.id === item?.current_version_id) ?? versions.data?.[0] ?? null;
  const blocks: Block[] = Array.isArray(current?.blocks) ? (current?.blocks as Block[]) : [];

  const act = async (status: ContentStatus) => {
    if (!contentId) return;
    if ((status === "rejected" || status === "archived") && note.trim().length < 2) {
      toast.error("Indica o motivo antes de rejeitar ou arquivar.");
      return;
    }
    try {
      await setStatus.mutateAsync({ id: contentId, status, note: note.trim() || null });
      setNote("");
      toast.success(`Estado atualizado para ${CONTENT_STATUS_LABEL[status]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o estado.");
    }
  };

  const onRestore = async (versionId: string) => {
    if (!contentId) return;
    try {
      await restore.mutateAsync({ contentId, versionId, note: note.trim() || null });
      toast.success("Versão reposta como nova versão.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível repor a versão.");
    }
  };

  return (
    <Sheet open={Boolean(contentId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">
            {detail.isLoading ? "A carregar…" : item?.title ?? "Conteúdo"}
          </SheetTitle>
        </SheetHeader>

        {detail.isLoading && (
          <div className="space-y-3 mt-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        )}
        {detail.error && <p className="mt-6 text-sm text-destructive">{(detail.error as Error).message}</p>}
        {!detail.isLoading && !detail.error && !item && (
          <p className="mt-6 text-sm text-muted-foreground">Conteúdo não encontrado.</p>
        )}

        {item && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{CONTENT_STATUS_LABEL[item.status] ?? item.status}</Badge>
              <Badge variant="outline">{CONTENT_TYPE_LABEL[item.content_type] ?? item.content_type}</Badge>
              <Badge variant="outline">{item.language}</Badge>
              {item.market && <Badge variant="outline">{item.market}</Badge>}
              <Badge variant={item.quality_passed ? "default" : "destructive"}>
                {item.quality_passed ? "Qualidade OK" : "Qualidade com bloqueios"}
              </Badge>
            </div>

            <Tabs defaultValue="conteudo">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                <TabsTrigger value="fontes">Fontes</TabsTrigger>
                <TabsTrigger value="versoes">Versões</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="execucao">Execução</TabsTrigger>
              </TabsList>

              <TabsContent value="conteudo" className="space-y-4 pt-4">
                <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Endereço e descrição</p>
                  <p className="text-sm text-foreground">/{item.slug}</p>
                  <p className="text-sm text-muted-foreground">{current?.meta_description ?? "—"}</p>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <h3 className="font-display font-semibold text-foreground">Texto do rascunho</h3>
                  {blocks.length === 0 && <p className="text-sm text-muted-foreground">Sem blocos nesta versão.</p>}
                  {blocks.map((b, i) => (
                    <div key={i} className="space-y-1">
                      {b.type === "heading" && <p className="font-semibold text-foreground">{b.text}</p>}
                      {b.type === "paragraph" && <p className="text-sm text-muted-foreground">{b.text}</p>}
                      {b.type === "list" && (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {(b.items ?? []).map((li, j) => <li key={j}>{li}</li>)}
                        </ul>
                      )}
                      {b.type === "faq" && (
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{b.question}</p>
                          <p className="text-muted-foreground">{b.answer}</p>
                        </div>
                      )}
                      {(b.source_refs ?? []).length > 0 && (
                        <p className="text-[11px] text-muted-foreground">Fontes: {(b.source_refs ?? []).join(", ")}</p>
                      )}
                    </div>
                  ))}
                </section>

                <ContentQualityBlock
                  qualityPassed={item.quality_passed}
                  issues={item.quality_issues}
                  wordCount={current?.word_count ?? null}
                />
              </TabsContent>

              <TabsContent value="fontes" className="space-y-3 pt-4">
                {(sources.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma fonte registada.</p>
                )}
                {(sources.data ?? []).map((s) => (
                  <div key={s.id} className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{s.source_scope === "internal" ? "Interna" : "Externa"}</Badge>
                      <Badge variant="outline">{s.evidence_type}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{s.title ?? s.source_table ?? s.url}</p>
                    {s.url && <p className="text-xs text-muted-foreground break-all">{s.url}</p>}
                    {s.excerpt && <p className="text-xs text-muted-foreground">{s.excerpt}</p>}
                    <p className="text-[11px] text-muted-foreground">Consultada: {fmt(s.consulted_at)}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="versoes" className="space-y-3 pt-4">
                {(versions.data ?? []).map((v) => (
                  <div key={v.id} className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Versão {v.version_number} {v.id === item.current_version_id && "· atual"}
                      </p>
                      {v.id !== item.current_version_id && (
                        <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => onRestore(v.id)}>
                          Repor
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{v.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.author_type === "agent" ? "Gerada pelo agente" : "Alteração humana"} · {fmt(v.created_at)} · {v.word_count} palavras
                    </p>
                    {v.change_reason && <p className="text-[11px] text-muted-foreground">{v.change_reason}</p>}
                  </div>
                ))}
                {(versions.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem versões registadas.</p>
                )}
              </TabsContent>

              <TabsContent value="historico" className="space-y-3 pt-4">
                {(reviews.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Ainda não há decisões registadas.</p>
                )}
                {(reviews.data ?? []).map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm text-foreground">
                      {CONTENT_STATUS_LABEL[r.decision] ?? r.decision}
                      {r.previous_status ? ` (era ${CONTENT_STATUS_LABEL[r.previous_status] ?? r.previous_status})` : ""}
                    </p>
                    {r.note && <p className="text-xs text-muted-foreground mt-1">{r.note}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{fmt(r.created_at)}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="execucao" className="space-y-3 pt-4">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-1 text-sm">
                  <p className="text-foreground">Tarefa: {run.data?.task?.task_type ?? "—"}</p>
                  <p className="text-muted-foreground">Estado da tarefa: {run.data?.task?.status ?? "—"}</p>
                  <p className="text-muted-foreground">
                    Modelo: {(run.data?.run as { model?: string } | null)?.model ?? "—"}
                  </p>
                  <p className="text-muted-foreground">
                    Custo: {(run.data?.costs ?? []).reduce((sum, c) => sum + Number(c.estimated_cost ?? 0), 0).toFixed(4)} USD
                  </p>
                  <p className="text-muted-foreground">Criado: {fmt(item.created_at)}</p>
                </div>
              </TabsContent>
            </Tabs>

            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-display font-semibold text-foreground">Decisão</h3>
              <p className="text-xs text-muted-foreground">
                A publicação no site continua a ser feita por ti. Aprovar apenas marca o conteúdo como pronto.
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota (obrigatória para rejeitar ou arquivar)"
                className="min-h-20"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => act("in_review")}>
                  Em revisão
                </Button>
                <Button size="sm" disabled={setStatus.isPending} onClick={() => act("approved")}>
                  Aprovar
                </Button>
                <Button size="sm" variant="destructive" disabled={setStatus.isPending} onClick={() => act("rejected")}>
                  Rejeitar
                </Button>
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => act("archived")}>
                  Arquivar
                </Button>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
