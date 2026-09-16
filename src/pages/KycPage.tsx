import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function KycPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("pending");
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [licenseNum, setLicenseNum] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setStatus(data.kyc_status));
  }, [user]);

  async function uploadFile(file: File, name: string) {
    const path = `${user!.id}/${name}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (error) throw error;
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!docFront || !selfie) return toast.error("Documento e selfie são obrigatórios");
    setBusy(true);
    try {
      const front = await uploadFile(docFront, "doc-front");
      const back = docBack ? await uploadFile(docBack, "doc-back") : null;
      const self = await uploadFile(selfie, "selfie");

      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: user.id,
        document_type: "id_card",
        document_front_url: front,
        document_back_url: back,
        selfie_url: self,
        license_number: licenseNum || null,
      });
      if (error) throw error;
      await supabase.from("profiles").update({ kyc_status: "submitted" }).eq("id", user.id);
      toast.success("Documentos enviados, aguarde aprovação do admin.");
      setStatus("submitted");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Verificação KYC</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Para garantir a segurança dos turistas, todos os guias têm de verificar a sua identidade.
        </p>
        <Badge variant="outline" className="mb-6">Estado actual: {status}</Badge>

        {status === "verified" ? (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center">
            <ShieldCheck className="mx-auto text-primary mb-2" size={40} />
            <p className="font-medium text-foreground">A sua identidade já foi verificada.</p>
          </div>
        ) : status === "submitted" ? (
          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6 text-center">
            <p className="font-medium text-foreground">Submissão recebida, em revisão pelo admin.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <FileField label="Documento de identificação (frente)" file={docFront} onChange={setDocFront} required />
            <FileField label="Documento de identificação (verso)" file={docBack} onChange={setDocBack} />
            <FileField label="Selfie segurando o documento" file={selfie} onChange={setSelfie} required />
            <div className="space-y-2">
              <Label htmlFor="ln">Número de licença turística (opcional)</Label>
              <Input id="ln" value={licenseNum} onChange={(e) => setLicenseNum(e.target.value)} maxLength={50} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin mr-2" size={16} />}
              Submeter para verificação
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
