import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Upload } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VERIFICATION_LABELS, professionalTypeLabel, type ProfessionalType, type VerificationStatus } from "@/lib/professional";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function VerificationRequestPage() {
  const { user } = useAuth();
  const [profType, setProfType] = useState<ProfessionalType | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>("not_verified");
  const [latestRequest, setLatestRequest] = useState<{ status: VerificationStatus; reviewer_notes: string | null } | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [credential, setCredential] = useState<File | null>(null);
  const [training, setTraining] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: req }] = await Promise.all([
        supabase.from("professional_profiles")
          .select("professional_type, verification_status").eq("user_id", user.id).maybeSingle(),
        supabase.from("verification_requests")
          .select("status, reviewer_notes").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (prof) {
        setHasProfile(true);
        setProfType(prof.professional_type);
        setStatus(prof.verification_status);
      }
      if (req) setLatestRequest(req);
      setLoading(false);
    })();
  }, [user]);

  async function upload(file: File, name: string) {
    const path = `${user!.id}/verificacao-${name}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (error) throw error;
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!idDoc) return toast.error("O documento de identificação é obrigatório");
    setBusy(true);
    try {
      const id_document_url = await upload(idDoc, "identificacao");
      const credential_url = credential ? await upload(credential, "credencial") : null;
      const training_certificate_url = training ? await upload(training, "formacao") : null;
      const professional_photo_url = photo ? await upload(photo, "foto") : null;

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        professional_type: profType,
        id_document_url,
        credential_url,
        training_certificate_url,
        professional_photo_url,
        experience_summary: summary.trim().slice(0, 2000) || null,
      });
      if (error) throw error;
      toast.success("Pedido enviado — a equipa vai analisar os documentos.");
      setLatestRequest({ status: "pending", reviewer_notes: null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar pedido");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Pedido de verificação</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Os documentos enviados são confidenciais: só a equipa de verificação os consulta e nunca aparecem no perfil público.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline">{VERIFICATION_LABELS[status]}</Badge>
          <Badge variant="outline">{professionalTypeLabel(profType)}</Badge>
        </div>

        {!hasProfile ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-foreground mb-4">Cria primeiro o teu perfil profissional.</p>
            <Button asChild variant="hero"><Link to="/perfil-profissional">Criar perfil profissional</Link></Button>
          </div>
        ) : status === "verified" ? (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center">
            <ShieldCheck className="mx-auto text-primary mb-2" size={40} />
            <p className="font-medium text-foreground">O teu perfil está verificado e visível publicamente.</p>
          </div>
        ) : latestRequest?.status === "pending" ? (
          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6 text-center">
            <p className="font-medium text-foreground">Pedido em análise. Recebes uma resposta assim que a revisão terminar.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
            {latestRequest?.status === "rejected" && latestRequest.reviewer_notes && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <strong className="block mb-1">Motivo da recusa anterior</strong>
                {latestRequest.reviewer_notes}
              </div>
            )}
            <FileField label="Documento de identificação" file={idDoc} onChange={setIdDoc} required />
            <FileField label="Credencial / licença de guia (se aplicável)" file={credential} onChange={setCredential} />
            <FileField label="Certificado de formação (opcional)" file={training} onChange={setTraining} />
            <FileField label="Foto profissional (opcional)" file={photo} onChange={setPhoto} />
            <div className="space-y-2">
              <Label htmlFor="sum">Resumo da experiência</Label>
              <Textarea id="sum" rows={4} maxLength={2000} value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Onde trabalhas, que experiências ofereces, há quantos anos..." />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin mr-2" size={16} />}
              Submeter pedido de verificação
            </Button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

function FileField({ label, file, onChange, required }: {
  label: string; file: File | null; onChange: (f: File | null) => void; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}{required && " *"}</Label>
      <label className="flex items-center gap-3 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
        <Upload size={18} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1 truncate">
          {file ? file.name : "Clique para escolher ficheiro"}
        </span>
        <input type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}
