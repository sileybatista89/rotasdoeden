import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { professionalTypeLabel, type ProfessionalType } from "@/lib/professional";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Req {
  id: string;
  user_id: string;
  professional_type: ProfessionalType | null;
  id_document_url: string | null;
  credential_url: string | null;
  training_certificate_url: string | null;
  professional_photo_url: string | null;
  other_document_urls: string[];
  experience_summary: string | null;
  created_at: string;
  full_name?: string;
}

const REQUIRED_DOCS = [
  { key: "id_document", label: "Documento de identificação" },
  { key: "tourism_license", label: "Licença / credencial de turismo" },
  { key: "training_certificate", label: "Certificado de formação" },
  { key: "commercial_registration", label: "Registo comercial da empresa" },
] as const;

export function VerificationQueue() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("verification_requests").select("*").eq("status", "pending")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Req[];
    if (rows.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", rows.map((r) => r.user_id));
      const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      rows.forEach((r) => (r.full_name = map.get(r.user_id) ?? undefined));

      const paths = rows.flatMap((r) => [
        r.id_document_url, r.credential_url, r.training_certificate_url, r.professional_photo_url,
        ...r.other_document_urls,
      ].filter(Boolean) as string[]);
      const sm: Record<string, string> = {};
      await Promise.all(paths.map(async (p) => {
        const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 600);
        if (data) sm[p] = data.signedUrl;
      }));
      setSigned(sm);
    }
    setReqs(rows);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleMissing(requestId: string, key: string) {
    setMissing((current) => {
      const selected = current[requestId] ?? [];
      return { ...current, [requestId]: selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key] };
    });
  }

  async function requestDocuments(r: Req) {
    const selected = missing[r.id] ?? [];
    const message = notes[r.id]?.trim();
    if (!selected.length) return toast.error("Seleciona pelo menos um documento em falta");
    if (!message) return toast.error("Escreve uma mensagem para o profissional");
    setBusy(r.id);
    const items = selected.map((key) => ({ document_type: key, label: REQUIRED_DOCS.find((doc) => doc.key === key)?.label ?? key }));
    const { error } = await supabase.rpc("request_verification_documents", {
      _verification_request_id: r.id, _items: items, _message: message,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Pedido de documentos enviado e conversa de suporte aberta");
    load();
  }

  async function review(r: Req, decision: "verified" | "rejected") {
    const note = notes[r.id]?.trim() || null;
    if (decision === "rejected" && !note) return toast.error("Indica o motivo da recusa");

    setBusy(r.id);
    if (decision === "verified") {
      const { error } = await supabase.rpc("approve_professional_verification", { _verification_request_id: r.id, _note: note });
      setBusy(null);
      if (error) return toast.error(error.message);
      toast.success("Perfil verificado");
      load();
      return;
    }

    const { error } = await supabase.from("verification_requests").update({ status: decision, reviewer_notes: note, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { setBusy(null); return toast.error(error.message); }

    const { error: pErr } = await supabase.from("professional_profiles").update({
      verification_status: decision,
      verified_at: decision === "verified" ? new Date().toISOString() : null,
      verification_expires_at: decision === "verified"
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() : null,
      admin_notes: note,
    }).eq("user_id", r.user_id);
    if (pErr) { setBusy(null); return toast.error(pErr.message); }

    await supabase.from("admin_audit_log").insert({
      admin_id: user?.id ?? "",
      action: decision === "verified" ? "verificar_perfil" : "recusar_perfil",
      entity_type: "professional_profiles",
      entity_id: r.id,
      details: { user_id: r.user_id, note },
    });

    setBusy(null);
    toast.success("Pedido recusado");
    load();
  }

  if (reqs.length === 0) {
    return <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">Sem pedidos de verificação pendentes.</div>;
  }

  return (
    <div className="space-y-4">
      {reqs.map((r) => {
        const docs = [
          ["Identificação", r.id_document_url],
          ["Credencial", r.credential_url],
          ["Formação", r.training_certificate_url],
          ["Foto", r.professional_photo_url],
        ].filter(([, p]) => p) as [string, string][];
        return (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">{r.full_name ?? "Utilizador"}</p>
                <p className="text-xs text-muted-foreground">
                  {professionalTypeLabel(r.professional_type)} · {new Date(r.created_at).toLocaleDateString("pt-PT")}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">pendente</Badge>
            </div>

            {r.experience_summary && (
              <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{r.experience_summary}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {docs.map(([label, path]) => (
                <a key={path} href={signed[path]} target="_blank" rel="noreferrer"
                  className="block rounded-lg border border-border overflow-hidden bg-muted aspect-square relative">
                  {signed[path]
                    ? <img src={signed[path]} alt={label} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">A carregar...</div>}
                  <span className="absolute bottom-0 inset-x-0 bg-background/85 text-[11px] text-center py-0.5">{label}</span>
                </a>
              ))}
            </div>

            <Textarea rows={2} placeholder="Notas para o profissional (obrigatório em caso de recusa)"
              value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              className="mb-3" maxLength={1000} />

            <div className="border border-border rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-foreground mb-2">Documentos em falta</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {REQUIRED_DOCS.map((doc) => <label key={doc.key} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={(missing[r.id] ?? []).includes(doc.key)} onCheckedChange={() => toggleMissing(r.id, doc.key)} />{doc.label}
                </label>)}
              </div>
              <Button className="mt-3" size="sm" variant="secondary" disabled={busy === r.id} onClick={() => requestDocuments(r)}>
                Pedir documentos e abrir suporte
              </Button>
            </div>

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r, "rejected")}>Recusar</Button>
              <Button size="sm" variant="hero" disabled={busy === r.id} onClick={() => review(r, "verified")}>Verificar</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
