import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiscoveryFilterState } from "@/hooks/useDiscovery";
import { emptyFilters } from "@/hooks/useDiscovery";

type Facets = Record<"country" | "market" | "language" | "intent" | "category" | "source" | "status", string[]>;

interface Props {
  value: DiscoveryFilterState;
  onChange: (next: DiscoveryFilterState) => void;
  facets: Facets | undefined;
}

const ALL = "__all__";

const STATUS_LABEL: Record<string, string> = {
  nova: "Nova", em_analise: "Em análise", aceite: "Aceite", rejeitada: "Rejeitada", expirada: "Expirada",
};

export function DiscoveryFilters({ value, onChange, facets }: Props) {
  const set = (patch: Partial<DiscoveryFilterState>) => onChange({ ...value, ...patch });

  const selects: { key: keyof Facets; label: string }[] = [
    { key: "country", label: "País" },
    { key: "market", label: "Mercado" },
    { key: "language", label: "Idioma" },
    { key: "intent", label: "Intenção" },
    { key: "category", label: "Categoria" },
    { key: "status", label: "Estado" },
    { key: "source", label: "Fonte" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Pesquisar por query, país, mercado, categoria ou racional"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          className="sm:max-w-md"
        />
        <Button variant="outline" onClick={() => onChange(emptyFilters)}>Limpar filtros</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {selects.map(({ key, label }) => {
          const options = facets?.[key] ?? [];
          if (options.length === 0) return null;
          return (
            <Select
              key={key}
              value={value[key] || ALL}
              onValueChange={(v) => set({ [key]: v === ALL ? "" : v } as Partial<DiscoveryFilterState>)}
            >
              <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{label}: todos</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o} value={o}>{key === "status" ? STATUS_LABEL[o] ?? o : o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}

        <Input type="number" min={0} max={100} placeholder="Score mín." value={value.minScore}
          onChange={(e) => set({ minScore: e.target.value })} />
        <Input type="number" min={0} max={100} placeholder="Confiança mín." value={value.minConfidence}
          onChange={(e) => set({ minConfidence: e.target.value })} />
        <Input type="date" aria-label="De" value={value.from} onChange={(e) => set({ from: e.target.value })} />
        <Input type="date" aria-label="Até" value={value.to} onChange={(e) => set({ to: e.target.value })} />
      </div>
    </div>
  );
}
