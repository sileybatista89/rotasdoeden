import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

export default function BookingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20 bg-muted/30">
        <div className="container max-w-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <CalendarClock size={26} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Reservas em breve
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            As reservas estarão disponíveis assim que os primeiros guias parceiros verificados
            forem activados na plataforma. Estamos a finalizar o processo de validação.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="hero">
              <Link to="/guides">
                <ArrowLeft size={16} /> Voltar
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/seja-parceiro">Sou guia — quero candidatar-me</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
