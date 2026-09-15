import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { LINE_PROVENANCE_LABEL, COMMERCIAL_STATE_LABEL } from "@/lib/pricing";

/**
 * Origem do "desde €X" de cada produto: valor, base comercial, componentes
 * usados, proveniência de cada linha e quando precisa de atualização.
 * Este ecrã é só para administradores.
 */
export function BaselinePanel() {
  const qc = useQueryClient();

  const rows = useQuery({
    queryKey: ["admin-price-baselines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_baselines")
        .select("*, travel_products(name, slug)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Histórico: cada recálculo fica guardado, o anterior não se perde. */
  const history = useQuery({
    queryKey: ["admin-price-baseline-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_baseline_versions")
        .select("id, product_id, status, price_per_person, currency, includes_flight, blocked_reason, computed_at")
        .order("computed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recompute = useMutation({
    mutationFn: async (slug: string) => {
      const { data, error } = await supabase.functions.invoke("package-builder", {
        body: { action: "baseline", product_slug: slug },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-price-baselines"] });
      qc.invalidateQueries({ queryKey: ["admin-price-baseline-versions"] });
      toast({ title: "Preço de referência recalculado" });
    },
    onError: (e) => toast({ title: "Não foi possível recalcular", description: (e as Error).message, variant: "destructive" }),
  });

  const money = (v: number | null, c: string | null) =>
    v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: c ?? "EUR" }).format(v);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          O "desde €X" é sempre calculado pelo Pricing Engine a partir da duração mínima do produto e dos componentes
          reais elegíveis. Nunca é um valor fixo escrito no site.
        </p>
      </Card>

      {rows.isLoading && <Card className="p-5 text-sm text-muted-foreground">A carregar…</Card>}
      {rows.error && (
        <Card className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os preços de referência.</p>
          <Button size="sm" variant="outline" onClick={() => rows.refetch()}>Tentar de novo</Button>
        </Card>
      )}
      {!rows.isLoading && (rows.data ?? []).length === 0 && (
        <Card className="p-5 text-sm text-muted-foreground">
          Ainda não existe preço de referência calculado. Abre a página pública do produto ou recalcula aqui.
        </Card>
      )}

      {(rows.data ?? []).map((b: any) => {
        const expired = b.expires_at && new Date(b.expires_at) < new Date();
        return (
          <Card key={b.id} className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{b.travel_products?.name ?? "Produto"}</p>
                <p className="text-2xl font-display font-medium text-foreground">
                  {b.status === "published" ? `Desde ${money(Number(b.price_per_person), b.currency)} / pessoa` : "Sem preço público"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant={b.status === "published" ? "default" : "outline"}>
                  {b.status === "published" ? "Publicado" : "Bloqueado"}
                </Badge>
                {b.commercial_state && (
                  <Badge variant="outline">{COMMERCIAL_STATE_LABEL[b.commercial_state as keyof typeof COMMERCIAL_STATE_LABEL]}</Badge>
                )}
                {expired && <Badge variant="outline">Precisa de atualização</Badge>}
                <Button size="sm" variant="outline" disabled={recompute.isPending}
                  onClick={() => recompute.mutate(b.travel_products?.slug)}>
                  Recalcular
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {b.duration_days} dias · {b.nights} noites · {b.adults} adultos · {b.rooms} quarto(s) ·
              {" "}total {money(b.price_total == null ? null : Number(b.price_total), b.currency)} ·
              {" "}calculado em {new Date(b.computed_at).toLocaleString("pt-PT")}
              {b.expires_at ? ` · revalidar até ${new Date(b.expires_at).toLocaleDateString("pt-PT")}` : ""}
            </p>

            {b.blocked_reason && <p className="text-sm text-destructive">{b.blocked_reason}</p>}

            {Array.isArray(b.breakdown) && b.breakdown.length > 0 && (
              <div className="space-y-1">
                {b.breakdown.map((l: any) => (
                  <div key={l.componentId} className="text-sm flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1">
                    <span className="text-foreground">{l.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {LINE_PROVENANCE_LABEL[l.provenance as keyof typeof LINE_PROVENANCE_LABEL]} · {l.quantity} ×{" "}
                      {money(Number(l.unitPrice), l.currency)} = {money(Number(l.sellPrice), b.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
