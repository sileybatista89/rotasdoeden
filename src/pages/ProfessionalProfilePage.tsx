import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, Upload, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTerritory } from "@/hooks/useTerritory";
import {
  AREAS_OF_ACTIVITY, LANGUAGES, PROFESSIONAL_TYPES, VERIFICATION_LABELS,
  type ProfessionalType, type VerificationStatus,
} from "@/lib/professional";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Form {
  professional_type: ProfessionalType | "";
  district_id: string;
  locality_id: string;
  company_name: string;
  headline: string;
  description: string;
  years_experience: string;
  areas_of_activity: string[];
  languages: string[];
  profile_photo_url: string;
  gallery_urls: string[];
}

const EMPTY: Form = {
  professional_type: "", district_id: "", locality_id: "", company_name: "",
  headline: "", description: "", years_experience: "",
  areas_of_activity: [], languages: [], profile_photo_url: "", gallery_urls: [],
};

export default function ProfessionalProfilePage() {
  const { user } = useAuth();
  const { districts, localitiesOf, loading: loadingTerritory } = useTerritory();
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState<VerificationStatus>("not_verified");
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const localities = useMemo(() => localitiesOf(form.district_id), [form.district_id, localitiesOf]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("professional_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setExists(true);
        setStatus(data.verification_status);
        setAdminNotes(data.admin_notes);
        setForm({
          professional_type: data.professional_type ?? "",
          district_id: data.district_id ?? "",
          locality_id: data.locality_id ?? "",
          company_name: data.company_name ?? "",
          headline: data.headline ?? "",
          description: data.description ?? "",
          years_experience: data.years_experience?.toString() ?? "",
          areas_of_activity: data.areas_of_activity ?? [],
          languages: data.languages ?? [],
          profile_photo_url: data.profile_photo_url ?? "",
          gallery_urls: data.gallery_urls ?? [],
        });
      }
      setLoading(false);
    })();
  }, [user]);

  function toggle(field: "areas_of_activity" | "languages", value: string) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));
  }

  async function uploadPhoto(file: File, kind: "perfil" | "galeria") {
    if (!user) return null;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx. 5 MB)");
      return null;
    }
    const path = `${user.id}/pro-${kind}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) {
      toast.error(error.message);
      return null;
    }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function handleProfilePhoto(file: File) {
    setUploading(true);
    const url = await uploadPhoto(file, "perfil");
    if (url) setForm((f) => ({ ...f, profile_photo_url: url }));
    setUploading(false);
  }

  async function handleGallery(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      const url = await uploadPhoto(file, "galeria");
      if (url) urls.push(url);
    }
    setForm((f) => ({ ...f, gallery_urls: [...f.gallery_urls, ...urls].slice(0, 12) }));
    setUploading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.professional_type) return toast.error("Escolhe o tipo de profissional");
    if (!form.district_id) return toast.error("Escolhe o distrito");
    if (form.description.trim().length > 2000) return toast.error("Descrição demasiado longa");

    setSaving(true);
    const payload = {
      user_id: user.id,
      professional_type: form.professional_type as ProfessionalType,
      district_id: form.district_id || null,
      locality_id: form.locality_id || null,
      company_name: form.company_name.trim() || null,
      headline: form.headline.trim().slice(0, 140) || null,
      description: form.description.trim() || null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      areas_of_activity: form.areas_of_activity,
      languages: form.languages,
      profile_photo_url: form.profile_photo_url || null,
      gallery_urls: form.gallery_urls,
    };

    const { error } = exists
      ? await supabase.from("professional_profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("professional_profiles").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    setExists(true);
    toast.success("Perfil profissional guardado");
  }

  if (loading || loadingTerritory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-8 sm:py-12">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold text-foreground">O meu perfil profissional</h1>
          <Badge variant="outline">{VERIFICATION_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Este é o perfil que os turistas veem. Fica público apenas depois de verificado pela nossa equipa.
        </p>

        {adminNotes && status === "rejected" && (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            <strong className="block mb-1">Notas da equipa de verificação</strong>
            {adminNotes}
          </div>
        )}

        <form onSubmit={save} className="space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <Label>Tipo de profissional *</Label>
              <Select
                value={form.professional_type}
                onValueChange={(v) => setForm((f) => ({ ...f, professional_type: v as ProfessionalType }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {PROFESSIONAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label} — {t.hint}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distrito *</Label>
                <Select
                  value={form.district_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, district_id: v, locality_id: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar distrito" /></SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Localidade</Label>
                <Select
                  value={form.locality_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, locality_id: v }))}
                  disabled={!form.district_id}
                >
                  <SelectTrigger><SelectValue placeholder={form.district_id ? "Seleccionar localidade" : "Escolhe primeiro o distrito"} /></SelectTrigger>
                  <SelectContent>
                    {localities.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.professional_type === "empresa_agencia" || form.professional_type === "operador_turistico") && (
              <div className="space-y-2">
                <Label htmlFor="company">Nome da empresa / agência</Label>
                <Input id="company" maxLength={120} value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="headline">Frase de apresentação</Label>
              <Input id="headline" maxLength={140} placeholder="Ex.: Trilhos no Obô e roças históricas"
                value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" rows={5} maxLength={2000} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years">Anos de experiência</Label>
              <Input id="years" type="number" min={0} max={70} value={form.years_experience}
                onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))} className="max-w-[140px]" />
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <Label className="mb-3 block">Áreas de atuação</Label>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_ACTIVITY.map((a) => (
                  <Chip key={a} label={a} active={form.areas_of_activity.includes(a)}
                    onClick={() => toggle("areas_of_activity", a)} />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-3 block">Idiomas</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Chip key={l} label={l} active={form.languages.includes(l)} onClick={() => toggle("languages", l)} />
                ))}
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <Label>Foto de perfil</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                  {form.profile_photo_url && (
                    <img src={form.profile_photo_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                  )}
                </div>
                <label className="text-sm text-muted-foreground border border-dashed border-border rounded-lg px-4 py-3 cursor-pointer hover:bg-muted/50 inline-flex items-center gap-2">
                  <Upload size={16} /> Escolher imagem
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleProfilePhoto(e.target.files[0])} />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Galeria de fotos</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {form.gallery_urls.map((u) => (
                  <div key={u} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={u} alt="Foto do trabalho" className="w-full h-full object-cover" loading="lazy" />
                    <button type="button" aria-label="Remover foto"
                      onClick={() => setForm((f) => ({ ...f, gallery_urls: f.gallery_urls.filter((g) => g !== u) }))}
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-1">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/50">
                  {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} className="text-muted-foreground" />}
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => e.target.files && handleGallery(e.target.files)} />
                </label>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" variant="hero" disabled={saving || uploading}>
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Save size={16} /> Guardar perfil
            </Button>
            {exists && (
              <Button asChild variant="outline">
                <Link to="/verificacao"><ShieldCheck size={16} /> Pedir verificação</Link>
              </Button>
            )}
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"
      }`}>
      {label}
    </button>
  );
}
