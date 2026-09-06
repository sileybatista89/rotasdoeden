import { ArrowUpDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAGE_SIZE, type Opportunity, type SortKey } from "@/hooks/useDiscovery";

const STATUS_STYLE: Record<string, string> = {
  nova: "bg-primary/10 text-primary border-primary/30",
  em_analise: "bg-secondary/20 text-secondary-foreground border-secondary/40",
  aceite: "bg-primary/15 text-primary border-primary/40",
  rejeitada: "bg-destructive/10 text-destructive border-destructive/30",
  expirada: "bg-muted text-muted-foreground border-border",
};
const STATUS_LABEL: Record<string, string> = {
  nova: "Nova", em_analise: "Em análise", aceite: "Aceite", rejeitada: "Rejeitada", expirada: "Expirada",
};

interface Props {
  rows: Opportunity[];
  count: number;
  page: number;
  onPage: (p: number) => void;
  sort: { key: SortKey; asc: boolean };
  onSort: (key: SortKey) => void;
  loading: boolean;
  fetching: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpen: (id: string) => void;
}

export function DiscoveryTable(props: Props) {
  const { rows, count, page, onPage, sort, onSort, loading, fetching, error, onRetry, onOpen } = props;

  if (error) {
    const denied = /permission|denied|not authorized|admin/i.test(error.message);
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-foreground">{denied ? "Acesso negado." : "Falha ao carregar oportunidades."}</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        {!denied && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Tentar novamente</Button>}
      </div>
    );
  }

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h3 className="font-display font-semibold text-foreground mb-1">Ainda não existem oportunidades descobertas.</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Quando o agente Discovery for executado de forma controlada, as oportunidades reais aparecem aqui.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label} <ArrowUpDown size={12} className={sort.key === k ? "text-primary" : "opacity-50"} />
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mercado</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>Query</TableHead>
              <TableHead>Intenção</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estação</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead><SortBtn k="opportunity_score" label="Score" /></TableHead>
              <TableHead><SortBtn k="confidence_score" label="Confiança" /></TableHead>
              <TableHead>Estado</TableHead>
              <TableHead><SortBtn k="discovered_at" label="Descoberta" /></TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                <TableCell>{r.market ?? "—"}</TableCell>
                <TableCell>{r.country}</TableCell>
                <TableCell>{r.language}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={r.query}>{r.query}</TableCell>
                <TableCell>{r.intent ?? "—"}</TableCell>
                <TableCell>{r.category ?? "—"}</TableCell>
                <TableCell>{r.season ?? "—"}</TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell className="font-semibold">{Number(r.opportunity_score).toFixed(1)}</TableCell>
                <TableCell>{Number(r.confidence_score).toFixed(1)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.discovered_at).toLocaleDateString("pt-PT")}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(r.id); }}>Ver</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {rows.map((r) => (
          <button key={r.id} onClick={() => onOpen(r.id)}
            className="w-full text-left rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-foreground">{r.query}</p>
              <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {r.country} · {r.language} · {r.category ?? "sem categoria"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Score {Number(r.opportunity_score).toFixed(1)} · Confiança {Number(r.confidence_score).toFixed(1)}
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground flex items-center gap-2">
          {count} oportunidade{count === 1 ? "" : "s"} · página {page + 1} de {totalPages}
          {fetching && <Loader2 size={14} className="animate-spin" />}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Seguinte</Button>
        </div>
      </div>
    </div>
  );
}
