import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTerritory } from "@/hooks/useTerritory";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function TerritoryManager() {
  const { districts, localitiesOf, reload } = useTerritory();
  const [selected, setSelected] = useState<string | null>(null);
  const [newLocality, setNewLocality] = useState("");
  const [busy, setBusy] = useState(false);

  async function addLocality() {
    const name = newLocality.trim();
    if (!selected || !name) return;
    setBusy(true);
    const { error } = await supabase.from("localities").insert({
      district_id: selected, name, slug: slugify(name),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewLocality("");
    toast.success("Localidade adicionada");
    reload();
  }

  async function removeLocality(id: string) {
    const { error } = await supabase.from("localities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Localidade removida");
    reload();
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Distritos</p>
        {districts.map((d) => (
          <button key={d.id} onClick={() => setSelected(d.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selected === d.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
            }`}>
            {d.name}
          </button>
        ))}
      </div>

      <div className="md:col-span-2 bg-card border border-border rounded-2xl p-5">
        {!selected ? (
          <p className="text-sm text-muted-foreground">Escolhe um distrito para gerir as suas localidades.</p>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Input value={newLocality} maxLength={80} placeholder="Nova localidade"
                onChange={(e) => setNewLocality(e.target.value)} />
              <Button onClick={addLocality} disabled={busy || !newLocality.trim()} variant="hero">
                <Plus size={16} /> Adicionar
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {localitiesOf(selected).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{l.name}</span>
                  <button onClick={() => removeLocality(l.id)} aria-label={`Remover ${l.name}`}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
