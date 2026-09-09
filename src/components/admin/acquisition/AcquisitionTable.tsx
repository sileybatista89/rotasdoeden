import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACQUISITION_PAGE_SIZE,
  CHANNEL_LABEL,
  MARKET_STATE_LABEL,
  PLAN_DECISION_LABEL,
  PLAN_STATUS_LABEL,
  type AcquisitionPlan,
} from "@/hooks/useAcquisition";

interface Props {
  rows: AcquisitionPlan[];
  count: number;
  page: number;
  onPage: (p: number) => void;
  loading: boolean;
  fetching: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpen: (id: string) => void;
}

function statusVariant(status: string) {
  if (status === "aprovado") return "default" as const;
  if (status === "rejeitado") return "destructive" as const;
  return "outline" as const;
}

export function AcquisitionTable({ rows, count, page, onPage, loading, fetching, error, onRetry, onOpen }: Props) {
  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Tentar de novo</Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Nenhum plano de aquisição corresponde a estes filtros.
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(count / ACQUISITION_PAGE_SIZE));

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border border-border bg-card overflow-hidden ${fetching ? "opacity-70" : ""}`}>
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
          <span className="col-span-4">Mercado / hipótese</span>
          <span className="col-span-2">Canal</span>
          <span className="col-span-2">Estado do mercado</span>
          <span className="col-span-1">Score</span>
          <span className="col-span-2">Estado</span>
          <span className="col-span-1 text-right">Ver</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="grid md:grid-cols-12 gap-2 px-4 py-3 items-center">
              <div className="md:col-span-4 min-w-0">
                <p className="font-medium text-foreground truncate">{row.market}{row.country ? ` · ${row.country}` : ""}</p>
                <p className="text-xs text-muted-foreground truncate">{row.hypothesis}</p>
              </div>
              <div className="md:col-span-2 text-sm text-muted-foreground">{CHANNEL_LABEL[row.channel] ?? row.channel}</div>
              <div className="md:col-span-2 text-sm text-muted-foreground">{MARKET_STATE_LABEL[row.market_state] ?? row.market_state}</div>
              <div className="md:col-span-1 text-sm text-foreground">{Number(row.acquisition_score ?? 0).toFixed(0)}</div>
              <div className="md:col-span-2 flex flex-wrap gap-1">
                <Badge variant={statusVariant(row.status)}>{PLAN_STATUS_LABEL[row.status] ?? row.status}</Badge>
                <Badge variant="outline">{PLAN_DECISION_LABEL[row.decision] ?? row.decision}</Badge>
              </div>
              <div className="md:col-span-1 md:text-right">
                <Button size="sm" variant="outline" onClick={() => onOpen(row.id)}>Abrir</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{count} planos · página {page + 1} de {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Seguinte</Button>
        </div>
      </div>
    </div>
  );
}
