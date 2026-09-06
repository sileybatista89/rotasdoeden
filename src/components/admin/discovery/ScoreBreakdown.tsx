import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/hooks/useDiscovery";

const LABELS: Record<string, string> = {
  travel_intent: "Intenção de viagem",
  stp_relevance: "Relevância STP",
  volume: "Volume",
  potential_value: "Valor potencial",
  competition: "Concorrência",
  seasonality: "Sazonalidade",
};

interface Props {
  opportunity: Opportunity;
  configWeights: Record<string, number> | null;
}

export function ScoreBreakdown({ opportunity, configWeights }: Props) {
  const metrics = (opportunity.metrics ?? {}) as Record<string, unknown>;
  const applied = (metrics.applied_weights ?? null) as Record<string, number> | null;
  const missing = (metrics.missing_components ?? []) as string[];
  const weights = applied ?? configWeights;
  const usedRunWeights = Boolean(applied);
  const totalWeight = weights ? Object.values(weights).reduce((a, b) => a + Number(b || 0), 0) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Opportunity score</p>
          <p className="font-display text-3xl font-bold text-foreground">{Number(opportunity.opportunity_score).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Confidence score</p>
          <p className="font-display text-3xl font-bold text-foreground">{Number(opportunity.confidence_score).toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Componentes e pesos</p>
          <Badge variant="outline" className="text-[10px]">
            {usedRunWeights ? "Pesos da execução" : weights ? "Pesos actuais da configuração" : "Pesos indisponíveis"}
          </Badge>
        </div>
        {!weights || totalWeight === 0 ? (
          <p className="text-sm text-muted-foreground">Pesos não disponíveis para esta oportunidade.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(weights).map(([key, weight]) => {
              const share = (Number(weight) / totalWeight) * 100;
              const absent = missing.includes(key);
              return (
                <li key={key} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{LABELS[key] ?? key}</span>
                    <span className="text-muted-foreground text-xs">
                      peso {Number(weight)} · {share.toFixed(0)}%{absent ? " · sem dados" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                    <div
                      className={absent ? "h-full bg-muted-foreground/40" : "h-full bg-primary"}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Componentes sem dados observados: {missing.map((m) => LABELS[m] ?? m).join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}
