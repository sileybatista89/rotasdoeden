import { useEffect, useState } from "react";
import { ShieldCheck, Ban, CheckCircle2, FileText, Mail, Globe2, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminGuide {
  id: string;
  full_name: string;
  avatar_url: string | null;
  kyc_status: string;
  banned: boolean;
  created_at: string;
  country: string | null;
  bio: string | null;
  phone: string | null;
}

interface KycSub {
  id: string;
  document_type: string;
  document_front_url: string;
  document_back_url: string | null;
  selfie_url: string;
  license_number: string | null;
  status: string;
  submitted_at: string;
  reviewer_notes: string | null;
}

export function AdminGuideDetailDrawer({
  guide, open, onClose, onChanged,
}: {
  guide: AdminGuide | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [kyc, setKyc] = useState<KycSub | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ bookings: 0, conversations: 0 });

  useEffect(() => {
    if (!guide) return;
    (async () => {
      const { data: subs } = await supabase
        .from("kyc_submissions").select("*")
        .eq("user_id", guide.id)
        .order("submitted_at", { ascending: false }).limit(1);
      const sub = (subs?.[0] ?? null) as KycSub | null;
      setKyc(sub);

      if (sub) {
        const paths = [sub.document_front_url, sub.document_back_url, sub.selfie_url].filter(Boolean) as string[];
        const map: Record<string, string> = {};
        for (const p of paths) {
          const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 600);
          if (data?.signedUrl) map[p] = data.signedUrl;
        }
        setSigned(map);
      } else {
        setSigned({});
      }

      const [{ count: bk }, { count: cv }] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("guide_id", guide.id),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("guide_id", guide.id),
      ]);
      setStats({ bookings: bk ?? 0, conversations: cv ?? 0 });
    })();
  }, [guide]);

  if (!guide) return null;

  async function approve() {
    const { error } = await supabase.from("profiles").update({ kyc_status: "verified" }).eq("id", guide!.id);
    if (error) return toast.error(error.message);
    if (kyc) await supabase.from("kyc_submissions").update({ status: "verified", reviewed_at: new Date().toISOString() }).eq("id", kyc.id);
    toast.success("Guia aprovado"); onChanged(); onClose();
  }
  async function reject() {
    const { error } = await supabase.from("profiles").update({ kyc_status: "rejected" }).eq("id", guide!.id);
    if (error) return toast.error(error.message);
    if (kyc) await supabase.from("kyc_submissions").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", kyc.id);
    toast.success("Guia rejeitado"); onChanged(); onClose();
  }
  async function toggleBan() {
    const { error } = await supabase.from("profiles").update({ banned: !guide!.banned }).eq("id", guide!.id);
    if (error) return toast.error(error.message);
    toast.success(!guide!.banned ? "Banido" : "Desbanido"); onChanged(); onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xl font-bold text-primary">
              {guide.avatar_url ? <img src={guide.avatar_url} alt={guide.full_name} className="w-full h-full object-cover" /> : guide.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display text-2xl truncate">{guide.full_name || "Sem nome"}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-xs mt-1">
                <span className="font-mono">{guide.id}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            {guide.kyc_status === "verified"
              ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1"><ShieldCheck size={12} /> KYC verificado</Badge>
              : <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary/40">KYC: {guide.kyc_status}</Badge>}
            {guide.banned && <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><Ban size={12} /> Banido</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4">
              <p className="text-xs text-muted-foreground">Reservas</p>
              <p className="font-display text-2xl font-bold text-foreground">{stats.bookings}</p>
            </div>
            <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/10 to-transparent p-4">
              <p className="text-xs text-muted-foreground">Conversas</p>
              <p className="font-display text-2xl font-bold text-foreground">{stats.conversations}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar size={14} /> Registo: {new Date(guide.created_at).toLocaleDateString("pt-PT")}</div>
            {guide.country && <div className="flex items-center gap-2 text-muted-foreground"><Globe2 size={14} /> {guide.country}</div>}
            {/* telefone removido da UI por política do site */}
          </div>

          {guide.bio && (
            <div>
              <h3 className="font-display font-semibold text-foreground mb-1">Bio</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guide.bio}</p>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2"><FileText size={16} /> Submissão KYC</h3>
            {!kyc ? (
              <p className="text-sm text-muted-foreground">Este guia ainda não submeteu KYC.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {kyc.document_type.toUpperCase()} · submetido a {new Date(kyc.submitted_at).toLocaleDateString("pt-PT")}
                </p>
                {kyc.license_number && <p className="text-sm">Licença nº <span className="font-mono">{kyc.license_number}</span></p>}
                <div className="grid grid-cols-2 gap-2">
                  {[kyc.document_front_url, kyc.document_back_url, kyc.selfie_url].filter(Boolean).map((p) => (
                    <a key={p as string} href={signed[p as string]} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted">
                      {signed[p as string] && <img src={signed[p as string]} alt="documento" className="w-full h-full object-cover" />}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {guide.kyc_status !== "verified" && (
              <Button onClick={approve} className="gap-1"><CheckCircle2 size={14} /> Aprovar</Button>
            )}
            {guide.kyc_status !== "rejected" && (
              <Button variant="outline" onClick={reject}>Rejeitar</Button>
            )}
            <Button variant={guide.banned ? "outline" : "destructive"} onClick={toggleBan}>
              {guide.banned ? "Desbanir" : "Banir"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
