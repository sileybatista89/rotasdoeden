import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useComponents } from "@/hooks/useSupply";
import { useSimulatePricing } from "@/hooks/usePricing";
import { PRICING_STATUS_LABEL, type PricingResult } from "@/lib/pricing";

export function PricingSimulation() {
  const components = useComponents();
  const simulate = useSimulatePricing();
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ days: "7", nights: "6", adults: "2", children: "0", rooms: "1" });
  const [result, setResult] = useState<PricingResult | null>(null);

  const run = async () => {
    try {
      const res = await simulate.mutateAsync({
        componentIds: selected,
        durationDays: Number(form.days) || 0,
        nights: Number(form.nights) || 0,
        adults: Number(form.adults) || 0,
        children: Number(form.children) || 0,
        rooms: Number(form.rooms) || 1,
        referenceDate: new Date().toISOString().slice(0, 10),
        persist: true,
      });
      setResult(res);
    } catch (e) {
      toast({ title: "Simulação não concluída", description: (e as Error).message, variant: "destructive" });
    }
  };

  const rows = components.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          A simulação é sempre calculada no servidor com a política ativa e os custos reais registados.
          Uma simulação nunca é um preço comercial confirmado.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([["days", "Dias"], ["nights", "Noites"], ["adults", "Adultos"], ["children", "Crianças"], ["rooms", "Quartos"]] as const).map(
            ([key, label]) => (
              <div key={key}>
                <Label htmlFor={`sim-${key}`}>{label}</Label>
                <Input
                  id={`sim-${key}`} inputMode="numeric" value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ),
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Componentes</p>
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ainda não existem componentes registados. Regista fornecedores e tarifas reais em “Fornecedores”.
            </p>
          )}
          <div className="space-y-1 max-h-56 overflow-auto">
            {rows.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected(e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id))
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <Button size="sm" onClick={run} disabled={simulate.isPending || selected.length === 0}>
          Simular preço
        </Button>
      </Card>

      {result && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Resultado</p>
            <Badge variant={result.status === "confirmed" ? "default" : "secondary"}>
              {PRICING_STATUS_LABEL[result.status]}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              ["Custo terrestre", result.landCost],
              ["Custo de voo", result.flightCost],
              ["Proteção de tarifa", result.flightProtection],
              ["Custos operacionais", result.operationalCosts],
              ["Custo total", result.costTotal],
              ["Taxas", result.fees],
              ["Suplementos", result.supplements],
              ["Subtotal", result.subtotal],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground">{label as string}</p>
                <p className="font-medium">{(value as number).toFixed(2)} {result.currency}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Preço final (arredondado uma única vez)</p>
            <p className="text-2xl font-display font-bold">{result.finalPrice.toFixed(2)} {result.currency}</p>
            <p className="text-xs text-muted-foreground">
              Margem bruta {result.grossMarginPct?.toFixed(2) ?? "n/d"}% · Markup {result.markupPct?.toFixed(2) ?? "n/d"}% ·
              Política v{result.policyVersionNumber}
            </p>
          </div>

          <div className="space-y-1">
            {result.components.map((line) => (
              <div key={line.componentId} className="text-xs border border-border rounded-md p-2">
                <p className="font-medium text-foreground">{line.name}</p>
                <p className="text-muted-foreground">
                  {line.unitPrice} × {line.quantity} = {line.cost.toFixed(2)} → venda {line.sellPrice.toFixed(2)}{" "}
                  {line.rateKind ? `· ${line.rateKind}` : ""}
                </p>
                {line.notes.map((n) => <p key={n} className="text-muted-foreground">• {n}</p>)}
              </div>
            ))}
          </div>

          {result.warnings.length > 0 && (
            <div className="text-xs text-amber-700">
              {result.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
            </div>
          )}
          {result.validationErrors.length > 0 && (
            <div className="text-xs text-destructive">
              {result.validationErrors.map((w) => <p key={w}>✕ {w}</p>)}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
