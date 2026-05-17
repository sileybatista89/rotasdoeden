import { Mountain, Waves, Leaf, Utensils, Landmark, Bird } from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: Mountain,
    title: "Pico Cão Grande",
    text: "Uma agulha vulcânica de 663 m que rasga a floresta tropical do sul — um dos ícones absolutos da ilha.",
  },
  {
    icon: Waves,
    title: "Praias do sul",
    text: "Praia Jalé, Piscina e Inhame: areia dourada, palmeiras e mar morno. Tartarugas desovam entre Outubro e Março.",
  },
  {
    icon: Landmark,
    title: "Roças históricas",
    text: "Agostinho Neto, São João dos Angolares, Sundy. Antigas plantações de cacau e café reconvertidas em património vivo.",
  },
  {
    icon: Utensils,
    title: "Sabores autênticos",
    text: "Calulu de peixe, banana frita, blá-blá, jaca, izaquente — cozinha crioula com cacau e pimenta do Príncipe.",
  },
  {
    icon: Bird,
    title: "Biodiversidade rara",
    text: "Mais de 100 espécies endémicas. Floresta Obô, tordo-de-Príncipe e a maior begónia do mundo.",
  },
  {
    icon: Leaf,
    title: "Cacau de origem",
    text: "Pequenas roças produzem dos melhores cacaus do mundo. Visitas guiadas do grão à tablete.",
  },
];

export function DescobreStpSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        <div className="max-w-2xl mb-10 md:mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            Descobre São Tomé e Príncipe
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Duas ilhas, mil histórias à espera
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Pequeno arquipélago no Golfo da Guiné, São Tomé e Príncipe esconde floresta tropical, vulcões, praias desertas e uma cultura crioula
            única. Aqui ficam alguns dos motivos pelos quais merece ser visitado devagar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {highlights.map((h) => {
            const Icon = h.icon;
            return (
              <article
                key={h.title}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{h.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{h.text}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/sobre-sao-tome"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Conhecer melhor o destino →
          </Link>
        </div>
      </div>
    </section>
  );
}
