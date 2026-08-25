import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Loader2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { professionalTypeLabel, type ProfessionalType } from "@/lib/professional";

interface Pro {
  user_id: string;
  professional_type: ProfessionalType | null;
  headline: string | null;
  description: string | null;
  company_name: string | null;
  areas_of_activity: string[];
  languages: string[];
  years_experience: number | null;
  profile_photo_url: string | null;
  gallery_urls: string[];
  district: { name: string } | null;
  locality: { name: string } | null;
}

export default function GuideProfilePage() {
  const { id } = useParams();
  const [pro, setPro] = useState<Pro | null>(null);
  const [name, setName] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select("user_id, professional_type, headline, description, company_name, areas_of_activity, languages, years_experience, profile_photo_url, gallery_urls, district:districts(name), locality:localities(name)")
        .eq("user_id", id)
        .eq("verification_status", "verified")
        .eq("suspended", false)
        .maybeSingle();
      if (data) {
        setPro(data as unknown as Pro);
        const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", data.user_id).maybeSingle();
        setName(prof?.full_name ?? "Profissional");
        setAvatar(prof?.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (!pro) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="container max-w-xl text-center">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full mb-5">
              <Sparkles size={12} /> Em adesão
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perfil ainda não disponível
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Este perfil ainda não está verificado ou já não se encontra activo na plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="hero">
                <Link to="/guides"><ArrowLeft size={16} /> Ver página de guias</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/guia-parceiro">Tornar-me guia parceiro</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const title = pro.company_name || name;
  const location = [pro.locality?.name, pro.district?.name].filter(Boolean).join(" · ") || "São Tomé e Príncipe";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${title} — profissional verificado | Rotas do Éden`}
        description={pro.headline ?? `Perfil verificado de ${title} em ${location}, São Tomé e Príncipe.`}
        path={`/guides/${pro.user_id}`}
      />
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-muted/20 py-10">
          <div className="container flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
              {(pro.profile_photo_url || avatar) ? (
                <img src={(pro.profile_photo_url || avatar) as string} alt={title} className="w-full h-full object-cover" width={224} height={224} />
              ) : (
                <span className="font-display text-3xl text-muted-foreground">{(title ?? "?").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
                <ShieldCheck size={13} /> Perfil verificado
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground mt-1">{professionalTypeLabel(pro.professional_type)}</p>
              {pro.headline && <p className="text-lg text-foreground mt-3 max-w-2xl">{pro.headline}</p>}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {location}</span>
                {pro.languages.length > 0 && (
                  <span className="inline-flex items-center gap-1.5"><Globe size={14} /> {pro.languages.join(" · ")}</span>
                )}
                {pro.years_experience != null && <span>{pro.years_experience} anos de experiência</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="container py-10 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            {pro.description && (
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-3">Sobre</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{pro.description}</p>
              </div>
            )}
            {pro.gallery_urls.length > 0 && (
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-3">Galeria</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pro.gallery_urls.map((u) => (
                    <img key={u} src={u} alt={`Trabalho de ${title}`} loading="lazy"
                      className="aspect-square w-full object-cover rounded-xl border border-border" />
                  ))}
                </div>
              </div>
            )}
          </div>
          <aside className="space-y-4">
            {pro.areas_of_activity.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">Áreas de atuação</h3>
                <div className="flex flex-wrap gap-2">
                  {pro.areas_of_activity.map((a) => (
                    <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{a}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-semibold text-foreground mb-2">Reservar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                As experiências deste profissional podem ser reservadas directamente na plataforma.
              </p>
              <Button asChild variant="hero" className="w-full"><Link to="/experiences">Ver experiências</Link></Button>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
