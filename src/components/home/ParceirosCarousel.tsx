import { Link } from "react-router-dom";
import { Hotel, UtensilsCrossed, Car, Compass, Building2, Briefcase, ArrowRight, Sparkles } from "lucide-react";

const partnerTypes = [
  { Icon: Hotel, title: "Hotéis & Pousadas", text: "Roças históricas, pousadas familiares e resorts à beira-mar." },
  { Icon: UtensilsCrossed, title: "Restaurantes", text: "Calulu, izaquente e marisco fresco — cozinha autêntica santomense." },
  { Icon: Car, title: "Rent-a-car", text: "Mobilidade segura para explorar São Tomé e Príncipe ao seu ritmo." },
  { Icon: Compass, title: "Operadores turísticos", text: "Mergulho, observação de baleias e expedições ao Pico Cão Grande." },
  { Icon: Building2, title: "Experiências locais", text: "Festivais, artesanato e produtores de cacau." },
  { Icon: Briefcase, title: "Parceiros comerciais", text: "Empresas que apoiam o ecossistema turístico santomense." },
];

export function ParceirosCarousel() {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-accent/20 border-y border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              <Sparkles size={12} /> Rede de Parceiros
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              O ecossistema turístico de São Tomé e Príncipe
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Hotéis, restaurantes, rent-a-car e operadores recomendados pela Rotas do Éden
              — para que cada viagem seja completa.
            </p>
          </div>
          <Link
            to="/parceiros"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
          >
            Ver toda a rede <ArrowRight size={16} />
          </Link>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-none">
          <div className="flex gap-4 md:grid md:grid-cols-3 md:gap-5">
            {partnerTypes.map(({ Icon, title, text }) => (
              <article
                key={title}
                className="snap-start shrink-0 w-[78%] sm:w-[48%] md:w-auto bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary/10 ring-1 ring-primary/15 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/seja-parceiro"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-eden-green-dark transition-colors rounded-full px-6 py-3 text-sm font-semibold shadow-lg shadow-primary/20"
          >
            Tornar-me parceiro <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
