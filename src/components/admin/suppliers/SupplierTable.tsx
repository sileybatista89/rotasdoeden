import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RELATIONSHIP_LABEL, SUPPLIER_TYPE_LABEL, SUPPLY_STATUS_LABEL } from "@/lib/supply";
import type { Supplier } from "@/hooks/useSupply";

interface Props {
  rows: Supplier[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpen: (id: string) => void;
}

export function SupplierTable({ rows, loading, error, onRetry, onOpen }: Props) {
  if (loading) return <Card className="p-8 text-sm text-muted-foreground">A carregar fornecedores…</Card>;
  if (error) {
    return (
      <Card className="p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar os fornecedores.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Tentar de novo</Button>
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <h3 className="font-display font-semibold text-foreground mb-1">Ainda sem fornecedores</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Regista aqui hotéis, guest houses, transportes, restauração e outros parceiros reais.
          Nada é criado automaticamente e nada fica visível no site.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th className="p-3">Fornecedor</th>
            <th className="p-3">Tipo</th>
            <th className="p-3 hidden md:table-cell">Localidade</th>
            <th className="p-3 hidden md:table-cell">Relação</th>
            <th className="p-3">Estado</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="p-3">
                <p className="font-medium text-foreground">{s.trading_name || s.legal_name}</p>
                {s.trading_name && <p className="text-xs text-muted-foreground">{s.legal_name}</p>}
              </td>
              <td className="p-3 text-muted-foreground">{SUPPLIER_TYPE_LABEL[s.supplier_type]}</td>
              <td className="p-3 text-muted-foreground hidden md:table-cell">{s.locality ?? "n/d"}</td>
              <td className="p-3 text-muted-foreground hidden md:table-cell">{RELATIONSHIP_LABEL[s.relationship_stage]}</td>
              <td className="p-3"><Badge variant="outline">{SUPPLY_STATUS_LABEL[s.status]}</Badge></td>
              <td className="p-3 text-right">
                <Button size="sm" variant="ghost" onClick={() => onOpen(s.id)}>Abrir</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
