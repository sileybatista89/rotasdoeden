import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTENT_PAGE_SIZE,
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  type ContentItem,
} from "@/hooks/useContent";

interface Props {
  rows: ContentItem[];
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
  if (status === "published" || status === "approved") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  return "outline" as const;
}

export function ContentTable({ rows, count, page, onPage, loading, fetching, error, onRetry, onOpen }: Props) {
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
        Nenhum conteúdo corresponde a estes filtros.
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(count / CONTENT_PAGE_SIZE));

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border border-border bg-card overflow-hidden ${fetching ? "opacity-70" : ""}`}>
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
          <span className="col-span-5">Título</span>
          <span className="col-span-2">Tipo</span>
          <span className="col-span-2">Idioma / mercado</span>
          <span className="col-span-2">Estado</span>
          <span className="col-span-1 text-right">Ver</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="grid md:grid-cols-12 gap-2 px-4 py-3 items-center">
              <div className="md:col-span-5 min-w-0">
                <p className="font-medium text-foreground truncate">{row.title ?? "(sem título)"}</p>
                <p className="text-xs text-muted-foreground truncate">/{row.slug ?? ""}</p>
              </div>
              <div className="md:col-span-2 text-sm text-muted-foreground">
                {CONTENT_TYPE_LABEL[row.content_type] ?? row.content_type}
              </div>
              <div className="md:col-span-2 text-sm text-muted-foreground">
                {row.language}{row.market ? ` · ${row.market}` : ""}
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-1">
                <Badge variant={statusVariant(row.status)}>{CONTENT_STATUS_LABEL[row.status] ?? row.status}</Badge>
                {!row.quality_passed && <Badge variant="destructive">Qualidade</Badge>}
              </div>
              <div className="md:col-span-1 md:text-right">
                <Button size="sm" variant="outline" onClick={() => onOpen(row.id)}>Abrir</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{count} conteúdos · página {page + 1} de {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Seguinte</Button>
        </div>
      </div>
    </div>
  );
}
