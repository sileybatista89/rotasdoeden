import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarIcon, Clock, Users, MapPin, CheckCircle, ArrowLeft, Minus, Plus, Star } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/guides/VerifiedBadge";
import { mockServices, mockGuides } from "@/data/mockData";
import { guidePhotos } from "@/data/guidePhotos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  tour: "Tour",
  experience: "Experiência",
  transfer: "Transfer",
  diving: "Mergulho",
  hiking: "Trilho",
};

export default function BookingPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const service = mockServices.find((s) => s.id === serviceId);
  const guide = service ? mockGuides.find((g) => g.id === service.guide_id) : null;

  const [date, setDate] = useState<Date>();
  const [numPeople, setNumPeople] = useState(service?.min_people ?? 1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const totalPrice = useMemo(() => {
    if (!service) return 0;
    return service.price * numPeople;
  }, [service, numPeople]);

  const commissionRate = 0.15;
  const platformFee = totalPrice * commissionRate;

  if (!service || !guide) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Serviço não encontrado</h1>
            <Button asChild variant="outline">
              <Link to="/guides">← Voltar aos guias</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const photo = guidePhotos[guide.id];
  const canProceed = step === 1 ? !!date && numPeople >= service.min_people && numPeople <= service.max_people : true;

  const handleConfirm = () => {
    toast.success("Reserva confirmada com sucesso!", {
      description: `A sua reserva para "${service.title}" foi registada.`,
    });
    setStep(3);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container py-8 max-w-5xl">
          <Link to={`/guides/${guide.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} /> Voltar ao perfil do guia
          </Link>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle size={16} /> : s}
                </div>
                <span className={cn("text-sm hidden sm:inline", step >= s ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s === 1 ? "Detalhes" : s === 2 ? "Pagamento" : "Confirmação"}
                </span>
                {s < 3 && <div className={cn("w-8 h-0.5", step > s ? "bg-primary" : "bg-border")} />}
              </div>
            ))}
          </div>

          {step === 3 ? (
            /* Step 3 — Confirmation */
            <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Reserva Confirmada!</h2>
              <p className="text-muted-foreground mb-6">A sua reserva foi registada com sucesso. O guia irá confirmar em breve.</p>
              <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium text-foreground">{service.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Guia</span>
                  <span className="font-medium text-foreground">{guide.user?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium text-foreground">{date ? format(date, "d 'de' MMMM, yyyy", { locale: pt }) : ""}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pessoas</span>
                  <span className="font-medium text-foreground">{numPeople}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="hero" onClick={() => navigate("/guides")}>Explorar mais guias</Button>
                <Button variant="outline" onClick={() => navigate(`/guides/${guide.id}`)}>Voltar ao perfil</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                {step === 1 && (
                  <>
                    {/* Service Summary */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">{categoryLabels[service.category]}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock size={14} /> {service.duration_hours}h
                        </div>
                      </div>
                      <h2 className="font-display text-xl font-bold text-foreground mb-2">{service.title}</h2>
                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users size={14} /> {service.min_people}–{service.max_people} pessoas</span>
                        {service.meeting_point && (
                          <span className="flex items-center gap-1"><MapPin size={14} /> {service.meeting_point}</span>
                        )}
                      </div>
                      {service.includes && service.includes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {service.includes.map((item) => (
                            <span key={item} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                              <CheckCircle size={10} /> {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date Selection */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h3 className="font-display font-semibold text-foreground mb-4">Seleccionar Data</h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12", !date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "d 'de' MMMM, yyyy", { locale: pt }) : "Escolher uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(d) => d < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Number of People */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h3 className="font-display font-semibold text-foreground mb-4">Número de Pessoas</h3>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setNumPeople(Math.max(service.min_people, numPeople - 1))}
                          disabled={numPeople <= service.min_people}
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="font-display text-2xl font-bold text-foreground w-12 text-center">{numPeople}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setNumPeople(Math.min(service.max_people, numPeople + 1))}
                          disabled={numPeople >= service.max_people}
                        >
                          <Plus size={16} />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          (mín. {service.min_people}, máx. {service.max_people})
                        </span>
                      </div>
                    </div>

                    {/* Special Requests */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h3 className="font-display font-semibold text-foreground mb-4">Pedidos Especiais <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h3>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="Alergias alimentares, necessidades especiais, pedidos de horário..."
                        className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-none"
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="font-display text-xl font-semibold text-foreground mb-6">Resumo da Reserva</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                          {photo ? (
                            <img src={photo} alt={guide.user?.name ?? ""} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {guide.user?.name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{guide.user?.name}</span>
                            {guide.license_verified && <VerifiedBadge size="sm" showLabel={false} />}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star size={12} className="fill-secondary text-secondary" />
                            <span>{guide.rating.toFixed(2)}</span>
                            <span>({guide.total_reviews} avaliações)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Serviço</span>
                          <span className="font-medium text-foreground">{service.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Data</span>
                          <span className="font-medium text-foreground">{date ? format(date, "d 'de' MMMM, yyyy", { locale: pt }) : ""}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duração</span>
                          <span className="font-medium text-foreground">{service.duration_hours} horas</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pessoas</span>
                          <span className="font-medium text-foreground">{numPeople}</span>
                        </div>
                        {service.meeting_point && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ponto de encontro</span>
                            <span className="font-medium text-foreground">{service.meeting_point}</span>
                          </div>
                        )}
                        {specialRequests && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Pedidos especiais:</span>
                            <p className="mt-1 text-foreground italic">{specialRequests}</p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">€{service.price.toFixed(2)} × {numPeople} {numPeople === 1 ? "pessoa" : "pessoas"}</span>
                          <span className="text-foreground">€{totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-foreground">
                          <span>Total</span>
                          <span className="text-lg">€{totalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="bg-accent/50 rounded-xl p-4 text-sm text-muted-foreground">
                        <p>💳 O pagamento será processado de forma segura. O valor é retido até à conclusão do serviço.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar — Price Summary */}
              <div>
                <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 space-y-4">
                  {/* Guide mini card */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                      {photo ? (
                        <img src={photo} alt={guide.user?.name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {guide.user?.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{guide.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{guide.city}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="font-display font-semibold text-foreground mb-1">{service.title}</p>
                    <p className="text-xs text-muted-foreground">{service.duration_hours}h · {categoryLabels[service.category]}</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço por pessoa</span>
                      <span className="text-foreground">€{service.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pessoas</span>
                      <span className="text-foreground">{numPeople}</span>
                    </div>
                    {date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data</span>
                        <span className="text-foreground">{format(date, "dd/MM/yyyy")}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between font-display font-bold text-lg">
                    <span>Total</span>
                    <span>€{totalPrice.toFixed(2)}</span>
                  </div>

                  {step === 1 ? (
                    <Button
                      variant="hero"
                      className="w-full"
                      size="lg"
                      disabled={!canProceed}
                      onClick={() => setStep(2)}
                    >
                      Continuar para Pagamento
                    </Button>
                  ) : step === 2 ? (
                    <div className="space-y-2">
                      <Button variant="hero" className="w-full" size="lg" onClick={handleConfirm}>
                        Confirmar Reserva — €{totalPrice.toFixed(2)}
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
                        Voltar
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
