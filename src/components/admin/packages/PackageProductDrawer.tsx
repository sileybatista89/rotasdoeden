import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
  VERSION_STATUS_LABEL,
  formatDuration,
  isDurationWithinProduct,
} from "@/lib/travelProducts";
import {
  useCreateProductVersion,
  usePublishProductVersion,
  useSetTravelProductStatus,
  useTravelProductVersions,
  type TravelProduct,
} from "@/hooks/useTravelProducts";

interface Props {
  product: TravelProduct | null;
  onClose: () => void;
}

export function PackageProductDrawer({ product, onClose }: Props) {
  const versions = useTravelProductVersions(product?.id ?? null);
  const setStatus = useSetTravelProductStatus();
  const createVersion = useCreateProductVersion();
  const publishVersion = usePublishProductVersion();

  const [days, setDays] = useState("");
  const [terms, setTerms] = useState("");
  const [note, setNote] = useState("");

  if (!product) return null;

  const fail = (e: unknown) => toast({ title: "Não foi possível concluir", description: (e as Error).message, variant: "destructive" });

  const changeStatus = async (status: Parameters<typeof setStatus.mutateAsync>[0]["status"]) => {
    if (status === "archived" && !note.trim()) {
      toast({ title: "Indica o motivo do arquivo", variant: "destructive" });
      return;
    }
    try {
      await setStatus.mutateAsync({ productId: product.id, status, note: note.trim() || undefined });
      setNote("");
      toast({ title: `Estado atualizado para ${PRODUCT_STATUS_LABEL[status]}` });
    } catch (e) { fail(e); }
  };

  const addVersion = async () => {
    const value = Number(days);
    if (!isDurationWithinProduct(value, product)) {
      toast({ title: `A duração tem de estar dentro de ${formatDuration(product)}`, variant: "destructive" });
      return;
    }
    try {
      await createVersion.mutateAsync({
        product_id: product.id,
        duration_days: value,
        terms: terms.trim() || null,
      });
      setDays("");
      setTerms("");
      toast({ title: "Nova versão criada em rascunho" });
    } catch (e) { fail(e); }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{product.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{PRODUCT_TYPE_LABEL[product.product_type]}</Badge>
            <Badge variant="outline">{formatDuration(product)}</Badge>
            <Badge>{PRODUCT_STATUS_LABEL[product.status]}</Badge>
          </div>

          {product.description && <p className="text-muted-foreground">{product.description}</p>}

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">Estado do produto</h3>
            <Textarea
              placeholder="Motivo ou nota (obrigatório para arquivar)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={product.status !== "draft"} onClick={() => changeStatus("under_review")}>
                Enviar para revisão
              </Button>
              <Button size="sm" disabled={product.status !== "under_review"} onClick={() => changeStatus("published")}>
                Publicar
              </Button>
              <Button size="sm" variant="outline" disabled={product.status === "archived"} onClick={() => changeStatus("archived")}>
                Arquivar
              </Button>
              <Button size="sm" variant="ghost" disabled={product.status !== "archived"} onClick={() => changeStatus("draft")}>
                Reabrir em rascunho
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Publicar aqui é apenas estado interno, nada aparece no site público nesta fase.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-foreground">Versões</h3>
            {versions.isLoading && <p className="text-muted-foreground">A carregar versões…</p>}
            {versions.data?.length === 0 && <p className="text-muted-foreground">Ainda não existe nenhuma versão.</p>}
            <ul className="space-y-2">
              {(versions.data ?? []).map((v) => (
                <li key={v.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        Versão {v.version_number} · {v.duration_days} dias · {v.nights} noites
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {VERSION_STATUS_LABEL[v.status]}
                        {v.published_at ? ` · publicada a ${new Date(v.published_at).toLocaleDateString("pt-PT")}` : ""}
                        {product.current_version_id === v.id ? " · versão atual" : ""}
                      </p>
                    </div>
                    {v.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await publishVersion.mutateAsync({ versionId: v.id });
                            toast({ title: "Versão publicada e bloqueada para alterações" });
                          } catch (e) { fail(e); }
                        }}
                      >
                        Publicar versão
                      </Button>
                    )}
                  </div>
                  {v.terms && <p className="mt-2 text-xs text-muted-foreground">{v.terms}</p>}
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
              <Label htmlFor="version-days">Nova versão, duração em dias</Label>
              <Input
                id="version-days"
                inputMode="numeric"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder={formatDuration(product)}
              />
              <Textarea
                placeholder="Condições relevantes (opcional)"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={2}
              />
              <Button size="sm" variant="outline" onClick={addVersion} disabled={createVersion.isPending}>
                Criar versão em rascunho
              </Button>
              <p className="text-xs text-muted-foreground">
                Componentes, custos e preços entram numa fase seguinte.
              </p>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
