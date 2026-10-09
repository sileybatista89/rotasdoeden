import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/hooks/useDiscovery";

const EVIDENCE_LABEL: Record<string, string> = {
  observed: "Observado",
  interpreted: "Interpretado",
  hypothesis: "Hipótese",
  recommendation: "Recomendação",
};

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${tone}`} />
        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">{title}</p>
      </div>
      <div className="text-sm text-foreground space-y-1">{children}</div>
    </div>
  );
}

export function EvidenceBlock({ opportunity }: { opportunity: Opportunity }) {
  const metrics = (opportunity.metrics ?? {}) as Record<string, unknown>;
  const observed = ["impressions", "clicks", "position", "ctr", "period_start", "period_end"]
    .map((k) => [k, metrics[k]] as const)
    .filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="space-y-3">
      <Badge variant="outline" className="text-[10px]">
        Tipo de evidência registada: {EVIDENCE_LABEL[opportunity.evidence_type] ?? opportunity.evidence_type}
      </Badge>

      <Section title="Observado (dados da fonte)" tone="bg-primary">
        {observed.length === 0 ? (
          <p className="text-muted-foreground">Sem métricas observadas registadas.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {observed.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{k}</span>
                <span>{String(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Interpretado (modelo)" tone="bg-secondary">
        <p>Intenção: {opportunity.intent ?? "n/d"}</p>
        <p>
          Confiança da intenção:{" "}
          {opportunity.intent_confidence !== null ? `${Number(opportunity.intent_confidence).toFixed(0)}%` : "n/d"}
        </p>
        <p>Categoria: {opportunity.category ?? "n/d"}</p>
        <p>Sazonalidade: {opportunity.season ?? "n/d"}</p>
      </Section>

      <Section title="Hipótese (racional registado)" tone="bg-eden-ocean">
        <p className="whitespace-pre-wrap">{opportunity.rationale ?? "Sem racional registado nesta execução."}</p>
      </Section>

      <Section title="Recomendação" tone="bg-muted-foreground">
        <p className="whitespace-pre-wrap">
          {opportunity.recommended_action ?? "Sem recomendação registada."}
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          A recomendação é informativa. Aceitar uma oportunidade não executa nenhuma ação automática.
        </p>
      </Section>
    </div>
  );
}
