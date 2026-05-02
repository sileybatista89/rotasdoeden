import { Link } from "react-router-dom";
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="sand" size="lg" className="rounded-full px-8">
            <Link to="/auth?mode=register&role=guide&next=/kyc">
              Criar conta de guia <ArrowRight size={18} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8 bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link to="/seja-parceiro">Saber mais</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
