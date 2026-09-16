import { useState } from "react";
import { AlertTriangle, Plane, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FLIGHT_OFFER_STATUS_LABEL, CABIN_CLASSES, type CabinClass } from "@/lib/flights";
import {
  useFlightConfig, useFlightOffers, useFlightSearch, useFlightSearches, useFlightStats, useRefreshFlightOffer,
} from "@/hooks/useFlights";

export function FlightsPanel() {
  const config = useFlightConfig();
  const stats = useFlightStats();
  const searches = useFlightSearches();
  const search = useFlightSearch();
  const refresh = useRefreshFlightOffer();
  const [selectedSearch, setSelectedSearch] = useState<string | null>(null);
  const offers = useFlightOffers(selectedSearch);
  const [form, setForm] = useState({
    origin: "", destination: "", departure_date: "", return_date: "",
    adults: "1", children: "0", infants: "0", cabin: "economy" as CabinClass, max_connections: "",
  });

  const configured = config.data?.configured === true;
  const s = stats.data ?? {};

  const run = async () => {
    try {
      const res = await search.mutateAsync({
        origin: form.origin.trim().toUpperCase(),
        destination: form.destination.trim().toUpperCase(),
        departure_date: form.departure_date,
        return_date: form.return_date || null,
        adults: Number(form.adults) || 0,
        children: Number(form.children) || 0,
        infants: Number(form.infants) || 0,
        cabin: form.cabin,
        max_connections: form.max_connections === "" ? null : Number(form.max_connections),
      });
      setSelectedSearch(res.search_id);
      toast({ title: `${res.count} ofertas recebidas${res.cached ? " (cache)" : ""}` });
    } catch (e) {
      toast({ title: "Pesquisa não concluída", description: (e as Error).message, variant: "destructive" });
    }
  };

  const doRefresh = async (offerId: string) => {
    try {
      const res = await refresh.mutateAsync(offerId);
      toast({ title: `Reconsulta: ${res.status}`, description: res.difference !== null ? `Diferença ${res.difference}` : undefined });
    } catch (e) {
      toast({ title: "Reconsulta falhou", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <span className="font-medium">Fornecedor: Duffel</span>
          <Badge variant="secondary">Modo de teste</Badge>
          {config.isLoading ? (
            <Badge variant="outline">a verificar…</Badge>
          ) : configured ? (
            <Badge className="bg-primary/15 text-primary">Configurado</Badge>
          ) : (
            <Badge variant="destructive">Duffel Test não configurado.</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Esta área serve apenas para pesquisar ofertas reais no ambiente de teste. Não cria reservas,
          não emite bilhetes e não cobra ninguém. O valor devolvido é custo de fornecedor aéreo: a margem,
          a proteção e o arredondamento continuam a ser aplicados na área de Preços.
        </p>
        {!configured && !config.isLoading && (
          <p className="text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Sem credenciais de teste guardadas, nenhuma pesquisa é feita e nenhum resultado é inventado.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ["Pesquisas", s.searches], ["Ofertas", s.offers],
          ["Ativas", s.offers_active], ["Expiradas", s.offers_expired],
          ["Com hold", s.offers_hold_capable], ["Falhas", s.searches_failed],
        ] as const).map(([label, value]) => (
          <Card key={label} className="p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{Number(value ?? 0)}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Origem (IATA)</Label><Input value={form.origin} maxLength={3} onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })} placeholder="LIS" /></div>
          <div><Label>Destino (IATA)</Label><Input value={form.destination} maxLength={3} onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })} placeholder="TMS" /></div>
          <div><Label>Ida</Label><Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} /></div>
          <div><Label>Volta (opcional)</Label><Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></div>
          <div><Label>Adultos</Label><Input type="number" min={1} max={9} value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} /></div>
          <div><Label>Crianças</Label><Input type="number" min={0} max={8} value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} /></div>
          <div><Label>Bebés</Label><Input type="number" min={0} max={8} value={form.infants} onChange={(e) => setForm({ ...form, infants: e.target.value })} /></div>
          <div>
            <Label>Cabina</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.cabin}
              onChange={(e) => setForm({ ...form, cabin: e.target.value as CabinClass })}
            >
              {CABIN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Máx. escalas</Label><Input type="number" min={0} max={2} value={form.max_connections} onChange={(e) => setForm({ ...form, max_connections: e.target.value })} /></div>
        </div>
        <Button onClick={run} disabled={!configured || search.isPending}>
          {search.isPending ? "A pesquisar…" : "Pesquisar em modo de teste"}
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Últimas pesquisas</h3>
        <div className="space-y-2">
          {(searches.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Ainda não existem pesquisas.</p>}
          {(searches.data ?? []).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedSearch(r.id)}
              className={`w-full text-left rounded-lg border p-3 text-sm ${selectedSearch === r.id ? "border-primary" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.origin} → {r.destination}</span>
                <span className="text-muted-foreground">{r.departure_date}{r.return_date ? ` · ${r.return_date}` : ""}</span>
                <Badge variant={r.status === "ok" ? "secondary" : "destructive"}>
                  {r.status === "ok" ? `${r.offers_count} ofertas` : r.error_code}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleString("pt-PT")} · {r.duration_ms ?? ","} ms
                </span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {selectedSearch && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Ofertas</h3>
          <div className="space-y-2">
            {(offers.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem ofertas guardadas para esta pesquisa.</p>}
            {(offers.data ?? []).map((o) => (
              <div key={o.id} className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.owner_name ?? o.owner_carrier ?? ","}</span>
                  <span>{Number(o.total_amount).toFixed(2)} {o.total_currency}</span>
                  <Badge variant="outline">custo de fornecedor</Badge>
                  <Badge variant={o.hold_capable ? "secondary" : "outline"}>
                    {o.hold_capable ? "Permite hold" : "Pagamento imediato"}
                  </Badge>
                  <Badge variant={o.status === "active" ? "secondary" : "destructive"}>
                    {FLIGHT_OFFER_STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => doRefresh(o.provider_offer_id)} disabled={refresh.isPending}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reconsultar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Validade: {o.expires_at ? new Date(o.expires_at).toLocaleString("pt-PT") : ","}
                  {o.refreshed_at ? ` · reconsultada ${new Date(o.refreshed_at).toLocaleString("pt-PT")}` : ""}
                </p>
                {o.last_reprice && (
                  <p className="text-xs text-muted-foreground">
                    Última reconsulta: {o.last_reprice.status}
                    {o.last_reprice.difference !== null ? ` (${o.last_reprice.difference})` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
