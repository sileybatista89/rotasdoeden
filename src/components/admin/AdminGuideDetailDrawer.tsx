import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Ban, FileText, Globe2, Calendar, Send, FilePlus2, Loader2, Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GUIDE_STATUSES, DOCUMENT_TYPES, guideStatusClass, guideStatusLabel,
  documentStatusClass, documentStatusLabel,
  missingForPublication, type GuideStatus,
} from "@/lib/guideStatus";

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
  guide_status?: GuideStatus | null;
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

interface DocRequest {
  id: string;
  document_type: string;
  label: string;
  note: string;
  status: string;
  document_url: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface Pro {
  id: string;
  profile_photo_url: string | null;
  district_id: string | null;
  languages: string[] | null;
  headline: string | null;
  description: string | null;
  status: GuideStatus;
  applied_at: string;
  approved_at: string | null;
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
  const [pro, setPro] = useState<Pro | null>(null);
  const [docs, setDocs] = useState<DocRequest[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ bookings: 0, services: 0 });
  const [busy, setBusy] = useState(false);

  // form state
  const [status, setStatus] = useState<GuideStatus>("candidatura_recebida");
  const [statusNote, setStatusNote] = useState("");
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0].value);
  const [docLabel, setDocLabel] = useState("");
  const [docNote, setDocNote] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  const sign = useCallback(async (paths: string[]) => {
    const map: Record<string, string> = {};
    for (const p of paths) {
      const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 600);
      if (data?.signedUrl) map[p] = data.signedUrl;
    }
    return map;
  }, []);

  const load = useCallback(async () => {
    if (!guide) return;
    const [{ data: subs }, { data: proRow }, { data: docRows }, { count: bk }, { count: sv }] = await Promise.all([
      supabase.from("kyc_submissions").select("*").eq("user_id", guide.id).order("submitted_at", { ascending: false }).limit(1),
      supabase.from("professional_profiles")
        .select("id, profile_photo_url, district_id, languages, headline, description, status, applied_at, approved_at")
        .eq("user_id", guide.id).maybeSingle(),
      supabase.from("document_requests").select("*").eq("user_id", guide.id).order("created_at", { ascending: false }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("guide_id", guide.id),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("guide_id", guide.id),
    ]);

    const sub = (subs?.[0] ?? null) as KycSub | null;
    setKyc(sub);
    setPro((proRow as Pro | null) ?? null);
    setDocs((docRows ?? []) as DocRequest[]);
    setStatus(((proRow as Pro | null)?.status ?? "candidatura_recebida") as GuideStatus);
    setStats({ bookings: bk ?? 0, services: sv ?? 0 });

    const paths = [
      sub?.document_front_url, sub?.document_back_url, sub?.selfie_url,
      ...((docRows ?? []).map((d) => (d as DocRequest).document_url)),
    ].filter(Boolean) as string[];
    setSigned(paths.length ? await sign(paths) : {});
  }, [guide, sign]);

  useEffect(() => { void load(); }, [load]);

  if (!guide) return null;

  async function run(fn: () => Promise<{ error: unknown } | void>, okMsg: string) {
    setBusy(true);
    try {
      const res = await fn();
      const err = res && "error" in res ? (res.error as { message?: string } | null) : null;
      if (err) throw new Error(err.message ?? "Erro");
      toast.success(okMsg);
      await load();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  const missing = missingForPublication(pro);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted flex items-center justify-center text-xl font-bold text-primary">
              {(pro?.profile_photo_url || guide.avatar_url)
                ? <img src={(pro?.profile_photo_url || guide.avatar_url) as string} alt={guide.full_name} className="w-full h-full object-cover" />
                : guide.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display text-2xl truncate">{guide.full_name || "Sem nome"}</SheetTitle>
              <SheetDescription className="text-xs mt-1 font-mono truncate">{guide.id}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={guideStatusClass(pro?.status)}>{guideStatusLabel(pro?.status)}</Badge>
            {guide.kyc_status === "verified" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1"><ShieldCheck size={12} /> KYC verificado</Badge>
            )}
            {guide.banned && <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><Ban size={12} /> Banido</Badge>}
          </div>

          {/* Prontidão para publicação */}
          <div className="rounded-xl border border-border p-4">
            <h3 className="font-display font-semibold text-foreground mb-2">Prontidão para publicação</h3>
            {missing.length === 0 ? (
              <p className="text-sm text-primary">Perfil completo. Com o estado “Aprovado” fica visível publicamente.</p>
            ) : (
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                {missing.map((m) => <li key={m}>Em falta: {m}</li>)}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Reservas</p>
              <p className="font-display text-2xl font-bold text-foreground">{stats.bookings}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Serviços</p>
              <p className="font-display text-2xl font-bold text-foreground">{stats.services}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Calendar size={14} /> Registo: {new Date(guide.created_at).toLocaleDateString("pt-PT")}</div>
            {pro?.applied_at && <div className="flex items-center gap-2"><Calendar size={14} /> Candidatura: {new Date(pro.applied_at).toLocaleDateString("pt-PT")}</div>}
            {pro?.approved_at && <div className="flex items-center gap-2"><Check size={14} /> Aprovação: {new Date(pro.approved_at).toLocaleDateString("pt-PT")}</div>}
            {guide.country && <div className="flex items-center gap-2"><Globe2 size={14} /> {guide.country}</div>}
            {pro?.languages?.length ? <div className="flex items-center gap-2"><Globe2 size={14} /> Idiomas: {pro.languages.join(", ")}</div> : null}
          </div>

          {(pro?.headline || pro?.description || guide.bio) && (
            <div>
              <h3 className="font-display font-semibold text-foreground mb-1">Apresentação</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pro?.headline || pro?.description || guide.bio}</p>
            </div>
          )}

          <Separator />

          {/* Estado */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground">Alterar estado</h3>
            <Select value={status} onValueChange={(v) => setStatus(v as GuideStatus)}>
              <SelectTrigger aria-label="Estado do guia"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GUIDE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea rows={2} maxLength={500} placeholder="Nota interna / mensagem ao guia (opcional)"
              value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            <Button disabled={busy} onClick={() => run(
              async () => await supabase.rpc("admin_set_guide_status", { _user_id: guide.id, _status: status, _note: statusNote.trim() || undefined }),
              "Estado atualizado",
            )}>
              {busy && <Loader2 size={14} className="animate-spin mr-2" />} Guardar estado
            </Button>
          </div>

          <Separator />

          {/* Pedido de documento */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><FilePlus2 size={16} /> Solicitar documento</h3>
            <Select value={docType} onValueChange={(v) => { setDocType(v); setDocLabel(DOCUMENT_TYPES.find((d) => d.value === v)?.label ?? ""); }}>
              <SelectTrigger aria-label="Tipo de documento"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-1.5">
              <Label htmlFor="doc-label">Título do pedido</Label>
              <Input id="doc-label" maxLength={120} value={docLabel} onChange={(e) => setDocLabel(e.target.value)}
                placeholder={DOCUMENT_TYPES.find((d) => d.value === docType)?.label} />
            </div>
            <Textarea rows={2} maxLength={500} placeholder="Explica ao guia o que é preciso enviar"
              value={docNote} onChange={(e) => setDocNote(e.target.value)} />
            <Button variant="outline" disabled={busy} onClick={() => {
              if (!docNote.trim()) return toast.error("Escreve a mensagem do pedido");
              void run(async () => {
                const r = await supabase.rpc("admin_request_document", {
                  _user_id: guide.id, _document_type: docType,
                  _label: docLabel.trim() || (DOCUMENT_TYPES.find((d) => d.value === docType)?.label ?? "Documento"),
                  _message: docNote.trim(),
                });
                setDocNote("");
                return r;
              }, "Documento solicitado e guia notificado");
            }}>Enviar pedido</Button>
          </div>

          {/* Histórico de pedidos */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><FileText size={16} /> Documentos pedidos</h3>
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento pedido a este guia.</p>
            ) : docs.map((d) => (
              <div key={d.id} className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-foreground text-sm">{d.label}</p>
                  <Badge variant="outline" className={`text-xs ${documentStatusClass(d.status)}`}>
                    {documentStatusLabel(d.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{d.note}</p>
                {d.rejection_reason && <p className="text-xs text-destructive">Motivo da recusa: {d.rejection_reason}</p>}
                {d.document_url && signed[d.document_url] && (
                  <a href={signed[d.document_url]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Abrir documento</a>
                )}
                {(d.status === "fulfilled" || d.status === "in_review") && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" disabled={busy} onClick={() => run(
                      async () => await supabase.rpc("admin_review_document", { _request_id: d.id, _approve: true }),
                      "Documento aprovado",
                    )}><Check size={14} className="mr-1" /> Aprovar</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                      const reason = window.prompt("Motivo da recusa (obrigatório)")?.trim();
                      if (!reason) return toast.error("Indica o motivo da recusa");
                      void run(async () => await supabase.rpc("admin_review_document", { _request_id: d.id, _approve: false, _reason: reason }), "Documento recusado");
                    }}><X size={14} className="mr-1" /> Recusar</Button>
                    {d.status === "fulfilled" && (
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(
                        async () => await supabase.rpc("admin_set_document_status", { _request_id: d.id, _status: "in_review" }),
                        "Documento marcado como em análise",
                      )}>Em análise</Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Mensagem */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Send size={16} /> Enviar mensagem</h3>
            <Input maxLength={120} placeholder="Assunto" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} aria-label="Assunto da mensagem" />
            <Textarea rows={3} maxLength={2000} placeholder="Mensagem para o guia" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} />
            <Button variant="outline" disabled={busy} onClick={() => {
              if (!msgBody.trim()) return toast.error("Escreve a mensagem");
              void run(async () => {
                const r = await supabase.rpc("admin_message_guide", {
                  _user_id: guide.id,
                  _subject: msgSubject.trim() || "Mensagem da equipa Rotas do Éden",
                  _message: msgBody.trim(),
                });
                setMsgBody(""); setMsgSubject("");
                return r;
              }, "Mensagem enviada");
            }}>Enviar mensagem</Button>
          </div>

          <Separator />

          {/* KYC legado */}
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
                    <a key={p as string} href={signed[p as string]} target="_blank" rel="noopener noreferrer"
                      className="block aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted">
                      {signed[p as string] && <img src={signed[p as string]} alt="documento" className="w-full h-full object-cover" />}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button variant={guide.banned ? "outline" : "destructive"} disabled={busy} onClick={() => run(
            async () => await supabase.from("profiles").update({ banned: !guide.banned }).eq("id", guide.id),
            guide.banned ? "Desbanido" : "Banido",
          )}>{guide.banned ? "Desbanir" : "Banir"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
