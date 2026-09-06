import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  emptyContentFilters,
  type ContentFilterState,
} from "@/hooks/useContent";

interface Facets {
  status: string[];
  contentType: string[];
  language: string[];
  market: string[];
}

interface Props {
  value: ContentFilterState;
  onChange: (next: ContentFilterState) => void;
  facets: Facets | undefined;
}

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

export function ContentFilters({ value, onChange, facets }: Props) {
  const set = (patch: Partial<ContentFilterState>) => onChange({ ...value, ...patch });
  const active = Object.values(value).some((v) => v !== "");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-2">
      <Input
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        placeholder="Procurar por título, endereço ou mercado"
        className="h-9 w-full sm:w-72"
        aria-label="Procurar conteúdo"
      />

      <select className={selectClass} value={value.status} onChange={(e) => set({ status: e.target.value })} aria-label="Estado">
        <option value="">Todos os estados</option>
        {(facets?.status ?? []).map((s) => (
          <option key={s} value={s}>{CONTENT_STATUS_LABEL[s] ?? s}</option>
        ))}
      </select>

      <select className={selectClass} value={value.contentType} onChange={(e) => set({ contentType: e.target.value })} aria-label="Tipo">
        <option value="">Todos os tipos</option>
        {(facets?.contentType ?? []).map((t) => (
          <option key={t} value={t}>{CONTENT_TYPE_LABEL[t] ?? t}</option>
        ))}
      </select>

      <select className={selectClass} value={value.language} onChange={(e) => set({ language: e.target.value })} aria-label="Idioma">
        <option value="">Todos os idiomas</option>
        {(facets?.language ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <select className={selectClass} value={value.market} onChange={(e) => set({ market: e.target.value })} aria-label="Mercado">
        <option value="">Todos os mercados</option>
        {(facets?.market ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      <select className={selectClass} value={value.quality} onChange={(e) => set({ quality: e.target.value })} aria-label="Qualidade">
        <option value="">Qualidade: tudo</option>
        <option value="passed">Aprovado no controlo</option>
        <option value="failed">Com problemas</option>
      </select>

      {active && (
        <Button variant="ghost" size="sm" onClick={() => onChange(emptyContentFilters)}>Limpar</Button>
      )}
    </div>
  );
}
