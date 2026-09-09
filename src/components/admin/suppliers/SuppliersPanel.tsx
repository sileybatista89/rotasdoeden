import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { SUPPLIER_TYPE_LABEL } from "@/lib/supply";
import { useSaveSupplier, useSuppliers, useSupplyStats } from "@/hooks/useSupply";
import { SupplierTable } from "./SupplierTable";
import { SupplierDrawer } from "./SupplierDrawer";
import { ComponentsTab } from "./ComponentsTab";

export function SuppliersPanel() {
  const suppliers = useSuppliers();
  const stats = useSupplyStats();
  const save = useSaveSupplier();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    legal_name: "", trading_name: "", supplier_type: "accommodation",
    locality: "", contact_email: "", contact_phone: "", website: "", notes: "",
  });

  const selected = suppliers.data?.find((s) => s.id === openId) ?? null;
  const s = stats.data;

  const submit = async () => {
    if (!form.legal_name.trim()) {
      toast({ title: "Indica o nome do fornecedor", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        legal_name: form.legal_name.trim(),
        trading_name: form.trading_name.trim() || null,
        supplier_type: form.supplier_type,
        locality: form.locality.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
      });
      setForm({ legal_name: "", trading_name: "", supplier_type: "accommodation", locality: "", contact_email: "", contact_phone: "", website: "", notes: "" });
      setCreating(false);
      toast({ title: "Fornecedor criado em rascunho" });
    } catch (e) {
      toast({ title: "Não foi possível criar", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Fornecedores", value: s?.suppliers },
          { label: "Alojamentos", value: s?.accommodations },
          { label: "Quartos", value: s?.rooms },
          { label: "Tarifas", value: s?.rates },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-display font-bold text-foreground">{c.value ?? "—"}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="suppliers">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="suppliers">Fornecedores e alojamentos</TabsTrigger>
            <TabsTrigger value="components">Componentes e tarifas</TabsTrigger>
          </TabsList>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild><Button size="sm">Novo fornecedor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="s-legal">Nome legal</Label>
                  <Input id="s-legal" value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="s-trading">Nome comercial</Label>
                  <Input id="s-trading" value={form.trading_name} onChange={(e) => setForm({ ...form, trading_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="s-type">Tipo</Label>
                  <select id="s-type" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.supplier_type} onChange={(e) => setForm({ ...form, supplier_type: e.target.value })}>
                    {Object.entries(SUPPLIER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="s-loc">Localidade</Label>
                    <Input id="s-loc" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="s-site">Website</Label>
                    <Input id="s-site" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="s-mail">Email</Label>
                    <Input id="s-mail" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="s-phone">Telefone</Label>
                    <Input id="s-phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="s-notes">Notas</Label>
                  <Textarea id="s-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button onClick={submit} disabled={save.isPending}>Criar em rascunho</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="suppliers" className="mt-4">
          <SupplierTable
            rows={suppliers.data ?? []}
            loading={suppliers.isLoading}
            error={(suppliers.error as Error) ?? null}
            onRetry={() => suppliers.refetch()}
            onOpen={setOpenId}
          />
          <SupplierDrawer supplier={selected} onClose={() => setOpenId(null)} />
        </TabsContent>

        <TabsContent value="components" className="mt-4">
          <ComponentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
