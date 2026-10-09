import { useState } from "react";
import { Building2, Hotel, UtensilsCrossed, Car, Compass, Briefcase, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const PARTNER_EMAIL = "parceiros@rotasdoeden.com";

const categories = [
  { value: "hotel", label: "Hotel & Alojamento", Icon: Hotel },
  { value: "restaurante", label: "Restaurante", Icon: UtensilsCrossed },
  { value: "rent-a-car", label: "Rent-a-car", Icon: Car },
  { value: "operador", label: "Operador turístico", Icon: Compass },
  { value: "empresa-local", label: "Empresa local", Icon: Building2 },
  { value: "parceiro-comercial", label: "Parceiro comercial", Icon: Briefcase },
];

const schema = z.object({
  company: z.string().trim().min(2, "Indique o nome da empresa").max(120),
  responsible: z.string().trim().min(2, "Indique o nome do responsável").max(120),
  category: z.string().min(1, "Escolha uma categoria"),
  phone: z.string().trim().min(6, "Telefone inválido").max(40),
  email: z.string().trim().email("Email inválido").max(200),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Descreva a sua atividade").max(1000),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const initialForm: FormState = {
  company: "", responsible: "", category: "", phone: "",
  email: "", website: "", description: "", message: "",
};

export default function SejaParceiroPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);

  const update = (k: keyof FormState, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof FormState;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    const cat = categories.find((c) => c.value === form.category)?.label ?? form.category;
    const subject = `Nova candidatura de parceiro, ${form.company}`;
    const body =
      `Empresa: ${form.company}\n` +
      `Responsável: ${form.responsible}\n` +
      `Categoria: ${cat}\n` +
      `Telefone: ${form.phone}\n` +
      `Email: ${form.email}\n` +
      `Website: ${form.website || "n/d"}\n\n` +
      `Atividade:\n${form.description}\n\n` +
      `Mensagem:\n${form.message || "n/d"}\n`;
    window.location.href = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
    toast({ title: "Candidatura preparada", description: "Abrimos o seu email para enviar a candidatura à equipa Rotas do Éden." });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Tornar-me parceiro | Rotas do Éden"
        description="Candidatura de parceiros Rotas do Éden, hotéis, restaurantes, rent-a-car, operadores turísticos e empresas locais de São Tomé e Príncipe."
        path="/seja-parceiro"
      />
      <Navbar />

      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-eden-green-dark text-primary-foreground">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>
        <div className="container relative py-14 md:py-20 max-w-4xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
            <Sparkles size={12} /> Rede de Parceiros
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4 drop-shadow">
            Faça parte da rede Rotas do Éden
          </h1>
          <p className="text-primary-foreground/90 text-base md:text-lg max-w-2xl leading-relaxed">
            Para hotéis, restaurantes, rent-a-car, operadores turísticos e empresas locais
            de São Tomé e Príncipe que partilham o nosso padrão de qualidade e autenticidade.
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            É um guia turístico? <a href="/guia-parceiro" className="underline font-medium hover:text-secondary">Candidate-se aqui →</a>
          </p>
        </div>
      </header>

      <main className="container py-12 md:py-16 flex-1 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <aside className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xl font-semibold">Categorias de parceiros</h2>
            <ul className="space-y-2">
              {categories.map(({ value, label, Icon }) => (
                <li key={value} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-primary/10 ring-1 ring-primary/15 flex items-center justify-center">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </li>
              ))}
            </ul>
            <div className="bg-accent/50 border border-border rounded-xl p-4 text-sm text-muted-foreground flex gap-3">
              <Mail size={18} className="text-primary shrink-0 mt-0.5" />
              <p>As candidaturas são analisadas pela equipa em <a href={`mailto:${PARTNER_EMAIL}`} className="text-primary font-medium hover:underline">{PARTNER_EMAIL}</a>.</p>
            </div>
          </aside>

          <form onSubmit={onSubmit} className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold">Candidatura de parceiro</h2>
              <p className="text-sm text-muted-foreground mt-1">Os campos marcados com * são obrigatórios.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Nome da empresa *</Label>
                <Input id="company" value={form.company} onChange={(e) => update("company", e.target.value)} maxLength={120} />
                {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
              </div>
              <div>
                <Label htmlFor="responsible">Nome do responsável *</Label>
                <Input id="responsible" value={form.responsible} onChange={(e) => update("responsible", e.target.value)} maxLength={120} />
                {errors.responsible && <p className="text-xs text-destructive mt-1">{errors.responsible}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger id="category"><SelectValue placeholder="Escolha uma categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={200} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website (opcional)</Label>
              <Input id="website" type="url" placeholder="https://..." value={form.website ?? ""} onChange={(e) => update("website", e.target.value)} maxLength={200} />
            </div>

            <div>
              <Label htmlFor="description">Descrição da atividade *</Label>
              <Textarea id="description" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} maxLength={1000} />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
            </div>

            <div>
              <Label htmlFor="message">Mensagem para a equipa</Label>
              <Textarea id="message" rows={3} value={form.message ?? ""} onChange={(e) => update("message", e.target.value)} maxLength={1500} />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full rounded-full">
              Enviar candidatura
            </Button>
            {sent && (
              <p className="text-sm text-primary flex items-center gap-2">
                <CheckCircle2 size={16} /> Candidatura preparada, finalize o envio no seu email.
              </p>
            )}
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
