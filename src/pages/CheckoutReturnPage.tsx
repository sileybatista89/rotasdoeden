import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings">;

export default function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "error">("loading");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    let attempts = 0;
    const poll = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      if (data) {
        setBooking(data);
        if (data.payment_status === "paid") {
          setStatus("success");
          return;
        }
      }
      attempts++;
      if (attempts < 8) setTimeout(poll, 1500);
      else setStatus(data ? "pending" : "error");
    };
    poll();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="container max-w-xl text-center">
          {status === "loading" && (
            <>
              <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-semibold">A confirmar o pagamento...</h1>
            </>
          )}
          {status === "success" && booking && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-primary" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Reserva confirmada!</h1>
              <p className="text-muted-foreground text-lg mb-2">{booking.service_title}</p>
              <p className="text-muted-foreground mb-8">
                {new Date(booking.date).toLocaleDateString("pt-PT", { dateStyle: "full" })} · {booking.num_people} {booking.num_people === 1 ? "pessoa" : "pessoas"} · €{Number(booking.total_price).toFixed(2)}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="hero">
                  <Link to="/messages"><MessageSquare size={16} /> Falar com o guia</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/experiences">Explorar mais experiências</Link>
                </Button>
              </div>
            </>
          )}
          {status === "pending" && (
            <>
              <Loader2 size={48} className="text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-semibold mb-2">Pagamento em processamento</h1>
              <p className="text-muted-foreground mb-6">A confirmação pode demorar alguns minutos. Receberá uma notificação assim que estiver concluída.</p>
              <Button asChild variant="outline"><Link to="/experiences">Voltar</Link></Button>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-semibold mb-2">Não foi possível confirmar</h1>
              <p className="text-muted-foreground mb-6">Não encontrámos informações sobre esta reserva.</p>
              <Button asChild><Link to="/experiences">Voltar às experiências</Link></Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
