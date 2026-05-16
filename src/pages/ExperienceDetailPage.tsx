import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, Users, MapPin, Check, X, ArrowLeft, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;
type ProfilePub = Tables<"profiles_public">;

const categoryLabels: Record<string, string> = {
  tour: "Tour", experience: "Experiência", transfer: "Transfer", diving: "Mergulho",
  hiking: "Caminhada", fishing: "Pesca", kayak: "Kayak", surfing: "Surf",
  birdwatching: "Birdwatching", photography: "Fotografia", gastronomy: "Gastronomia",
  culture: "Cultura", nightlife: "Vida Nocturna",
};

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [guide, setGuide] = useState<ProfilePub | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      setService(svc);
      if (svc) {
        const { data: prof } = await supabase
          .from("profiles_public")
          .select("*")
          .eq("id", svc.guide_id)
          .maybeSingle();
        setGuide(prof);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-10 flex-1">
          <Skeleton className="h-96 w-full rounded-2xl mb-6" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20 text-center">
          <div>
            <h1 className="font-display text-3xl font-bold mb-3">Experiência não encontrada</h1>
            <p className="text-muted-foreground mb-6">Pode ter sido removida ou desactivada.</p>
            <Button asChild><Link to="/experiences"><ArrowLeft size={16} /> Ver outras experiências</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const images = service.images?.length ? service.images : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/experiences"><ArrowLeft size={14} /> Voltar às experiências</Link>
          </Button>

          {/* Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
            <div className="md:col-span-3 aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={service.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-1 gap-3">
                {images.slice(0, 4).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square rounded-xl overflow-hidden bg-muted border-2 transition-colors ${
                      i === activeImg ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2">
              <span className="inline-block text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full mb-3">
                {categoryLabels[service.category] ?? service.category}
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">{service.title}</h1>

              <div className="flex flex-wrap gap-5 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
                <span className="flex items-center gap-1.5"><Clock size={16} /> {service.duration_hours}h</span>
                <span className="flex items-center gap-1.5"><Users size={16} /> {service.min_people}-{service.max_people} pessoas</span>
                {service.meeting_point && (
                  <span className="flex items-center gap-1.5"><MapPin size={16} /> {service.meeting_point}</span>
                )}
              </div>

              <h2 className="font-display text-xl font-semibold mb-3">Sobre a experiência</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line mb-8">{service.description}</p>

              {(service.includes?.length || service.excludes?.length) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  {service.includes?.length ? (
                    <div>
                      <h3 className="font-display font-semibold mb-3">O que está incluído</h3>
                      <ul className="space-y-2">
                        {service.includes.map((it, i) => (
                          <li key={i} className="flex gap-2 text-sm text-foreground/80">
                            <Check size={16} className="text-primary flex-shrink-0 mt-0.5" /> {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {service.excludes?.length ? (
                    <div>
                      <h3 className="font-display font-semibold mb-3">Não incluído</h3>
                      <ul className="space-y-2">
                        {service.excludes.map((it, i) => (
                          <li key={i} className="flex gap-2 text-sm text-foreground/80">
                            <X size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" /> {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {guide && (
                <div className="bg-muted/40 rounded-2xl p-5 flex items-center gap-4">
                  {guide.avatar_url ? (
                    <img src={guide.avatar_url} alt={guide.full_name ?? ""} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {guide.full_name?.charAt(0) ?? "G"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display font-semibold">{guide.full_name}</h4>
                      <ShieldCheck size={14} className="text-primary" />
                    </div>
                    {guide.bio && <p className="text-sm text-muted-foreground line-clamp-2">{guide.bio}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Booking sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">A partir de</span>
                  <p className="font-display font-bold text-3xl text-foreground">
                    €{Number(service.price_per_person).toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground"> /pessoa</span>
                  </p>
                </div>
                <Button asChild variant="hero" size="lg" className="w-full mb-3">
                  <Link to={`/book/${service.id}`}>Reservar agora</Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck size={12} /> Pagamento seguro pela plataforma
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
