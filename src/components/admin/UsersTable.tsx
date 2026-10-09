import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "tourist" | "guide" | "admin";

interface Row {
  id: string;
  full_name: string;
  kyc_status: string;
  banned: boolean;
  created_at: string;
  role: Role;
}

export function UsersTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pendingRole, setPendingRole] = useState<{ id: string; name: string; from: Role; to: Role } | null>(null);

  async function load() {
    const { data: profs } = await supabase
      .from("profiles").select("id, full_name, kyc_status, banned, created_at")
      .order("created_at", { ascending: false });
    const ids = (profs ?? []).map((p) => p.id);
    const { data: roles } = await supabase
      .from("user_roles").select("user_id, role").in("user_id", ids);
    const rmap = new Map<string, Role>(roles?.map((r) => [r.user_id, r.role as Role]) ?? []);
    setRows((profs ?? []).map((p) => ({ ...p, role: rmap.get(p.id) ?? "tourist" })));
  }

  useEffect(() => { load(); }, []);

  async function toggleBan(id: string, banned: boolean) {
    const { error } = await supabase.from("profiles").update({ banned: !banned }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!banned ? "Utilizador banido" : "Utilizador desbanido");
    load();
  }

  async function applyRoleChange() {
    if (!pendingRole) return;
    const { id, from, to } = pendingRole;

    if (from === "admin") {
      const adminCount = rows.filter((r) => r.role === "admin").length;
      if (adminCount <= 1) {
        toast.error("Não é possível remover o último administrador.");
        setPendingRole(null);
        return;
      }
    }

    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", id);
    if (delErr) {
      toast.error(delErr.message);
      setPendingRole(null);
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: id, role: to });
    if (insErr) {
      toast.error(insErr.message);
      setPendingRole(null);
      return;
    }
    toast.success(`Papel atualizado para ${to}.`);
    setPendingRole(null);
    load();
  }

  return (
    <>
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
                <TableCell className="font-medium">{r.full_name || "n/d"}</TableCell>
                <TableCell>
                  <Select
                    value={r.role}
                    onValueChange={(v) => {
                      if (v === r.role) return;
                      setPendingRole({ id: r.id, name: r.full_name || "n/d", from: r.role, to: v as Role });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue>
                        <Badge variant="outline" className="text-xs capitalize">{r.role}</Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tourist">Turista</SelectItem>
                      <SelectItem value="guide">Guia</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
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

      <AlertDialog open={!!pendingRole} onOpenChange={(o) => !o && setPendingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar papel deste utilizador?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole && (
                <>
                  <strong>{pendingRole.name}</strong> passará de <strong>{pendingRole.from}</strong> para{" "}
                  <strong>{pendingRole.to}</strong>.
                  {pendingRole.to === "admin" && (
                    <span className="block mt-2 text-destructive">
                      Esta acção dará permissões totais sobre a plataforma. Confirma apenas para pessoas de confiança.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyRoleChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
