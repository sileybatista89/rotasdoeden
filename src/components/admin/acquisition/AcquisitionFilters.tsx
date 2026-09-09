import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHANNEL_LABEL,
  PLAN_DECISION_LABEL,
  PLAN_STATUS_LABEL,
  emptyAcquisitionFilters,
  type AcquisitionFilterState,
} from "@/hooks/useAcquisition";

interface Props {
  value: AcquisitionFilterState;
  onChange: (next: AcquisitionFilterState) => void;
  facets: { status: string[]; market: string[]; channel: string[]; decision: string[] } | undefined;
}

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

export function AcquisitionFilters({ value, onChange, facets }: Props) {
  const set = (patch: Partial<AcquisitionFilterState>) => onChange({ ...value, ...patch });
  const active = Object.values(value).some((v) => v !== "");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-2">
      <Input
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        placeholder="Procurar por mercado, hipótese ou objetivo"
        className="h-9 w-full sm:w-72"
        aria-label="Procurar planos"
      />
      <select className={selectClass} value={value.status} onChange={(e) => set({ status: e.target.value })} aria-label="Estado">
        <option value="">Todos os estados</option>
        {(facets?.status ?? []).map((s) => <option key={s} value={s}>{PLAN_STATUS_LABEL[s] ?? s}</option>)}
      </select>
      <select className={selectClass} value={value.market} onChange={(e) => set({ market: e.target.value })} aria-label="Mercado">
        <option value="">Todos os mercados</option>
        {(facets?.market ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select className={selectClass} value={value.channel} onChange={(e) => set({ channel: e.target.value })} aria-label="Canal">
        <option value="">Todos os canais</option>
        {(facets?.channel ?? []).map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c] ?? c}</option>)}
      </select>
      <select className={selectClass} value={value.decision} onChange={(e) => set({ decision: e.target.value })} aria-label="Decisão">
        <option value="">Todas as decisões</option>
        {(facets?.decision ?? []).map((d) => <option key={d} value={d}>{PLAN_DECISION_LABEL[d] ?? d}</option>)}
      </select>
      {active && <Button variant="ghost" size="sm" onClick={() => onChange(emptyAcquisitionFilters)}>Limpar</Button>}
    </div>
  );
}
