import { useCallback, useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { moderationClass, moderationLabel } from "@/lib/guideStatus";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

export function ServiceModeration() {
  const [rows, setRows] = useState<Service[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as Service[];
    setRows(list);
    if (list.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", Array.from(new Set(list.map((s) => s.guide_id))));
      setNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name ?? "Guia"])));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function moderate(id: string, approve: boolean) {
    let note: string | undefined;
    if (!approve) {
      note = window.prompt("O que precisa de ser alterado? (obrigatório)")?.trim() || undefined;
      if (!note) return toast.error("Indica o que deve ser corrigido");
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_moderate_service", { _service_id: id, _approve: approve, _note: note });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Serviço aprovado" : "Alterações pedidas ao guia");
    void load();
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <h3 className="font-display font-semibold text-foreground mb-1">Ainda não há serviços submetidos</h3>
        <p className="text-sm text-muted-foreground">Assim que um guia criar uma experiência, ela aparece aqui para revisão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((s) => (
        <div key={s.id} className="bg-card border border-border rounded-2xl p-5 flex gap-4 flex-wrap sm:flex-nowrap">
          <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden shrink-0">
            {s.images?.[0] && <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-foreground">{s.title}</h3>
              <Badge variant="outline" className={moderationClass(s.moderation_status)}>{moderationLabel(s.moderation_status)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Guia: {names[s.guide_id] ?? "—"}</p>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{s.description}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {Number(s.price_per_person).toFixed(2)} {s.currency} / pessoa · {s.duration_hours}h · {s.min_people}-{s.max_people} pessoas
            </p>
            {s.moderation_notes && <p className="text-xs text-destructive mt-1">Nota: {s.moderation_notes}</p>}
          </div>
          <div className="flex gap-2 items-start">
            {s.moderation_status !== "approved" && (
              <Button size="sm" disabled={busy} onClick={() => moderate(s.id, true)}><Check size={14} className="mr-1" /> Aprovar</Button>
            )}
            {s.moderation_status !== "rejected" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => moderate(s.id, false)}><X size={14} className="mr-1" /> Pedir alterações</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
