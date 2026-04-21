import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuidesComingSoon() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full mb-5">
            <Sparkles size={12} /> Novos parceiros em adesão
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Estamos a selecionar os primeiros guias locais verificados
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            A Rotas do Éden só apresenta guias depois de validar pessoalmente a sua licença,
            identidade e experiência. Preferimos começar com poucos guias verificados a expor
            os turistas a perfis sem garantias.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="hero" size="lg" className="rounded-full px-7">
              <Link to="/seja-parceiro">
                Tornar-me Guia Parceiro <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-7">
              <Link to="/seja-parceiro#processo">Saber mais sobre o processo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
