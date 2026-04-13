import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function GuideCTA() {
  return (
    <section className="py-20 bg-primary relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="container relative text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          És guia turístico em São Tomé?
        </h2>
        <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 text-lg">
          Regista-te na plataforma, verifica a tua licença e começa a receber reservas de turistas de todo o mundo.
        </p>
        <Button variant="sand" size="lg" className="rounded-full px-8">
          Registar como Guia <ArrowRight size={18} />
        </Button>
      </div>
    </section>
  );
}
