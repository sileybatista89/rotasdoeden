import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { POLICY_STATUS_LABEL } from "@/lib/pricing";
import {
  usePolicyVersions, usePricingPolicies, usePricingStats,
  useSavePolicyVersion, useSavePricingPolicy,
} from "@/hooks/usePricing";
import { PolicyVersionEditor } from "./PolicyVersionEditor";
import { PricingSimulation } from "./PricingSimulation";

export function PricingPanel() {
  const policies = usePricingPolicies();
  const stats = usePricingStats();
  const savePolicy = useSavePricingPolicy();
  const saveVersion = useSavePolicyVersion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", currency: "EUR" });

  const activeId = selectedId ?? policies.data?.[0]?.id ?? null;
  const versions = usePolicyVersions(activeId);
  const s = stats.data;

  const createPolicy = async () => {
    if (!form.name.trim()) {
      toast({ title: "Indica o nome da política", variant: "destructive" });
      return;
    }
    try {
      await savePolicy.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        base_currency: form.currency.trim().toUpperCase() || "EUR",
      });
      setForm({ name: "", description: "", currency: "EUR" });
      setCreating(false);
      toast({ title: "Política criada em rascunho" });
    } catch (e) {
      toast({ title: "Não foi possível criar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const newVersion = async () => {
    if (!activeId) return;
    try {
      await saveVersion.mutateAsync({ policy_id: activeId, change_reason: "Nova versão" });
      toast({ title: "Nova versão criada em rascunho" });
    } catch (e) {
      toast({ title: "Não foi possível criar versão", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Políticas", value: s?.policies },
          { label: "Rascunhos", value: s?.draft_versions },
          { label: "Em revisão", value: s?.review_versions },
          { label: "Ativas", value: s?.active_versions },
          { label: "Cálculos", value: s?.calculations },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-display font-bold text-foreground">{c.value ?? ","}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="politicas">
        <TabsList>
          <TabsTrigger value="politicas">Políticas</TabsTrigger>
          <TabsTrigger value="simulacao">Simulação</TabsTrigger>
        </TabsList>

        <TabsContent value="politicas" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild><Button size="sm">Nova política</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova política de preços</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="pol-name">Nome</Label>
                    <Input id="pol-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="pol-desc">Descrição</Label>
                    <Textarea id="pol-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="pol-cur">Moeda base</Label>
                    <Input id="pol-cur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                  </div>
                  <Button onClick={createPolicy} disabled={savePolicy.isPending}>Criar em rascunho</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {policies.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {!policies.isLoading && (policies.data ?? []).length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Ainda não existe nenhuma política de preços. Cria a primeira em rascunho, nenhuma margem foi assumida.
            </Card>
          )}

          <div className="grid gap-2">
            {(policies.data ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`text-left border rounded-lg p-3 transition-colors ${p.id === activeId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>{POLICY_STATUS_LABEL[p.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.base_currency} · {p.description ?? "Sem descrição"}</p>
              </button>
            ))}
          </div>

          {activeId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Versões</p>
                <Button size="sm" variant="outline" onClick={newVersion} disabled={saveVersion.isPending}>
                  Nova versão
                </Button>
              </div>
              {(versions.data ?? []).map((v) => <PolicyVersionEditor key={v.id} version={v} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="simulacao">
          <PricingSimulation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
