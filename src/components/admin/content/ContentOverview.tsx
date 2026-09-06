import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentStats } from "@/hooks/useContent";

interface Props {
  stats: ContentStats | null | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold text-foreground mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function ContentOverview({ stats, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Tentar de novo</Button>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-display text-lg font-semibold text-foreground">Ainda não existe conteúdo gerado</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
          O agente de conteúdo só trabalha a partir de oportunidades aceites no Discovery. Assim que existir
          um rascunho, aparece aqui para revisão. Nada é publicado sem a tua aprovação.
        </p>
      </div>
    );
  }

  const cost = Number(stats.content_cost ?? 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card label="Total" value={String(stats.total)} hint={`${stats.from_opportunities} a partir de oportunidades`} />
      <Card label="Rascunhos" value={String(stats.draft)} />
      <Card label="Em revisão" value={String(stats.in_review)} hint={`${stats.pending_publications} pedidos de publicação`} />
      <Card label="Aprovados" value={String(stats.approved)} />
      <Card label="Publicados" value={String(stats.published)} />
      <Card label="Rejeitados" value={String(stats.rejected)} hint={`${stats.archived} arquivados`} />
      <Card label="Qualidade OK" value={`${stats.quality_passed}/${stats.total}`} hint={`${stats.languages} idiomas`} />
      <Card label="Custo IA" value={`${cost.toFixed(4)} USD`} hint={`${stats.content_runs} execuções`} />
    </div>
  );
}
