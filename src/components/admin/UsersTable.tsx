import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Row {
  id: string;
  full_name: string;
  kyc_status: string;
  banned: boolean;
  created_at: string;
  role?: string;
}

export function UsersTable() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const { data: profs } = await supabase
      .from("profiles").select("id, full_name, kyc_status, banned, created_at")
      .order("created_at", { ascending: false });
    const ids = (profs ?? []).map((p) => p.id);
    const { data: roles } = await supabase
      .from("user_roles").select("user_id, role").in("user_id", ids);
    const rmap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);
    setRows((profs ?? []).map((p) => ({ ...p, role: rmap.get(p.id) ?? "tourist" })));
  }

  useEffect(() => { load(); }, []);

  async function toggleBan(id: string, banned: boolean) {
    const { error } = await supabase.from("profiles").update({ banned: !banned }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!banned ? "Utilizador banido" : "Utilizador desbanido");
    load();
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead className="hidden md:table-cell">KYC</TableHead>
            <TableHead className="hidden sm:table-cell">Estado</TableHead>
            <TableHead className="text-right">Acções</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs capitalize">{r.role}</Badge></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.kyc_status}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {r.banned
                  ? <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Banido</Badge>
                  : <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Activo</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant={r.banned ? "outline" : "destructive"} onClick={() => toggleBan(r.id, r.banned)}>
                  {r.banned ? "Desbanir" : "Banir"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Sem utilizadores.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
