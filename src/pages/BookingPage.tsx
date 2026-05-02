import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Users, ShieldCheck, Loader2 } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

export default function BookingPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [numPeople, setNumPeople] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle();
      setService(data);
      if (data) setNumPeople(data.min_people);
      setLoading(false);
    })();
  }, [serviceId]);

  const totalPrice = service ? Number(service.price_per_person) * numPeople : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !user) return;
    if (!date) {
      toast.error("Escolha uma data");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          serviceId: service.id,
          date,
          numPeople,
          specialRequests: specialRequests || undefined,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (error) throw error;
      if (!data?.clientSecret) throw new Error("Resposta inválida");
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao iniciar pagamento");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-10 flex-1"><Skeleton className="h-96 w-full rounded-2xl" /></main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center text-center py-20">
          <div>
            <h1 className="font-display text-3xl font-bold mb-3">Experiência indisponível</h1>
            <Button asChild><Link to="/experiences"><ArrowLeft size={16} /> Ver outras experiências</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (clientSecret) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-8 flex-1">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => { setClientSecret(null); setSubmitting(false); }}>
            <ArrowLeft size={14} /> Alterar reserva
          </Button>
          <h1 className="font-display text-2xl font-bold mb-4">Finalizar pagamento</h1>
          <div id="checkout" className="rounded-2xl overflow-hidden border border-border bg-card">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-8 max-w-5xl">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to={`/experiences/${service.id}`}><ArrowLeft size={14} /> Voltar à experiência</Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">Reservar experiência</h1>
                <p className="text-muted-foreground">{service.title}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1.5"><Calendar size={14} /> Data</Label>
                <Input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="people" className="flex items-center gap-1.5"><Users size={14} /> Número de pessoas</Label>
                <Input
                  id="people"
                  type="number"
                  min={service.min_people}
                  max={service.max_people}
                  value={numPeople}
                  onChange={(e) => setNumPeople(Math.max(service.min_people, Math.min(service.max_people, Number(e.target.value) || 1)))}
                  required
                />
                <p className="text-xs text-muted-foreground">Entre {service.min_people} e {service.max_people} pessoas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Pedidos especiais (opcional)</Label>
                <Textarea id="notes" rows={4} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Restrições alimentares, mobilidade, idioma preferido..." />
              </div>

              <Button type="submit" variant="hero" size="lg" disabled={submitting} className="w-full md:w-auto">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> A preparar pagamento...</> : "Continuar para pagamento"}
              </Button>
            </form>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-semibold mb-4">Resumo</h3>
                <div className="space-y-2 text-sm pb-4 border-b border-border">
                  <div className="flex justify-between"><span className="text-muted-foreground">Preço por pessoa</span><span>€{Number(service.price_per_person).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pessoas</span><span>× {numPeople}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duração</span><span>{service.duration_hours}h</span></div>
                </div>
                <div className="flex justify-between items-end pt-4 mb-4">
                  <span className="font-semibold">Total</span>
                  <span className="font-display font-bold text-2xl">€{totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-primary" />
                  Pagamento seguro. A reserva fica confirmada após o pagamento.
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
