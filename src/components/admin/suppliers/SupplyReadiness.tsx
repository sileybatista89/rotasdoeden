import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplyReadiness } from "@/hooks/useSupply";

/**
 * Mostra ao admin, sem inventar nada, o que falta para o inventário
 * comercial conseguir alimentar o cálculo de preços e as propostas.
 */
export function SupplyReadiness() {
  const q = useSupplyReadiness();

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (q.error) {
    return (
      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar os indicadores.</p>
        <Button size="sm" variant="outline" onClick={() => q.refetch()}>Tentar de novo</Button>
      </Card>
    );
  }

  const d = q.data;
  if (!d) return null;

  const gaps = [
    { label: "Componentes sem fornecedor", value: d.components.without_supplier },
    { label: "Componentes por aprovar", value: d.components.not_approved },
    { label: "Componentes sem tarifa", value: d.components.without_rate },
    { label: "Componentes sem tarifa válida", value: d.components.without_eligible_rate },
    { label: "Tarifas expiradas", value: d.rates.expired },
    { label: "Tarifas sem fonte", value: d.rates.without_source },
    { label: "Tarifas de validade desconhecida", value: d.rates.unknown_validity },
    { label: "Serviços sem ligação comercial", value: d.services.without_commercial_link },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">Prontidão comercial</p>
            <p className="text-xs text-muted-foreground">
              {d.components.ready} de {d.components.total} componentes prontos ·{" "}
              {d.rates.eligible} de {d.rates.total} tarifas utilizáveis
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => q.refetch()}>Atualizar</Button>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {gaps.map((g) => (
            <li key={g.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">{g.label}</span>
              <Badge variant={g.value > 0 ? "destructive" : "outline"}>{g.value}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <p className="font-medium text-foreground">Catálogo editorial vs inventário comercial</p>
          <p className="text-xs text-muted-foreground">
            Um local pode continuar como inspiração enquanto não tiver serviço ou componente comercialmente válido.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Locais ativos", value: d.catalog.total },
            { label: "Ligados a componente", value: d.catalog.linked_component },
            { label: "Ligados a serviço", value: d.catalog.linked_service },
            { label: "Só editoriais", value: d.catalog.editorial_only },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-display font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-medium text-foreground">Produtos</p>
        <ul className="space-y-2">
          {d.products.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.has_version ? `${p.linked_components} componentes na versão atual` : "Sem versão publicada"}
                </p>
              </div>
              <Badge variant={p.has_version && p.linked_components > 0 ? "default" : "outline"}>
                {p.has_version && p.linked_components > 0 ? "Com componentes" : "Sem dados comerciais"}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
