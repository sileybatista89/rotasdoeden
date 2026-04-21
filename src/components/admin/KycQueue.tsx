import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Sub {
  id: string;
  user_id: string;
  document_front_url: string;
  document_back_url: string | null;
  selfie_url: string;
  license_number: string | null;
  status: string;
  submitted_at: string;
  full_name?: string;
}

export function KycQueue() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });
    const rows = (data ?? []) as Sub[];
    if (rows.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name")
        .in("id", rows.map((r) => r.user_id));
      const map = new Map(profs?.map((p) => [p.id, p.full_name]) ?? []);
      rows.forEach((r) => (r.full_name = map.get(r.user_id)));

      // sign URLs
      const paths = rows.flatMap((r) => [r.document_front_url, r.selfie_url, r.document_back_url].filter(Boolean) as string[]);
      const sm: Record<string, string> = {};
      await Promise.all(paths.map(async (p) => {
        const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 600);
        if (data) sm[p] = data.signedUrl;
      }));
      setSigned(sm);
    }
    setSubs(rows);
  }

  useEffect(() => { load(); }, []);

  async function review(sub: Sub, status: "verified" | "rejected", notes?: string) {
    const { error } = await supabase.from("kyc_submissions").update({
      status, reviewer_notes: notes ?? null, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ kyc_status: status }).eq("id", sub.user_id);
    toast.success(status === "verified" ? "Guia verificado" : "KYC rejeitado");
    load();
  }

  if (subs.length === 0) {
    return <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">Sem submissões pendentes.</div>;
  }

  return (
    <div className="space-y-4">
      {subs.map((s) => (
        <div key={s.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-foreground">{s.full_name ?? "Utilizador"}</p>
              <p className="text-xs text-muted-foreground">Submetido {new Date(s.submitted_at).toLocaleDateString("pt-PT")}</p>
            </div>
            <Badge variant="outline" className="text-xs">{s.status}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {[s.document_front_url, s.document_back_url, s.selfie_url].filter(Boolean).map((p) => (
              <a key={p} href={signed[p as string]} target="_blank" rel="noreferrer"
                className="block aspect-square bg-muted rounded-lg overflow-hidden border border-border">
                {signed[p as string]
                  ? <img src={signed[p as string]} alt="documento" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">A carregar...</div>}
              </a>
            ))}
          </div>
          {s.license_number && <p className="text-xs text-muted-foreground mb-3">Licença: {s.license_number}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => review(s, "rejected", "Documentos não aceites")}>Rejeitar</Button>
            <Button size="sm" variant="hero" onClick={() => review(s, "verified")}>Aprovar</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
