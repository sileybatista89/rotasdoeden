import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar, Users, Euro, Loader2, MessageSquare, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Booking = {
  id: string;
  service_id: string;
  service_title: string;
  date: string;
  num_people: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status: string;
  special_requests: string | null;
  created_at: string;
  tourist_id: string;
  guide_id: string;
  guide_payout: number | null;
  commission_amount: number | null;
};

const statusVariant: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "Aguarda pagamento", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmada", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelada", className: "bg-rose-100 text-rose-800" },
  completed: { label: "Concluída", className: "bg-blue-100 text-blue-800" },
  refunded: { label: "Reembolsada", className: "bg-zinc-200 text-zinc-800" },
};

export default function MyBookingsPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const isGuide = role === "guide";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const column = isGuide ? "guide_id" : "tourist_id";
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq(column, user.id)
        .order("date", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar reservas");
      } else {
        setBookings((data ?? []) as Booking[]);
      }
      setLoading(false);
    };
    load();
  }, [user, isGuide]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.date >= today && b.status !== "cancelled");
  const past = bookings.filter((b) => b.date < today || b.status === "cancelled");

  const renderCard = (b: Booking) => {
    const status = statusVariant[b.status] ?? { label: b.status, className: "bg-muted text-foreground" };
    return (
      <Card key={b.id} className="overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">{b.service_title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Criada {format(new Date(b.created_at), "dd MMM yyyy", { locale: pt })}
              </p>
            </div>
            <Badge className={status.className} variant="secondary">{status.label}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} />
              <span>{format(new Date(b.date), "dd MMM yyyy", { locale: pt })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users size={14} />
              <span>{b.num_people} {b.num_people === 1 ? "pessoa" : "pessoas"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Euro size={14} />
              <span>{Number(b.total_price).toFixed(2)} {b.currency}</span>
            </div>
            <div className="text-muted-foreground">
              Pagamento: <span className="font-medium text-foreground capitalize">{b.payment_status}</span>
            </div>
          </div>

          {isGuide && b.guide_payout != null && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Receberá <span className="font-semibold text-foreground">{Number(b.guide_payout).toFixed(2)} {b.currency}</span>
              {" "}(comissão {Number(b.commission_amount ?? 0).toFixed(2)} {b.currency})
            </div>
          )}

          {b.special_requests && (
            <div className="text-sm bg-muted/50 rounded-md p-3">
              <span className="font-medium">Pedidos especiais:</span> {b.special_requests}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link to={`/experiences/${b.service_id}`}>
                <ExternalLink size={14} className="mr-1" /> Ver experiência
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/messages">
                <MessageSquare size={14} className="mr-1" /> Mensagens
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">
            {isGuide ? "Reservas recebidas" : "As minhas reservas"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isGuide
              ? "Acompanhe as reservas dos seus visitantes."
              : "Veja o histórico e o estado das suas experiências reservadas."}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">Ainda não tem reservas.</p>
              {!isGuide && (
                <Button asChild variant="hero">
                  <Link to="/experiences">Explorar experiências</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Histórico ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-4 mt-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma reserva futura.</p>
              ) : upcoming.map(renderCard)}
            </TabsContent>
            <TabsContent value="past" className="space-y-4 mt-4">
              {past.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem histórico.</p>
              ) : past.map(renderCard)}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
}
