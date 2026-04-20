import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Star, MapPin, Globe, Clock, Users, CheckCircle, ArrowLeft, Calendar,
  FileCheck, Shield, MessageSquare, Minus, Plus, CalendarIcon
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VerifiedBadge } from "@/components/guides/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mockGuides, mockServices, mockReviews } from "@/data/mockData";
import { guidePhotos } from "@/data/guidePhotos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  tour: "Tour", experience: "Experiência", transfer: "Transfer", diving: "Mergulho",
  hiking: "Trilho", fishing: "Pesca", kayak: "Kayak", surfing: "Surf",
  birdwatching: "Birdwatching", photography: "Fotografia", gastronomy: "Gastronomia",
  culture: "Cultura", nightlife: "Noturno",
};

export default function GuideProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const guide = mockGuides.find((g) => g.id === id);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [date, setDate] = useState<Date>();
  const [numPeople, setNumPeople] = useState(1);
  const [contactMessage, setContactMessage] = useState("");

  const services = mockServices.filter((s) => s.guide_id === (guide?.id ?? ""));
  const reviews = mockReviews.filter((r) => r.guide_id === (guide?.id ?? ""));
  const photo = guide ? guidePhotos[guide.id] : undefined;
  const selectedService = services.find((s) => s.id === selectedServiceId);

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star - 1],
      pct: Math.round((counts[star - 1] / total) * 100),
    }));
  }, [reviews]);

  const nextDates = useMemo(() => {
    const today = new Date();
    return [2, 4, 6, 9].map((d) => addDays(today, d));
  }, []);

  const serviceFee = 0.10;
  const basePrice = selectedService ? selectedService.price * numPeople : 0;
  const fee = basePrice * serviceFee;
  const totalPrice = basePrice + fee;

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



  const bookingForm = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Seleciona um serviço</label>
        <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setNumPeople(1); }}>
          <SelectTrigger><SelectValue placeholder="Escolher serviço..." /></SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title} — €{s.price}/pessoa</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "d 'de' MMMM, yyyy", { locale: pt }) : "Escolher data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single" selected={date} onSelect={setDate}
              disabled={(d) => d < new Date()}
              initialFocus className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Nº de pessoas</label>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9"
            onClick={() => setNumPeople(Math.max(selectedService?.min_people ?? 1, numPeople - 1))}
            disabled={numPeople <= (selectedService?.min_people ?? 1)}>
            <Minus size={14} />
          </Button>
          <span className="font-display text-lg font-bold w-8 text-center">{numPeople}</span>
          <Button variant="outline" size="icon" className="h-9 w-9"
            onClick={() => setNumPeople(Math.min(selectedService?.max_people ?? 10, numPeople + 1))}
            disabled={numPeople >= (selectedService?.max_people ?? 10)}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {selectedService && (
        <>
          <Separator />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">€{selectedService.price} × {numPeople} pessoa{numPeople > 1 ? "s" : ""}</span>
              <span className="text-foreground">€{basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de serviço (10%)</span>
              <span className="text-foreground">€{fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span className="text-primary">€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}

      <Button
        variant="hero" className="w-full" size="lg"
        disabled={!selectedServiceId || !date}
        onClick={() => navigate(`/book/${selectedServiceId}`)}
      >
        Reservar Agora
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield size={14} />
        <span>Pagamento seguro · Cancelamento gratuito até 48h</span>
      </div>
    </div>
  );

  const cheapestPrice = services.length ? Math.min(...services.map((s) => s.price)) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-accent/30 to-background py-8 sm:py-12">
          <div className="container">
            <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6">
              <ArrowLeft size={16} /> Voltar aos guias
            </Link>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-card shadow-lg flex-shrink-0">
                {photo ? (
                  <img src={photo} alt={guide.user?.name ?? "Guia"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-3xl font-display font-bold text-primary">
                    {guide.user?.name?.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{guide.user?.name}</h1>
                  {guide.license_verified && <VerifiedBadge />}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {guide.city}</span>
                  <span className="flex items-center gap-1"><Globe size={14} /> {guide.languages.join(", ")}</span>
                  <span className="hidden sm:flex items-center gap-1"><Calendar size={14} /> Membro desde {guide.created_at ? new Date(guide.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" }) : ""}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="fill-secondary text-secondary" />
                    <span className="font-semibold">{guide.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">({guide.total_reviews} avaliações)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {guide.specialties.slice(0, 4).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-10">
              {/* Bio */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Sobre Mim</h2>
                <p className="text-muted-foreground leading-relaxed">{guide.bio}</p>
                {guide.bio_en && (
                  <p className="text-muted-foreground leading-relaxed mt-3 italic text-sm border-l-2 border-border pl-4">{guide.bio_en}</p>
                )}
              </section>

              <Separator />

              {/* Specialties & Languages */}
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-3">Especialidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {guide.specialties.map((s) => (
                        <span key={s} className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-3">Idiomas</h3>
                    <div className="flex flex-wrap gap-2">
                      {guide.languages.map((lang) => {
                        const flags: Record<string, string> = {
                          "Português": "🇵🇹", "Inglês": "🇬🇧", "Francês": "🇫🇷",
                          "Alemão": "🇩🇪", "Espanhol": "🇪🇸",
                        };
                        return (
                          <span key={lang} className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                            {flags[lang] ?? "🌐"} {lang}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* License Card */}
              {guide.license_verified && (
                <>
                  <section>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileCheck size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground mb-1">Licença Verificada</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Licença verificada pelo Ministério do Turismo de São Tomé e Príncipe.
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">{guide.license_number}</p>
                      </div>
                      <span className="ml-auto text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Verificado
                      </span>
                    </div>
                  </section>
                  <Separator />
                </>
              )}

              {/* Services */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-6">Serviços Disponíveis</h2>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {categoryLabels[service.category] ?? service.category}
                          </span>
                          <h3 className="font-display font-semibold text-lg text-foreground mt-1">{service.title}</h3>
                        </div>
                        <p className="font-display text-xl font-bold text-primary">€{service.price}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock size={14} /> {service.duration_hours}h</span>
                        <span className="flex items-center gap-1"><Users size={14} /> {service.min_people}–{service.max_people} pessoas</span>
                        {service.meeting_point && (
                          <span className="flex items-center gap-1"><MapPin size={14} /> {service.meeting_point}</span>
                        )}
                        <Link to={`/book/${service.id}`} className="ml-auto">
                          <Button variant="hero" size="sm">Reservar</Button>
                        </Link>
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
                </div>
              </section>

              <Separator />

              {/* Reviews with Rating Breakdown */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
                  O que dizem os turistas
                </h2>

                {/* Rating summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl">
                    <span className="font-display text-5xl font-bold text-foreground">{guide.rating.toFixed(1)}</span>
                    <div className="flex items-center gap-0.5 my-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={18} className={i < Math.round(guide.rating) ? "fill-secondary text-secondary" : "text-muted"} />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">{guide.total_reviews} avaliações</span>
                  </div>
                  <div className="space-y-2 p-6 bg-card border border-border rounded-xl">
                    {ratingBreakdown.map(({ star, count, pct }) => (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-right text-muted-foreground">{star}★</span>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="w-10 text-right text-muted-foreground">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review cards */}
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const flags: Record<string, string> = {
                      "Portugal": "🇵🇹", "Brasil": "🇧🇷", "França": "🇫🇷", "Alemanha": "🇩🇪",
                      "Reino Unido": "🇬🇧", "Austrália": "🇦🇺", "Dinamarca": "🇩🇰", "Suécia": "🇸🇪",
                      "Noruega": "🇳🇴", "Rússia": "🇷🇺", "Singapura": "🇸🇬",
                    };
                    return (
                      <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm text-primary">
                              {review.tourist?.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{review.tourist?.name}</p>
                              <p className="text-xs text-muted-foreground">{flags[review.tourist?.nationality ?? ""] ?? "🌐"} {review.tourist?.nationality}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
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
                    );
                  })}
                </div>
              </section>

              <Separator />

              {/* Map Placeholder */}
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Área de Actuação</h2>
                <div className="bg-muted rounded-xl h-64 flex items-center justify-center border border-border">
                  <div className="text-center text-muted-foreground">
                    <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Mapa de São Tomé e Príncipe</p>
                    <p className="text-xs">{guide.city}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Baseado em {guide.city}</p>
              </section>
            </div>

            {/* Sidebar — desktop only */}
            <div className="hidden lg:block space-y-4">
              <div className="sticky top-24 space-y-4">
                {/* Booking Sidebar */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-md">
                  <h3 className="font-display font-bold text-foreground mb-4">Reserva Rápida</h3>
                  {bookingForm}
                </div>

                {/* Available dates chips */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3">Próximas Datas Disponíveis</h4>
                  <div className="flex flex-wrap gap-2">
                    {nextDates.map((d) => (
                      <button
                        key={d.toISOString()}
                        onClick={() => setDate(d)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-colors",
                          date?.toDateString() === d.toDateString()
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {format(d, "EEE, d MMM", { locale: pt })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-3">Tens alguma dúvida antes de reservar?</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MessageSquare size={16} className="mr-2" /> Enviar Mensagem
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">Mensagem para {guide.user?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <textarea
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Escreve a tua mensagem aqui (mínimo 50 caracteres)..."
                          className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="hero"
                            disabled={contactMessage.length < 50}
                            onClick={() => {
                              toast.success("Mensagem enviada!", { description: `A tua mensagem foi enviada a ${guide.user?.name}.` });
                              setContactMessage("");
                            }}
                          >
                            Enviar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky booking bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground">A partir de</span>
          <span className="font-display font-bold text-lg text-foreground">€{cheapestPrice}<span className="text-xs font-normal text-muted-foreground">/pessoa</span></span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="hero" size="lg" className="flex-1 max-w-[60%]">Reservar</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="font-display text-left">Reserva Rápida</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{bookingForm}</div>

            <div className="mt-6">
              <h4 className="font-display font-semibold text-sm text-foreground mb-3">Próximas Datas Disponíveis</h4>
              <div className="flex flex-wrap gap-2">
                {nextDates.map((d) => (
                  <button
                    key={d.toISOString()}
                    onClick={() => setDate(d)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-colors",
                      date?.toDateString() === d.toDateString()
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {format(d, "EEE, d MMM", { locale: pt })}
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Footer />
    </div>
  );
}
