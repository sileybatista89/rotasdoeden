import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  COMPONENT_TYPE_LABEL,
} from "@/lib/supply";
import {
  FLIGHT_PROTECTION_LABEL, MARGIN_MODE_LABEL, POLICY_STATUS_LABEL, ROUNDING_LABEL,
  grossMargin, markupToMargin, marginToMarkup,
  type ComponentRule, type FeeRule, type FlightProtectionMethod, type MarginMode,
  type OperationalCostRule, type PricingComponentType, type RoundingMode, type SupplementRule,
} from "@/lib/pricing";
import { useSavePolicyVersion, useSetPolicyVersionStatus, type PricingPolicyVersionRow } from "@/hooks/usePricing";

const COMPONENT_TYPES: PricingComponentType[] = [
  "accommodation", "room", "transport", "transfer", "experience",
  "guide", "meal", "insurance", "flight", "other",
];

const ROUNDING_MODES: RoundingMode[] = ["none", "nearest_1", "nearest_5", "nearest_10", "nearest_50"];
const PROTECTION_METHODS: FlightProtectionMethod[] = [
  "fixed_amount", "percentage", "percentage_with_minimum", "percentage_with_maximum", "hybrid",
];

interface Props {
  version: PricingPolicyVersionRow;
}

export function PolicyVersionEditor({ version }: Props) {
  const save = useSavePolicyVersion();
  const setStatus = useSetPolicyVersionStatus();
  const editable = version.status === "draft";

  const [marginMode, setMarginMode] = useState<MarginMode>(version.margin_mode);
  const [minMargin, setMinMargin] = useState(String(version.min_margin_pct));
  const [targetMargin, setTargetMargin] = useState(String(version.target_margin_pct));
  const [rounding, setRounding] = useState<RoundingMode>(version.rounding_mode);
  const [rules, setRules] = useState<Partial<Record<PricingComponentType, ComponentRule>>>(
    version.component_rules ?? {},
  );
  const [protection, setProtection] = useState(version.flight_protection ?? { method: "percentage" as const, value: 0 });
  const [fees, setFees] = useState<FeeRule[]>(version.fees ?? []);
  const [supplements, setSupplements] = useState<SupplementRule[]>(version.supplements ?? []);
  const [operational, setOperational] = useState<OperationalCostRule[]>(version.operational_costs ?? []);
  const [reason, setReason] = useState(version.change_reason ?? "");

  const submit = async () => {
    const min = Number(minMargin);
    const target = Number(targetMargin);
    if (!(min >= 0 && min < 100) || !(target >= 0 && target < 100)) {
      toast({ title: "Percentagens têm de estar entre 0 e 100 (exclusive)", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        id: version.id,
        margin_mode: marginMode,
        min_margin_pct: min,
        target_margin_pct: target,
        rounding_mode: rounding,
        component_rules: rules,
        flight_protection: protection,
        fees,
        supplements,
        operational_costs: operational,
        change_reason: reason || "Atualização do rascunho",
      });
      toast({ title: "Rascunho guardado" });
    } catch (e) {
      toast({ title: "Não foi possível guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const changeStatus = async (status: "under_review" | "active" | "archived" | "draft") => {
    try {
      await setStatus.mutateAsync({ versionId: version.id, status });
      toast({ title: `Versão ${POLICY_STATUS_LABEL[status].toLowerCase()}` });
    } catch (e) {
      toast({ title: "Ação não permitida", description: (e as Error).message, variant: "destructive" });
    }
  };

  const example = 100;
  const markupPreview = example * (1 + Number(targetMargin || 0) / 100);
  const marginPreview = Number(targetMargin) < 100 ? example / (1 - Number(targetMargin || 0) / 100) : NaN;

  return (
    <Card className="p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">Versão {version.version_number}</p>
          <p className="text-xs text-muted-foreground">
            Moeda base {version.base_currency} · criada em {new Date(version.created_at).toLocaleDateString("pt-PT")}
          </p>
        </div>
        <Badge variant={version.status === "active" ? "default" : "secondary"}>
          {POLICY_STATUS_LABEL[version.status]}
        </Badge>
      </div>

      {!editable && (
        <p className="text-xs text-muted-foreground border border-border rounded-lg p-3">
          Esta versão já saiu de rascunho e é imutável. Para alterar regras, cria uma nova versão.
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label>Modo de cálculo</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={marginMode} disabled={!editable}
            onChange={(e) => setMarginMode(e.target.value as MarginMode)}
          >
            {(Object.keys(MARGIN_MODE_LABEL) as MarginMode[]).map((m) => (
              <option key={m} value={m}>{MARGIN_MODE_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="min-margin">Margem mínima (%)</Label>
          <Input id="min-margin" value={minMargin} disabled={!editable} onChange={(e) => setMinMargin(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="target-margin">
            {marginMode === "markup" ? "Markup alvo (%)" : "Margem bruta alvo (%)"}
          </Label>
          <Input id="target-margin" value={targetMargin} disabled={!editable} onChange={(e) => setTargetMargin(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Markup e margem bruta não são a mesma coisa</p>
        <p>
          Custo 100 com markup {targetMargin || 0}% → preço {markupPreview.toFixed(2)} (margem bruta{" "}
          {grossMargin(example, markupPreview).toFixed(2)}%).
        </p>
        <p>
          Custo 100 com margem alvo {targetMargin || 0}% → preço {Number.isFinite(marginPreview) ? marginPreview.toFixed(2) : ","}.
        </p>
        <p>
          Markup {targetMargin || 0}% equivale a margem {markupToMargin(Number(targetMargin || 0)).toFixed(2)}% · Margem{" "}
          {targetMargin || 0}% exige markup{" "}
          {Number(targetMargin) < 100 ? marginToMarkup(Number(targetMargin || 0)).toFixed(2) : ","}%.
        </p>
      </div>

      <div>
        <p className="font-medium text-sm mb-2">Regras por tipo de componente</p>
        <div className="space-y-2">
          {COMPONENT_TYPES.map((type) => {
            const rule = rules[type] ?? { mode: "markup" as const, value: 0 };
            return (
              <div key={type} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <span className="text-sm text-foreground">{COMPONENT_TYPE_LABEL[type]}</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={rule.mode} disabled={!editable}
                  onChange={(e) => setRules({ ...rules, [type]: { ...rule, mode: e.target.value as ComponentRule["mode"] } })}
                >
                  <option value="markup">Markup</option>
                  <option value="target_margin">Margem alvo</option>
                  <option value="pass_through">Sem margem (pass-through)</option>
                </select>
                <Input
                  value={String(rule.value)} disabled={!editable || rule.mode === "pass_through"}
                  onChange={(e) => setRules({ ...rules, [type]: { ...rule, value: Number(e.target.value) || 0 } })}
                  className="h-9"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox" checked={!!rule.marginIncluded} disabled={!editable}
                    onChange={(e) => setRules({ ...rules, [type]: { ...rule, marginIncluded: e.target.checked } })}
                  />
                  Custo já contém margem
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Proteção de tarifa aérea (estrutura futura)</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={protection.method} disabled={!editable}
            onChange={(e) => setProtection({ ...protection, method: e.target.value as FlightProtectionMethod })}
          >
            {PROTECTION_METHODS.map((m) => (
              <option key={m} value={m}>{FLIGHT_PROTECTION_LABEL[m]}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Input placeholder="valor" value={String(protection.value ?? 0)} disabled={!editable}
              onChange={(e) => setProtection({ ...protection, value: Number(e.target.value) || 0 })} />
            <Input placeholder="mínimo" value={String(protection.minimum ?? "")} disabled={!editable}
              onChange={(e) => setProtection({ ...protection, minimum: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input placeholder="máximo" value={String(protection.maximum ?? "")} disabled={!editable}
              onChange={(e) => setProtection({ ...protection, maximum: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Nesta fase não existe qualquer voo nem integração aérea. A regra fica apenas configurada.
          </p>
        </div>
        <div>
          <Label>Arredondamento (aplicado só no valor final)</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={rounding} disabled={!editable}
            onChange={(e) => setRounding(e.target.value as RoundingMode)}
          >
            {ROUNDING_MODES.map((m) => <option key={m} value={m}>{ROUNDING_LABEL[m]}</option>)}
          </select>
        </div>
      </div>

      <ListEditor
        title="Taxas"
        rows={fees.map((f) => `${f.label} · ${f.kind === "fixed" ? f.amount : `${f.amount}%`}`)}
        disabled={!editable}
        onAdd={(label, kind, amount) => setFees([...fees, { label, kind: kind === "percentage" ? "percentage" : "fixed", amount }])}
        onRemove={(i) => setFees(fees.filter((_, idx) => idx !== i))}
        kinds={[["fixed", "Fixa"], ["percentage", "Percentual"]]}
      />

      <ListEditor
        title="Suplementos"
        rows={supplements.map((s) => `${s.label} · ${s.amount} (${s.kind})`)}
        disabled={!editable}
        onAdd={(label, kind, amount) => setSupplements([...supplements, { label, kind: kind as SupplementRule["kind"], amount }])}
        onRemove={(i) => setSupplements(supplements.filter((_, idx) => idx !== i))}
        kinds={[["per_person", "Por pessoa"], ["per_night", "Por noite"], ["per_room", "Por quarto"], ["per_component", "Por componente"], ["fixed", "Fixo"]]}
      />

      <ListEditor
        title="Custos operacionais"
        rows={operational.map((o) => `${o.label} · ${o.amount} (${o.kind})${o.marginIncluded ? " · já com margem" : ""}`)}
        disabled={!editable}
        onAdd={(label, kind, amount) => setOperational([...operational, { label, kind: kind as OperationalCostRule["kind"], amount }])}
        onRemove={(i) => setOperational(operational.filter((_, idx) => idx !== i))}
        kinds={[["fixed", "Fixo"], ["per_person", "Por pessoa"], ["per_day", "Por dia"]]}
      />

      {editable && (
        <div className="space-y-2">
          <Label htmlFor="reason">Motivo da alteração</Label>
          <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {editable && <Button size="sm" onClick={submit} disabled={save.isPending}>Guardar rascunho</Button>}
        {version.status === "draft" && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("under_review")}>Enviar para revisão</Button>
        )}
        {version.status === "under_review" && (
          <>
            <Button size="sm" onClick={() => changeStatus("active")}>Ativar</Button>
            <Button size="sm" variant="outline" onClick={() => changeStatus("draft")}>Devolver a rascunho</Button>
          </>
        )}
        {version.status !== "archived" && (
          <Button size="sm" variant="ghost" onClick={() => changeStatus("archived")}>Arquivar</Button>
        )}
      </div>
    </Card>
  );
}

function ListEditor({
  title, rows, kinds, disabled, onAdd, onRemove,
}: {
  title: string;
  rows: string[];
  kinds: [string, string][];
  disabled: boolean;
  onAdd: (label: string, kind: string, amount: number) => void;
  onRemove: (index: number) => void;
}) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState(kinds[0][0]);
  const [amount, setAmount] = useState("");

  return (
    <div>
      <p className="font-medium text-sm mb-2">{title}</p>
      <div className="space-y-1 mb-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Nada configurado.</p>}
        {rows.map((r, i) => (
          <div key={`${r}-${i}`} className="flex items-center justify-between text-sm border border-border rounded-md px-2 py-1">
            <span>{r}</span>
            {!disabled && <Button size="sm" variant="ghost" onClick={() => onRemove(i)}>Remover</Button>}
          </div>
        ))}
      </div>
      {!disabled && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Designação" value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
          <Button
            size="sm" variant="outline"
            onClick={() => {
              const value = Number(amount);
              if (!label.trim() || !Number.isFinite(value) || value <= 0) return;
              onAdd(label.trim(), kind, value);
              setLabel(""); setAmount("");
            }}
          >
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
