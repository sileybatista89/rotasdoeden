import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { z } from "zod";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Enums"]["service_category"];

const categoryOptions: { value: Category; label: string }[] = [
  { value: "tour", label: "Tour" },
  { value: "experience", label: "Experiência" },
  { value: "transfer", label: "Transfer" },
  { value: "diving", label: "Mergulho" },
  { value: "hiking", label: "Trilho" },
  { value: "fishing", label: "Pesca" },
  { value: "kayak", label: "Kayak" },
  { value: "surfing", label: "Surf" },
  { value: "birdwatching", label: "Birdwatching" },
  { value: "photography", label: "Fotografia" },
  { value: "gastronomy", label: "Gastronomia" },
  { value: "culture", label: "Cultura" },
  { value: "nightlife", label: "Vida Noturna" },
];

const schema = z.object({
  title: z.string().trim().min(5, "Título tem de ter pelo menos 5 caracteres").max(120),
  description: z.string().trim().min(30, "Descrição tem de ter pelo menos 30 caracteres").max(2000),
  category: z.enum([
    "tour","experience","transfer","diving","hiking","fishing","kayak","surfing",
    "birdwatching","photography","gastronomy","culture","nightlife",
  ]),
  price_per_person: z.number().positive("Preço tem de ser maior que 0").max(10000),
  duration_hours: z.number().positive("Duração tem de ser maior que 0").max(72),
  min_people: z.number().int().min(1).max(50),
  max_people: z.number().int().min(1).max(50),
  meeting_point: z.string().trim().max(300).optional(),
  is_active: z.boolean(),
}).refine((d) => d.max_people >= d.min_people, {
  message: "Máximo de pessoas tem de ser ≥ mínimo",
  path: ["max_people"],
});

export default function ServiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("tour");
  const [pricePerPerson, setPricePerPerson] = useState("50");
  const [durationHours, setDurationHours] = useState("3");
  const [minPeople, setMinPeople] = useState("1");
  const [maxPeople, setMaxPeople] = useState("8");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [includesText, setIncludesText] = useState("");
  const [excludesText, setExcludesText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isEdit || !user) return;
    void (async () => {
      const { data, error } = await supabase.from("services").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        toast({ title: "Erro a carregar", description: error?.message ?? "Serviço não encontrado", variant: "destructive" });
        navigate("/my-services");
        return;
      }
      if (data.guide_id !== user.id) {
        navigate("/my-services");
        return;
      }
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category);
      setPricePerPerson(String(data.price_per_person));
      setDurationHours(String(data.duration_hours));
      setMinPeople(String(data.min_people));
      setMaxPeople(String(data.max_people));
      setMeetingPoint(data.meeting_point ?? "");
      setIncludesText((data.includes ?? []).join("\n"));
      setExcludesText((data.excludes ?? []).join("\n"));
      setIsActive(data.is_active);
      setImages(data.images ?? []);
      setLoading(false);
    })();
  }, [id, isEdit, user, navigate, toast]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length || !user) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: `${file.name} > 5MB`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("service-images").upload(path, file);
      if (error) {
        toast({ title: "Erro upload", description: error.message, variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("service-images").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const parsed = schema.safeParse({
      title, description, category,
      price_per_person: Number(pricePerPerson),
      duration_hours: Number(durationHours),
      min_people: Number(minPeople),
      max_people: Number(maxPeople),
      meeting_point: meetingPoint || undefined,
      is_active: isActive,
    });
    if (!parsed.success) {
      toast({ title: "Validação falhou", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      ...parsed.data,
      meeting_point: parsed.data.meeting_point ?? null,
      guide_id: user.id,
      currency: "EUR",
      images,
      includes: includesText.split("\n").map((s) => s.trim()).filter(Boolean),
      excludes: excludesText.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    const { error } = isEdit
      ? await supabase.from("services").update(payload).eq("id", id!)
      : await supabase.from("services").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro a guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isEdit ? "Serviço atualizado" : "Serviço criado" });
    navigate("/my-services");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/my-services")} className="mb-4">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">
          {isEdit ? "Editar Serviço" : "Novo Serviço"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Ex: Trilho ao Pico de São Tomé" />
            </div>
            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} required rows={5} placeholder="Descreva a experiência em detalhe..." />
            </div>
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Preço e capacidade</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Preço por pessoa (EUR) *</Label>
                <Input id="price" type="number" step="0.01" min="0" value={pricePerPerson} onChange={(e) => setPricePerPerson(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="duration">Duração (horas) *</Label>
                <Input id="duration" type="number" step="0.5" min="0" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="min">Mín. pessoas *</Label>
                <Input id="min" type="number" min="1" value={minPeople} onChange={(e) => setMinPeople(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="max">Máx. pessoas *</Label>
                <Input id="max" type="number" min="1" value={maxPeople} onChange={(e) => setMaxPeople(e.target.value)} required />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Detalhes</h2>
            <div>
              <Label htmlFor="meeting">Ponto de encontro</Label>
              <Input id="meeting" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} maxLength={300} placeholder="Ex: Praça da Independência, São Tomé" />
            </div>
            <div>
              <Label htmlFor="includes">Inclui (uma linha por item)</Label>
              <Textarea id="includes" value={includesText} onChange={(e) => setIncludesText(e.target.value)} rows={3} placeholder="Transporte&#10;Almoço&#10;Equipamento" />
            </div>
            <div>
              <Label htmlFor="excludes">Não inclui (uma linha por item)</Label>
              <Textarea id="excludes" value={excludesText} onChange={(e) => setExcludesText(e.target.value)} rows={3} placeholder="Bebidas&#10;Gorjetas" />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Imagens</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(url)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted transition-colors text-muted-foreground">
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                <span className="text-xs">Adicionar</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Máx. 5MB por imagem. JPG, PNG ou WebP.</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active" className="text-base">Serviço ativo</Label>
                <p className="text-sm text-muted-foreground">Quando ativo, aparece publicamente para os turistas.</p>
              </div>
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/my-services")}>Cancelar</Button>
            <Button type="submit" variant="hero" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? "Guardar alterações" : "Criar serviço"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
