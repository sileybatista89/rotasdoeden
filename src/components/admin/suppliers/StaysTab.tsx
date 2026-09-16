import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { STAYS_CANCELLATION_LABEL } from "@/lib/accommodationProvider";
import { useComponents, useImportStayRate, useStayOffers, useStaysConfig } from "@/hooks/useStays";

/**
 * Alojamento por fornecedor (Duffel Stays).
 * Pesquisa/tarifas/orçamento só respondem quando o acesso estiver aprovado.
 * Reservas nunca são criadas aqui.
 */
export function StaysTab() {
  const config = useStaysConfig();
  const offers = useStayOffers();
  const components = useComponents();
  const importRate = useImportStayRate();
  const [componentId, setComponentId] = useState("");

  const enabled = config.data?.enabled === true;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display font-semibold text-foreground">Alojamento em tempo real</h3>
          <Badge variant={enabled ? "default" : "secondary"}>
            {config.isLoading ? "A verificar…" : enabled ? "Ativo (modo de teste)" : "Por ativar"}
          </Badge>
          <Badge variant="outline">Reservas desativadas</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {config.data?.note ??
            "Pesquisa, tarifas e orçamento de alojamento ficam disponíveis assim que o acesso do fornecedor for aprovado e as credenciais configuradas. Não é necessária nova alteração ao sistema."}
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label htmlFor="stay-component">Componente que recebe a tarifa importada</Label>
          <select
            id="stay-component"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
          >
            <option value="">Escolhe um componente…</option>
            {(components.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {offers.isLoading && <p className="text-sm text-muted-foreground">A carregar ofertas…</p>}
        {!offers.isLoading && (offers.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não existem ofertas de fornecedor. Aparecem aqui depois da primeira pesquisa.
          </p>
        )}

        <div className="space-y-2">
          {(offers.data ?? []).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
              <div className="text-sm">
                <p className="font-medium text-foreground">{o.accommodation_name ?? "Alojamento"}</p>
                <p className="text-muted-foreground">
                  {o.check_in ?? ","} → {o.check_out ?? ","} · {o.nights ?? ","} noites ·{" "}
                  {o.total_amount != null ? `${o.total_amount} ${o.total_currency ?? ""}` : "sem custo"} ·{" "}
                  {STAYS_CANCELLATION_LABEL[o.cancellation_type ?? "unknown"] ?? "Desconhecido"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{o.status}</Badge>
                <Button
                  size="sm"
                  disabled={!componentId || o.kind !== "quote" || o.status === "imported" || importRate.isPending}
                  onClick={async () => {
                    try {
                      await importRate.mutateAsync({ offerId: o.id, componentId });
                      toast({ title: "Tarifa importada com a origem do fornecedor" });
                    } catch (e) {
                      toast({ title: "Não foi possível importar", description: (e as Error).message, variant: "destructive" });
                    }
                  }}
                >
                  Importar tarifa
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
