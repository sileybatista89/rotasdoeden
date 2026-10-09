import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { validateDurationRange } from "@/lib/travelProducts";
import { useSaveTravelProduct, useTravelProductStats, useTravelProducts } from "@/hooks/useTravelProducts";
import { PackageProductTable } from "./PackageProductTable";
import { PackageProductDrawer } from "./PackageProductDrawer";
import { BaselinePanel } from "./BaselinePanel";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PackagesPanel() {
  const products = useTravelProducts();
  const stats = useTravelProductStats();
  const save = useSaveTravelProduct();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", minimum_days: "", maximum_days: "" });

  const selected = products.data?.find((p) => p.id === openId) ?? null;

  const submit = async () => {
    const min = Number(form.minimum_days);
    const max = form.maximum_days.trim() ? Number(form.maximum_days) : null;
    const problem = validateDurationRange({ minimum_days: min, maximum_days: max });
    if (!form.name.trim() || problem) {
      toast({ title: problem ?? "Indica o nome do produto", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        name: form.name.trim(),
        slug: slugify(form.name),
        description: form.description.trim() || null,
        product_type: max === null ? "custom_package" : "standard_package",
        minimum_days: min,
        maximum_days: max,
      });
      setForm({ name: "", description: "", minimum_days: "", maximum_days: "" });
      setCreating(false);
      toast({ title: "Produto criado em rascunho" });
    } catch (e) {
      toast({ title: "Não foi possível criar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const s = stats.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Produtos", value: s?.total },
          { label: "Rascunho", value: s?.draft },
          { label: "Publicados", value: s?.published },
          { label: "Versões", value: s?.versions },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-display font-bold text-foreground">{c.value ?? "n/d"}</p>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm">Novo produto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="p-name">Nome</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-desc">Descrição</Label>
                <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-min">Dias (mínimo)</Label>
                  <Input id="p-min" inputMode="numeric" value={form.minimum_days} onChange={(e) => setForm({ ...form, minimum_days: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="p-max">Dias (máximo)</Label>
                  <Input id="p-max" inputMode="numeric" placeholder="vazio = variável" value={form.maximum_days} onChange={(e) => setForm({ ...form, maximum_days: e.target.value })} />
                </div>
              </div>
              <Button onClick={submit} disabled={save.isPending}>Criar em rascunho</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <PackageProductTable
        rows={products.data ?? []}
        loading={products.isLoading}
        error={(products.error as Error) ?? null}
        onRetry={() => products.refetch()}
        onOpen={setOpenId}
      />

      <div className="space-y-2">
        <h3 className="font-display text-lg font-medium text-foreground">Preço de referência "desde €X"</h3>
        <BaselinePanel />
      </div>

      <PackageProductDrawer product={selected} onClose={() => setOpenId(null)} />
    </div>
  );
}
