import { Link } from "react-router-dom";
import { Hotel, UtensilsCrossed, Compass, Building2, Sparkles, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/praias/lagoa-azul.jpg";

const categories = [
  {
    icon: Hotel,
    title: "Hotéis & Alojamento",
    text: "Roças históricas, pousadas familiares e resorts à beira-mar. Estamos a selecionar parceiros que partilham o nosso padrão de qualidade e autenticidade.",
  },
  {
    icon: Compass,
    title: "Operadores turísticos",
    text: "Mergulho, observação de baleias, passeios de barco, expedições ao Pico e safaris fotográficos com operadores licenciados.",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurantes & Sabores",
    text: "Mesas locais, cacau, bananeiras e marisco fresco. Vamos destacar restaurantes que celebram a cozinha santomense.",
  },
  {
    icon: Building2,
    title: "Empresas locais",
    text: "Transportes, rent-a-car, artesanato, festivais e produtores de cacau. Espaço reservado para empresas santomenses certificadas.",
  },
];

export default function ParceirosPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Parceiros | Rotas do Éden"
        description="Hotéis, operadores, restaurantes e empresas locais de São Tomé e Príncipe que compõem a rede Rotas do Éden."
        path="/parceiros"
      />
      <Navbar />

      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/55 to-foreground/35" />
        </div>
        <div className="container relative py-16 md:py-24">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
            <Sparkles size={12} /> Rede em construção
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground max-w-3xl leading-tight drop-shadow-lg">
            Os parceiros que tornam cada viagem possível
          </h1>
          <p className="text-primary-foreground/90 text-base md:text-lg max-w-2xl mt-5 leading-relaxed drop-shadow">
            A Rotas do Éden está a construir uma rede curada de hotéis, operadores, restaurantes e empresas locais.
            Selecionamos com o mesmo critério com que verificamos os nossos guias.
          </p>
        </div>
      </header>

      <main className="container py-12 md:py-20 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.title}
                className="group relative bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-primary/40 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary/10 ring-1 ring-primary/15 flex items-center justify-center">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-semibold text-foreground mb-2">{c.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.text}</p>
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-primary font-semibold mt-4">
                      Em curadoria
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-16 md:mt-24 bg-primary text-primary-foreground rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(27_89%_67%_/_0.18),_transparent_60%)]" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              É um negócio santomense e quer fazer parte?
            </h2>
            <p className="text-primary-foreground/85 mb-7 leading-relaxed">
              Candidate-se à nossa rede de parceiros. Avaliamos cada candidatura individualmente para garantir
              o padrão de qualidade que os viajantes esperam da Rotas do Éden.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/seja-parceiro">
                Tornar-me parceiro <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
