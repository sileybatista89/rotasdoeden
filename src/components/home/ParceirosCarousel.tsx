import { Link } from "react-router-dom";
import { Hotel, UtensilsCrossed, Car, Compass, Building2, Briefcase, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const partnerTypes = [
  { Icon: Hotel, title: "Hotéis & Pousadas", text: "Roças históricas, pousadas familiares e resorts à beira-mar." },
  { Icon: UtensilsCrossed, title: "Restaurantes", text: "Calulu, izaquente e marisco fresco, cozinha autêntica santomense." },
  { Icon: Car, title: "Rent-a-car", text: "Mobilidade segura para explorar São Tomé e Príncipe ao seu ritmo." },
  { Icon: Compass, title: "Operadores turísticos", text: "Mergulho, observação de baleias e expedições ao Pico Cão Grande." },
  { Icon: Building2, title: "Experiências locais", text: "Festivais, artesanato e produtores de cacau." },
  { Icon: Briefcase, title: "Parceiros comerciais", text: "Empresas que apoiam o ecossistema turístico santomense." },
];

export function ParceirosCarousel() {
  return (
    <section className="py-20 md:py-28 bg-card border-y border-border">
      <div className="container">
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div className="max-w-2xl">
            <span className="eyebrow mb-6">Rede de Parceiros</span>
            <h2 className="display-md text-foreground mt-5 mb-4">
              O ecossistema turístico de São Tomé e Príncipe
            </h2>
            <p className="body-copy max-w-xl">
              Hotéis, restaurantes, rent-a-car e operadores recomendados pela Rotas do Éden
             , para que cada viagem seja completa.
            </p>
          </div>
          <Link
            to="/parceiros"
            className="link-underline text-sm uppercase tracking-[0.16em] text-foreground hover:text-primary transition-colors shrink-0"
          >
            Ver toda a rede <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        </Reveal>

        <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-none">
          <div className="flex gap-5 md:grid md:grid-cols-3 md:gap-x-12 md:gap-y-10">
            {partnerTypes.map(({ Icon, title, text }, i) => (
              <Reveal
                as="article"
                key={title}
                delay={(i % 3) * 90}
                className="snap-start shrink-0 w-[76%] sm:w-[46%] md:w-auto border-t border-border pt-6"
              >
                <Icon size={20} className="text-primary mb-5" strokeWidth={1.5} />
                <h3 className="font-display text-xl text-foreground mb-2 leading-snug">{title}</h3>
                <p className="text-[0.93rem] text-muted-foreground leading-[1.8] font-light">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border">
          <Link
            to="/seja-parceiro"
            className="inline-flex items-center gap-2 bg-eden-ink text-primary-foreground hover:bg-primary transition-colors duration-500 rounded-full px-8 h-12 text-[0.82rem] font-semibold uppercase tracking-[0.12em]"
          >
            Tornar-me parceiro <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </section>
  );
}
