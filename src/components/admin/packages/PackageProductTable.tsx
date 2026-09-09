import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRODUCT_STATUS_LABEL, PRODUCT_TYPE_LABEL, formatDuration } from "@/lib/travelProducts";
import type { TravelProduct } from "@/hooks/useTravelProducts";

interface Props {
  rows: TravelProduct[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpen: (id: string) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  under_review: "secondary",
  draft: "outline",
  archived: "outline",
};

export function PackageProductTable({ rows, loading, error, onRetry, onOpen }: Props) {
  if (loading) {
    return <Card className="p-6 text-sm text-muted-foreground">A carregar produtos…</Card>;
  }
  if (error) {
    return (
      <Card className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar os produtos.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Tentar de novo</Button>
      </Card>
    );
  }
  if (rows.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">Ainda não existe nenhum produto.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Duração</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Versão atual</th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{PRODUCT_TYPE_LABEL[p.product_type]}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDuration(p)}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[p.status] ?? "outline"}>{PRODUCT_STATUS_LABEL[p.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.current_version_id ? "Publicada" : "Sem versão publicada"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString("pt-PT")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onOpen(p.id)}>Abrir</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
