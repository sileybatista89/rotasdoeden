import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Globe, Clock, Users, CheckCircle, ArrowLeft, Calendar } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VerifiedBadge } from "@/components/guides/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { mockGuides, mockServices, mockReviews } from "@/data/mockData";
import { guidePhotos } from "@/data/guidePhotos";

const categoryLabels: Record<string, string> = {
  tour: "Tour",
  experience: "Experiência",
  transfer: "Transfer",
  diving: "Mergulho",
  hiking: "Trilho",
};

export default function GuideProfilePage() {
  const { id } = useParams();
  const guide = mockGuides.find((g) => g.id === id);

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Guia não encontrado</h1>
            <Button asChild variant="outline">
              <Link to="/guides">← Voltar aos guias</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const services = mockServices.filter((s) => s.guide_id === guide.id);
  const reviews = mockReviews.filter((r) => r.guide_id === guide.id);
  const initials = guide.user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "G";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-accent/30 to-background py-12">
          <div className="container">
            <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft size={16} /> Voltar aos guias
            </Link>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 border-4 border-card flex items-center justify-center text-3xl font-display font-bold text-primary shadow-lg">
                {initials}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl font-bold text-foreground">{guide.user?.name}</h1>
                  {guide.license_verified && <VerifiedBadge />}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {guide.city}</span>
                  <span className="flex items-center gap-1"><Globe size={14} /> {guide.languages.join(", ")}</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> {guide.years_experience} anos de experiência</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="fill-secondary text-secondary" />
                    <span className="font-semibold">{guide.rating.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm">({guide.total_reviews} avaliações)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {guide.specialties.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm min-w-[240px]">
                <div className="text-center mb-4">
                  <span className="text-sm text-muted-foreground">A partir de</span>
                  <p className="font-display text-3xl font-bold text-foreground">€{guide.price_per_day}<span className="text-sm font-normal text-muted-foreground">/dia</span></p>
                </div>
                <Button variant="hero" className="w-full mb-2" size="lg">Reservar</Button>
                <Button variant="outline" className="w-full">Enviar Mensagem</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
              {/* Bio */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Sobre</h2>
                <p className="text-muted-foreground leading-relaxed">{guide.bio}</p>
                {guide.bio_en && (
                  <p className="text-muted-foreground leading-relaxed mt-3 italic text-sm border-l-2 border-border pl-4">{guide.bio_en}</p>
                )}
              </section>

              <Separator />

              {/* Services */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-6">Serviços Disponíveis</h2>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              {categoryLabels[service.category]}
                            </span>
                          </div>
                          <h3 className="font-display font-semibold text-lg text-foreground">{service.title}</h3>
                        </div>
                        <p className="font-display text-xl font-bold text-foreground">€{service.price}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock size={14} /> {service.duration_hours}h</span>
                        <span className="flex items-center gap-1"><Users size={14} /> {service.min_people}–{service.max_people} pessoas</span>
                        <span className="flex items-center gap-1"><MapPin size={14} /> {service.meeting_point}</span>
                      </div>
                      {service.includes && service.includes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {service.includes.map((item) => (
                            <span key={item} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                              <CheckCircle size={10} /> {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {services.length === 0 && (
                    <p className="text-muted-foreground">Este guia ainda não publicou serviços.</p>
                  )}
                </div>
              </section>

              <Separator />

              {/* Reviews */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
                  Avaliações ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm text-muted-foreground">
                            {review.tourist?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{review.tourist?.name}</p>
                            <p className="text-xs text-muted-foreground">{review.tourist?.nationality}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} size={14} className="fill-secondary text-secondary" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(review.created_at).toLocaleDateString("pt-PT", { year: "numeric", month: "long" })}
                      </p>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-muted-foreground">Este guia ainda não tem avaliações.</p>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar - sticky on desktop */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="bg-accent/50 border border-primary/10 rounded-xl p-5">
                  <h3 className="font-display font-semibold text-foreground mb-2">Licença Verificada</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Este guia possui licença emitida pela Direcção-Geral do Turismo e Hotelaria de São Tomé e Príncipe.
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">{guide.license_number}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">Resumo</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Experiência</dt>
                      <dd className="font-medium text-foreground">{guide.years_experience} anos</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Serviços</dt>
                      <dd className="font-medium text-foreground">{services.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Avaliações</dt>
                      <dd className="font-medium text-foreground">{guide.total_reviews}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cidade</dt>
                      <dd className="font-medium text-foreground">{guide.city}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
