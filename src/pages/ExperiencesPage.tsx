import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock, Users, MapPin, Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Constants, type Tables } from "@/integrations/supabase/types";
import { SEO } from "@/components/SEO";
import { EditorialCategories } from "@/components/experiences/EditorialCategories";

type Service = Tables<"services">;
type ProfilePub = Tables<"profiles_public">;

const categoryLabels: Record<string, string> = {
  tour: "Tour", experience: "Experiência", transfer: "Transfer", diving: "Mergulho",
  hiking: "Caminhada", fishing: "Pesca", kayak: "Kayak", surfing: "Surf",
  birdwatching: "Birdwatching", photography: "Fotografia", gastronomy: "Gastronomia",
  culture: "Cultura", nightlife: "Vida Nocturna",
};

export default function ExperiencesPage() {
  const [params] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [guides, setGuides] = useState<Record<string, ProfilePub>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<string>(params.get("category") ?? "all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      const { data: svcs, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });

      // Uma falha de rede não é o mesmo que "ainda não há parceiros": mostrar a ausência
      // quando houve erro seria esconder um bloqueio atrás de uma mensagem tranquilizadora.
      if (servicesError) {
        if (!cancelled) {
          setLoadError("Não foi possível carregar as experiências.");
          setLoading(false);
        }
        return;
      }

      const list = svcs ?? [];
      setServices(list);

      const guideIds = Array.from(new Set(list.map((s) => s.guide_id)));
      if (guideIds.length) {
        const { data: profs } = await supabase
          .from("profiles_public")
          .select("*")
          .in("id", guideIds);
        const map: Record<string, ProfilePub> = {};
        (profs ?? []).forEach((p) => { if (p.id) map[p.id] = p; });
        setGuides(map);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [services, search, category]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Experiências em São Tomé e Príncipe | Rotas do Éden"
        description="Explore trilhas, mergulho, gastronomia e cultura em São Tomé e Príncipe. Reserve experiências autênticas com guias locais verificados."
        path="/experiences"
      />
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border py-16 md:py-24">
          <div className="container grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
            <span className="eyebrow mb-4">São Tomé e Príncipe</span>
            <h1 className="mt-5 font-display text-5xl font-normal leading-none text-foreground md:text-7xl">
              Experiências que começam no lugar.
            </h1>
            </div>
            <p className="max-w-lg text-base font-light leading-8 text-muted-foreground lg:col-span-4">
              Descubra as ilhas através da natureza, da cultura e do conhecimento local. As ofertas publicadas por parceiros
              verificados aparecem separadamente quando estão disponíveis.
            </p>
          </div>
        </section>

        <EditorialCategories />

        <section className="border-y border-border bg-card" aria-labelledby="available-experiences-title">
          <div className="container pb-7 pt-12 md:pt-16">
            <span className="eyebrow mb-3">Parceiros locais</span>
            <h2 id="available-experiences-title" className="display-md mb-3 text-foreground">
              Experiências disponíveis
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Apenas serviços criados por parceiros reais e aprovados pela equipa da Rotas do Éden são publicados aqui.
            </p>
          </div>
          <div className="container py-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procurar experiências..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Constants.public.Enums.service_category.map((c) => (
                  <SelectItem key={c} value={c}>{categoryLabels[c] ?? c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="py-10 md:py-12">
          <div className="container">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-sm" />
                ))}
              </div>
            ) : loadError ? (
              <div className="py-8 md:py-10 max-w-2xl" role="alert">
                <h3 className="font-display text-2xl font-semibold mb-2">Não conseguimos mostrar as experiências</h3>
                <p className="text-muted-foreground mb-6">
                  {loadError} Isto é uma falha de ligação, não uma ausência de parceiros — os dados continuam
                  guardados. Tenta novamente.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <Button variant="hero" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button>
                  <Button asChild variant="outline"><Link to="/proposta">Falar com a equipa</Link></Button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 md:py-10 max-w-2xl">
                <h3 className="font-display text-2xl font-semibold mb-2">
                  {services.length === 0
                    ? "Os primeiros parceiros estão a ser selecionados"
                    : "Não encontrámos resultados para esta pesquisa"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {services.length === 0
                    ? "Estamos a selecionar e verificar os primeiros parceiros da Rotas do Éden. As primeiras experiências serão disponibilizadas progressivamente."
                    : "Tente outra palavra ou limpe os filtros para ver tudo o que está disponível."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  {services.length > 0 && (
                    <Button variant="outline" onClick={() => { setSearch(""); setCategory("all"); }}>
                      Limpar filtros
                    </Button>
                  )}
                  <Button asChild variant="hero"><Link to="/seja-parceiro">Quero ser parceiro</Link></Button>
                  <Button asChild variant="outline"><Link to="/sobre-sao-tome">Explorar o destino</Link></Button>
                </div>
              </div>

            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((s) => (
                  <Link
                    key={s.id}
                    to={`/experiences/${s.id}`}
                    className="group overflow-hidden border-t border-border bg-card transition-colors hover:border-primary"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      {s.images?.[0] ? (
                        <img
                          src={s.images[0]}
                          alt={s.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                      <span className="absolute left-3 top-3 bg-card/95 px-2.5 py-1 text-xs font-medium">
                        {categoryLabels[s.category] ?? s.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="mb-1 line-clamp-1 font-display text-2xl font-normal text-foreground">{s.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{s.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {s.duration_hours}h</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {s.min_people}-{s.max_people}</span>
                        {guides[s.guide_id]?.full_name && (
                          <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {guides[s.guide_id].full_name}</span>
                        )}
                      </div>
                      <div className="flex items-end justify-between pt-3 border-t border-border">
                        <div>
                          <span className="text-xs text-muted-foreground">A partir de</span>
                          <p className="font-display font-bold text-xl text-foreground">
                            €{Number(s.price_per_person).toFixed(0)}
                            <span className="text-xs font-normal text-muted-foreground">/pessoa</span>
                          </p>
                        </div>
                        <Button size="sm">Ver detalhes</Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
