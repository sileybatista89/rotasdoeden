import { Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-eden-sand-light">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            40.822 visitantes em 2024
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
            Descobre São Tomé<br />
            <span className="text-primary">com quem a conhece</span><br />
            de verdade.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 font-body">
            Reserva experiências autênticas com guias turísticos licenciados e verificados no arquipélago mais bonito de África.
          </p>

          {/* Search bar */}
          <div className="bg-card rounded-xl shadow-xl shadow-primary/5 border border-border p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
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

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span>Mergulho</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Trilhos</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Gastronomia</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>História</span>
          </div>
        </div>

        <div className="flex justify-center mt-16">
          <ChevronDown size={24} className="text-muted-foreground animate-bounce" />
        </div>
      </div>
    </section>
  );
}
