import { useEffect, useState } from "react";
import { Eye, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminGuideDetailDrawer, type AdminGuide } from "./AdminGuideDetailDrawer";
import { guideStatusClass, guideStatusLabel, type GuideStatus } from "@/lib/guideStatus";

export function AdminGuideTable() {
  const [rows, setRows] = useState<AdminGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminGuide | null>(null);

  async function load() {
    setLoading(true);
    const { data: roleRows } = await supabase
      .from("user_roles").select("user_id").eq("role", "guide");
    const guideIds = (roleRows ?? []).map((r) => r.user_id);
    if (guideIds.length === 0) {
      setRows([]); setLoading(false); return;
    }
    const [{ data: profs }, { data: pros }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, kyc_status, banned, created_at, country, bio, phone")
        .in("id", guideIds)
        .order("created_at", { ascending: false }),
      supabase.from("professional_profiles").select("user_id, status").in("user_id", guideIds),
    ]);
    const statusByUser = Object.fromEntries((pros ?? []).map((p) => [p.user_id, p.status as GuideStatus]));
    setRows(((profs ?? []) as AdminGuide[]).map((p) => ({ ...p, guide_status: statusByUser[p.id] ?? null })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approveKyc(g: AdminGuide) {
    const { error: e1 } = await supabase
      .from("profiles").update({ kyc_status: "verified" }).eq("id", g.id);
    if (e1) return toast.error(e1.message);
    await supabase
      .from("kyc_submissions")
      .update({ status: "verified", reviewed_at: new Date().toISOString() })
      .eq("user_id", g.id);
    toast.success(`${g.full_name} aprovado(a)`);
    load();
  }

  async function toggleBan(g: AdminGuide) {
    const { error } = await supabase.from("profiles").update({ banned: !g.banned }).eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success(!g.banned ? "Guia banido" : "Guia desbanido");
    load();
  }


  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Guia</TableHead>
              <TableHead className="hidden sm:table-cell">País</TableHead>
              <TableHead>Estado do guia</TableHead>
              <TableHead className="hidden lg:table-cell">KYC</TableHead>
              <TableHead className="hidden md:table-cell">Conta</TableHead>
              <TableHead className="text-right">Acções</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">A carregar…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Sem guias registados ainda.</TableCell></TableRow>
            )}
            {rows.map((g) => (
              <TableRow key={g.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-primary">
                      {g.avatar_url ? (
                        <img src={g.avatar_url} alt={g.full_name} className="w-full h-full object-cover" />
                      ) : (
                        g.full_name?.charAt(0)?.toUpperCase() ?? "?"
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{g.full_name || ","}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[12rem]">{g.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{g.country ?? ","}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${guideStatusClass(g.guide_status)}`}>
                    {guideStatusLabel(g.guide_status)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {g.kyc_status === "verified" && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs gap-1"><ShieldCheck size={11} /> Verificado</Badge>}
                  {g.kyc_status === "submitted" && <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary/40 text-xs">A rever</Badge>}
                  {g.kyc_status === "pending" && <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">Pendente</Badge>}
                  {g.kyc_status === "rejected" && <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Rejeitado</Badge>}
                </TableCell>
                <TableCell className="hidden md:table-cell">

                  {g.banned
                    ? <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs gap-1"><Ban size={11} /> Banido</Badge>
                    : <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Activo</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(g)}>
                      <Eye size={14} className="mr-1" /> Ver
                    </Button>
                    {g.kyc_status !== "verified" && (
                      <Button size="sm" variant="outline" onClick={() => approveKyc(g)}>
                        <CheckCircle2 size={14} className="mr-1" /> Aprovar
                      </Button>
                    )}
                    <Button size="sm" variant={g.banned ? "outline" : "destructive"} onClick={() => toggleBan(g)}>
                      {g.banned ? "Desbanir" : "Banir"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminGuideDetailDrawer
        guide={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    </>
  );
}
