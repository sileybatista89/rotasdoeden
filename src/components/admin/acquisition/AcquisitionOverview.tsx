import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAcquisitionMarkets, useAcquisitionStats, MARKET_STATE_LABEL } from "@/hooks/useAcquisition";

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-display text-foreground mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function AcquisitionOverview() {
  const stats = useAcquisitionStats();
  const markets = useAcquisitionMarkets();

  if (stats.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{stats.error.message}</p>
        <Button size="sm" variant="outline" onClick={() => stats.refetch()}>Tentar de novo</Button>
      </div>
    );
  }

  const s = stats.data;
  const rows = markets.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Planos" value={s?.total ?? 0} hint={`${s?.rascunho ?? 0} em rascunho`} />
        <Card label="Em revisão" value={s?.em_revisao ?? 0} hint={`${s?.rejeitado ?? 0} rejeitados`} />
        <Card label="Mercados analisados" value={s?.markets ?? 0} hint={`${s?.opportunities ?? 0} oportunidades usadas`} />
        <Card label="Score médio" value={s?.avg_score ?? 0} hint="0 a 100, calculado com dados observados" />
        <Card label="Campanhas em rascunho" value={s?.campaigns_draft ?? 0} hint="Nenhuma campanha é executada" />
        <Card label="Ativos pedidos" value={s?.assets_total ?? 0} hint="Pedidos ao Conteúdo IA" />
        <Card label="Resultados medidos" value={s?.results_total ?? 0} hint="Só existem após execução real" />
        <Card
          label="Custo do agente"
          value={`${Number(s?.acquisition_cost ?? 0).toFixed(4)} €`}
          hint={`${s?.acquisition_runs ?? 0} execuções`}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-2">Mercados</p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não existe nenhum plano de aquisição. Os mercados aparecem aqui quando o agente analisar oportunidades aceites no Discovery.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((m) => (
              <li key={`${m.market}-${m.market_state}`} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{m.market}</span>
                <span className="text-muted-foreground">{MARKET_STATE_LABEL[m.market_state] ?? m.market_state}</span>
                <span className="text-muted-foreground">{m.plans} planos · score {m.avg_score ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
