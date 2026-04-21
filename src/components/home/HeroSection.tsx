import { Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Pico Cão Grande, São Tomé e Príncipe" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/70" />
      </div>

      <div className="container relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-sm font-medium mb-6 border border-primary-foreground/20">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            52.000+ visitantes em 2025
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight mb-6 drop-shadow-lg">
            Descobre São Tomé<br />
            <span className="text-secondary">com quem a conhece</span><br />
            de verdade.
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/85 max-w-xl mx-auto mb-10 font-body drop-shadow">
            Reserva experiências autênticas com guias turísticos licenciados e verificados no arquipélago mais bonito de África.
          </p>

          {/* Search bar */}
          <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-2xl border border-border/50 p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Search size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="O que queres explorar?"
                className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button asChild variant="hero" size="lg" className="rounded-lg">
              <Link to="/guides">Pesquisar Guias</Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-primary-foreground/70">
            <span>Mergulho</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
            <span>Trilhos</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
            <span>Gastronomia</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
            <span>História</span>
          </div>
        </div>

        <div className="flex justify-center mt-16">
          <ChevronDown size={24} className="text-primary-foreground/60 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
