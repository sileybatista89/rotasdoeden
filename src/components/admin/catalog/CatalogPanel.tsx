import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { toast } from "@/hooks/use-toast";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  ISLAND_LABEL,
  buildDayPlan,
  isBookable,
  type CatalogCategory,
  type Island,
} from "@/lib/packageBuilder";

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

interface CatalogRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  island: string;
  short_description: string | null;
  typical_duration_hours: number | null;
  service_id: string | null;
  package_component_id: string | null;
  is_active: boolean;
  sort_order: number;
}

interface ConfigRow {
  id: string;
  duration_days: number;
  adults: number;
  children: number;
  rooms: number;
  start_date: string | null;
  selections: { day: number; item_id: string; item_slug: string }[];
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  submetido: "Submetido",
  em_analise: "Em análise",
  cotado: "Cotado",
  arquivado: "Arquivado",
};

export function CatalogPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CatalogRow | null>(null);

  const items = useQuery({
    queryKey: ["admin-catalog-items"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("experience_catalog_items")
        .select("*").order("category").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as CatalogRow[];
    },
  });

  const services = useQuery({
    queryKey: ["admin-catalog-services"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("services")
        .select("id, title").eq("is_active", true).eq("moderation_status", "approved").order("title");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const components = useQuery({
    queryKey: ["admin-catalog-components"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("package_components").select("id, name").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const configs = useQuery({
    queryKey: ["admin-builder-configs"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("package_builder_configs")
        .select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as ConfigRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await anyDb.rpc("admin_save_catalog_item", { _payload: payload });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalog-items"] });
      qc.invalidateQueries({ queryKey: ["builder-catalog"] });
    },
  });

  const setConfigStatus = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const { error } = await anyDb.from("package_builder_configs")
        .update({ status: vars.status }).eq("id", vars.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-builder-configs"] }),
  });

  const submitItem = async (payload: Record<string, unknown>) => {
    try {
      await save.mutateAsync(payload);
      setEditing(null);
      toast({ title: "Catálogo atualizado" });
    } catch (e) {
      toast({ title: "Não foi possível guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const itemNameById = new Map((items.data ?? []).map((i) => [i.id, i.name]));

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Catálogo e viagens montadas"
        description="Locais editoriais de descoberta e configurações de viagem enviadas pelos visitantes. Um local só entra no preço quando estiver ligado a um serviço ou componente real."
      />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <p className="font-medium text-foreground">Catálogo editorial</p>
          <Button size="sm" variant="outline" onClick={() => setEditing({
            id: "", slug: "", name: "", category: "praias", island: "sao_tome",
            short_description: null, typical_duration_hours: null,
            service_id: null, package_component_id: null, is_active: true, sort_order: 0,
          })}>Novo local</Button>
        </div>
        {items.isLoading && <p className="p-4 text-sm text-muted-foreground">A carregar…</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Ilha</th>
                <th className="px-4 py-3 font-medium">Ligação real</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(items.data ?? []).map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABEL[i.category as CatalogCategory] ?? i.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ISLAND_LABEL[i.island as Island] ?? i.island}</td>
                  <td className="px-4 py-3">
                    <Badge variant={isBookable(i) ? "default" : "outline"}>
                      {isBookable(i) ? "Ligado a inventário real" : "Só inspiração"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{i.is_active ? "Ativo" : "Inativo"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>Editar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-medium text-foreground">Viagens montadas pelos visitantes</p>
        {configs.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
        {configs.data?.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há configurações.</p>}
        <ul className="space-y-3">
          {(configs.data ?? []).map((c) => {
            const plan = buildDayPlan(c.duration_days);
            return (
              <li key={c.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {c.contact_name ?? "Sem contacto"} · {c.duration_days} dias · {c.adults} adultos
                      {c.children > 0 ? ` + ${c.children} crianças` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.contact_email ?? "—"} · {c.start_date ?? "sem data"} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{STATUS_LABEL[c.status] ?? c.status}</Badge>
                    {c.status !== "arquivado" && (
                      <Button size="sm" variant="ghost"
                        onClick={() => setConfigStatus.mutate({ id: c.id, status: c.status === "submetido" ? "em_analise" : "arquivado" })}>
                        {c.status === "submetido" ? "Pôr em análise" : "Arquivar"}
                      </Button>
                    )}
                  </div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {plan.filter((d) => d.configurable).map((d) => {
                    const chosen = (c.selections ?? []).filter((s) => s.day === d.day);
                    return (
                      <li key={d.day}>
                        Dia {d.day}: {chosen.length === 0 ? "—" : chosen.map((s) => itemNameById.get(s.item_id) ?? s.item_slug).join(", ")}
                      </li>
                    );
                  })}
                </ul>
                {c.notes && <p className="text-xs text-muted-foreground">Notas: {c.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  A proposta é produzida na secção Cotações, com o motor de preços existente.
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      {editing && (
        <CatalogItemSheet
          row={editing}
          services={services.data ?? []}
          components={components.data ?? []}
          pending={save.isPending}
          onClose={() => setEditing(null)}
          onSave={submitItem}
        />
      )}
    </div>
  );
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const NONE = "__none__";

function CatalogItemSheet({
  row, services, components, pending, onClose, onSave,
}: {
  row: CatalogRow;
  services: { id: string; title: string }[];
  components: { id: string; name: string }[];
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState(row);

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle className="font-display text-2xl">{row.id ? row.name : "Novo local"}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <Label htmlFor="c-name">Nome</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="c-desc">Descrição curta</Label>
            <Textarea id="c-desc" rows={2} value={form.short_description ?? ""}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ilha</Label>
              <Select value={form.island} onValueChange={(v) => setForm({ ...form, island: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ISLAND_LABEL) as Island[]).map((i) => (
                    <SelectItem key={i} value={i}>{ISLAND_LABEL[i]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-hours">Duração típica (horas)</Label>
              <Input id="c-hours" inputMode="decimal" value={form.typical_duration_hours ?? ""}
                onChange={(e) => setForm({ ...form, typical_duration_hours: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="c-order">Ordem</Label>
              <Input id="c-order" inputMode="numeric" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <Label>Experiência real associada</Label>
            <Select value={form.service_id ?? NONE} onValueChange={(v) => setForm({ ...form, service_id: v === NONE ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Sem ligação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem ligação</SelectItem>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Componente de pacote associado</Label>
            <Select value={form.package_component_id ?? NONE}
              onValueChange={(v) => setForm({ ...form, package_component_id: v === NONE ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Sem ligação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem ligação</SelectItem>
                {components.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Sem ligação, o local aparece apenas como inspiração e nunca entra no preço.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant={form.is_active ? "default" : "outline"}
              onClick={() => setForm({ ...form, is_active: !form.is_active })}>
              {form.is_active ? "Ativo" : "Inativo"}
            </Button>
          </div>

          <Button
            disabled={pending || !form.name.trim()}
            onClick={() => onSave({
              id: form.id || undefined,
              slug: form.slug || slugify(form.name),
              name: form.name.trim(),
              category: form.category,
              island: form.island,
              short_description: form.short_description ?? "",
              typical_duration_hours: form.typical_duration_hours ?? "",
              service_id: form.service_id ?? "",
              package_component_id: form.package_component_id ?? "",
              is_active: form.is_active,
              sort_order: form.sort_order,
            })}
          >
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
