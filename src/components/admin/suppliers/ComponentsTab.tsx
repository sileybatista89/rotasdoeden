import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  CANCELLATION_LABEL, COMPONENT_TYPE_LABEL, MEAL_PLAN_LABEL, RATE_KIND_LABEL,
  RATE_STATUS_LABEL, RATE_UNIT_LABEL, SOURCE_TYPE_LABEL, SUPPLY_STATUS_LABEL,
  canTransitionRate, formatRateAmount, isUsableAsCurrentCost, validateRate,
  type RateKind, type RateStatus, type RateUnit, type SourceType,
} from "@/lib/supply";
import {
  useComponentRates, useComponents, useSaveComponent, useSaveRate,
  useSetRateStatus, useSuppliers,
} from "@/hooks/useSupply";

const emptyRate = {
  rate_kind: "market_observed_price" as RateKind,
  price: "",
  currency: "EUR",
  unit: "per_night" as RateUnit,
  source_type: "official_website" as SourceType,
  source_reference: "",
  observed_at: new Date().toISOString().slice(0, 10),
  valid_from: "",
  valid_until: "",
  occupancy_adults: "",
  occupancy_children: "",
  occupancy_total: "",
  meal_plan: "unknown",
  cancellation_type: "unknown",
};

export function ComponentsTab() {
  const components = useComponents();
  const suppliers = useSuppliers();
  const saveComponent = useSaveComponent();
  const saveRate = useSaveRate();
  const setRateStatus = useSetRateStatus();

  const [openId, setOpenId] = useState<string | null>(null);
  const rates = useComponentRates(openId);
  const [form, setForm] = useState({ name: "", component_type: "accommodation", supplier_id: "" });
  const [rateForm, setRateForm] = useState(emptyRate);

  const addComponent = async () => {
    if (!form.name.trim()) return toast({ title: "Indica o nome do componente", variant: "destructive" });
    try {
      await saveComponent.mutateAsync({
        name: form.name.trim(),
        component_type: form.component_type,
        supplier_id: form.supplier_id || null,
      });
      setForm({ name: "", component_type: "accommodation", supplier_id: "" });
      toast({ title: "Componente criado em rascunho" });
    } catch (e) {
      toast({ title: "Não foi possível criar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addRate = async () => {
    const validityUnknown = !rateForm.valid_until && !rateForm.valid_from;
    const problem = validateRate({
      component_id: openId,
      rate_kind: rateForm.rate_kind,
      price: rateForm.price === "" ? null : Number(rateForm.price),
      currency: rateForm.currency.toUpperCase(),
      unit: rateForm.unit,
      source_type: rateForm.source_type,
      observed_at: rateForm.observed_at,
      valid_from: rateForm.valid_from || null,
      valid_until: rateForm.valid_until || null,
      validity_unknown: validityUnknown,
      occupancy_adults: rateForm.occupancy_adults === "" ? null : Number(rateForm.occupancy_adults),
      occupancy_children: rateForm.occupancy_children === "" ? null : Number(rateForm.occupancy_children),
      occupancy_total: rateForm.occupancy_total === "" ? null : Number(rateForm.occupancy_total),
    });
    if (problem) return toast({ title: problem, variant: "destructive" });

    try {
      await saveRate.mutateAsync({
        component_id: openId,
        rate_kind: rateForm.rate_kind,
        price: rateForm.price,
        currency: rateForm.currency.toUpperCase(),
        unit: rateForm.unit,
        source_type: rateForm.source_type,
        source_reference: rateForm.source_reference || null,
        observed_at: new Date(rateForm.observed_at).toISOString(),
        valid_from: rateForm.valid_from || null,
        valid_until: rateForm.valid_until || null,
        validity_unknown: validityUnknown,
        occupancy_adults: rateForm.occupancy_adults || null,
        occupancy_children: rateForm.occupancy_children || null,
        occupancy_total: rateForm.occupancy_total || null,
        meal_plan: rateForm.meal_plan,
        cancellation_type: rateForm.cancellation_type,
      });
      setRateForm({ ...emptyRate, observed_at: new Date().toISOString().slice(0, 10) });
      toast({ title: "Tarifa registada com fonte e data" });
    } catch (e) {
      toast({ title: "Não foi possível registar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const changeRateStatus = async (rateId: string, from: RateStatus, status: RateStatus) => {
    if (!canTransitionRate(from, status)) {
      return toast({ title: "Uma tarifa fechada não pode ser reaberta", variant: "destructive" });
    }
    try {
      await setRateStatus.mutateAsync({ rateId, status });
      toast({ title: `Tarifa marcada como ${RATE_STATUS_LABEL[status].toLowerCase()}` });
    } catch (e) {
      toast({ title: "Não foi possível alterar", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Novo componente</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.component_type} onChange={(e) => setForm({ ...form, component_type: e.target.value })}>
            {Object.entries(COMPONENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">Sem fornecedor associado</option>
            {(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.trading_name || s.legal_name}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={addComponent} disabled={saveComponent.isPending}>Criar componente</Button>
      </Card>

      {(components.data ?? []).length === 0 ? (
        <Card className="p-10 text-center">
          <h3 className="font-display font-semibold text-foreground mb-1">Ainda sem componentes</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Os componentes ligam fornecedores, alojamentos, quartos e serviços já existentes às tarifas reais.
          </p>
        </Card>
      ) : (
        (components.data ?? []).map((c) => (
          <Card key={c.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {COMPONENT_TYPE_LABEL[c.component_type]} · {SUPPLY_STATUS_LABEL[c.status]}
                  {c.service_id ? " · usa um serviço já existente" : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                {openId === c.id ? "Fechar" : "Tarifas"}
              </Button>
            </div>

            {openId === c.id && (
              <div className="border-t border-border pt-3 space-y-4">
                {(rates.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem tarifas registadas para este componente.</p>
                )}
                {(rates.data ?? []).map((r) => (
                  <div key={r.id} className="text-sm border border-border rounded-lg p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{RATE_KIND_LABEL[r.rate_kind]}</Badge>
                      <Badge variant="outline">{RATE_STATUS_LABEL[r.status]}</Badge>
                      {isUsableAsCurrentCost(r) && <Badge>Custo confirmado atual</Badge>}
                      {r.validity_unknown && <Badge variant="outline">Validade desconhecida</Badge>}
                    </div>
                    <p className="text-foreground">{formatRateAmount(Number(r.price), r.currency, r.unit)}</p>
                    <p className="text-xs text-muted-foreground">
                      Fonte: {SOURCE_TYPE_LABEL[r.source_type]}
                      {r.source_reference ? ` (${r.source_reference})` : ""} · observado em {new Date(r.observed_at).toLocaleDateString("pt-PT")}
                      {r.valid_until ? ` · válido até ${r.valid_until}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {MEAL_PLAN_LABEL[r.meal_plan]} · {CANCELLATION_LABEL[r.cancellation_type]}
                      {r.occupancy_total ? ` · ocupação ${r.occupancy_total}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(["quoted", "negotiated", "confirmed", "expired", "withdrawn"] as RateStatus[])
                        .filter((s) => s !== r.status && canTransitionRate(r.status, s))
                        .map((s) => (
                          <Button key={s} size="sm" variant="outline" onClick={() => changeRateStatus(r.id, r.status, s)}>
                            {RATE_STATUS_LABEL[s]}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nova tarifa</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={rateForm.rate_kind} onChange={(e) => setRateForm({ ...rateForm, rate_kind: e.target.value as RateKind })}>
                      {Object.entries(RATE_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <Input placeholder="Valor" inputMode="decimal" value={rateForm.price} onChange={(e) => setRateForm({ ...rateForm, price: e.target.value })} />
                    <Input placeholder="Moeda" value={rateForm.currency} onChange={(e) => setRateForm({ ...rateForm, currency: e.target.value })} />
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={rateForm.unit} onChange={(e) => setRateForm({ ...rateForm, unit: e.target.value as RateUnit })}>
                      {Object.entries(RATE_UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={rateForm.source_type} onChange={(e) => setRateForm({ ...rateForm, source_type: e.target.value as SourceType })}>
                      {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <Input placeholder="Referência da fonte" value={rateForm.source_reference} onChange={(e) => setRateForm({ ...rateForm, source_reference: e.target.value })} />
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Observado em</Label>
                      <Input type="date" value={rateForm.observed_at} onChange={(e) => setRateForm({ ...rateForm, observed_at: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Válido de</Label>
                      <Input type="date" value={rateForm.valid_from} onChange={(e) => setRateForm({ ...rateForm, valid_from: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Válido até</Label>
                      <Input type="date" value={rateForm.valid_until} onChange={(e) => setRateForm({ ...rateForm, valid_until: e.target.value })} />
                    </div>
                    <Input placeholder="Adultos" inputMode="numeric" value={rateForm.occupancy_adults} onChange={(e) => setRateForm({ ...rateForm, occupancy_adults: e.target.value })} />
                    <Input placeholder="Crianças" inputMode="numeric" value={rateForm.occupancy_children} onChange={(e) => setRateForm({ ...rateForm, occupancy_children: e.target.value })} />
                    <Input placeholder="Total" inputMode="numeric" value={rateForm.occupancy_total} onChange={(e) => setRateForm({ ...rateForm, occupancy_total: e.target.value })} />
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={rateForm.meal_plan} onChange={(e) => setRateForm({ ...rateForm, meal_plan: e.target.value })}>
                      {Object.entries(MEAL_PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={rateForm.cancellation_type} onChange={(e) => setRateForm({ ...rateForm, cancellation_type: e.target.value })}>
                      {Object.entries(CANCELLATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sem validade indicada, a tarifa fica marcada como validade desconhecida e não pode ser usada como custo confirmado.
                  </p>
                  <Button size="sm" onClick={addRate} disabled={saveRate.isPending}>Registar tarifa</Button>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
