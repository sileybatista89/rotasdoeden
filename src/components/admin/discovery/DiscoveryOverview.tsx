import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DiscoveryStats } from "@/hooks/useDiscovery";

interface Props {
  stats: DiscoveryStats | null | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Number(v).toFixed(6)} USD`;

const num = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

export function DiscoveryOverview({ stats, loading, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-sm text-foreground font-medium">Não foi possível carregar as estatísticas.</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Tentar novamente</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "Total", value: num(stats?.total ?? 0) },
    { label: "Novas", value: num(stats?.novas ?? 0) },
    { label: "Em análise", value: num(stats?.em_analise ?? 0) },
    { label: "Aceites", value: num(stats?.aceites ?? 0) },
    { label: "Rejeitadas", value: num(stats?.rejeitadas ?? 0) },
    { label: "Expiradas", value: num(stats?.expiradas ?? 0) },
    { label: "Score médio", value: stats?.avg_score !== null && stats?.avg_score !== undefined ? Number(stats.avg_score).toFixed(2) : "—" },
    { label: "Confiança média", value: stats?.avg_confidence !== null && stats?.avg_confidence !== undefined ? Number(stats.avg_confidence).toFixed(2) : "—" },
    { label: "Países distintos", value: num(stats?.distinct_countries ?? 0) },
    { label: "Mercados distintos", value: num(stats?.distinct_markets ?? 0) },
    { label: "Custo total Discovery", value: money(stats?.total_cost) },
    {
      label: "Custo médio por oportunidade",
      value: money(stats?.avg_cost),
      hint: stats?.total ? undefined : "Sem oportunidades registadas",
    },
    {
      label: "Última execução Discovery",
      value: stats?.last_run_at ? new Date(stats.last_run_at).toLocaleString("pt-PT") : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{c.label}</p>
          <p className="font-display text-2xl font-bold text-foreground mt-1 break-words">{c.value}</p>
          {c.hint && <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}
