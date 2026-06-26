import { Leaf, Globe2, Bird, TreePine, Waves, ShieldCheck } from "lucide-react";
import obo from "@/assets/real/estrada-norte.webp.asset.json";

const pillars = [
  {
    Icon: Bird,
    title: "Concentração rara de endemismo",
    text: "São Tomé e Príncipe está entre os territórios com maior densidade de espécies endémicas do planeta — incluindo o ibis-de-são-tomé, o tordo-do-príncipe e dezenas de plantas únicas no mundo.",
  },
  {
    Icon: Globe2,
    title: "Reserva da Biosfera UNESCO",
    text: "A ilha do Príncipe é Reserva Mundial da Biosfera pela UNESCO desde 2012, reconhecimento internacional do equilíbrio entre comunidades locais e natureza.",
  },
  {
    Icon: TreePine,
    title: "Floresta Obô — coração verde",
    text: "Os Parques Naturais Obô de São Tomé e do Príncipe protegem floresta tropical primária, cascatas e o icónico Pico Cão Grande.",
  },
  {
    Icon: Waves,
    title: "Turismo de baixo impacto",
    text: "Trabalhamos apenas com guias licenciados que respeitam regras de conservação: trilhos marcados, sem perturbar fauna, sem lixo na floresta.",
  },
];

export function SustentabilidadeSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-accent/20 to-background">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Visual */}
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-border shadow-2xl">
              <img
                src={obo.url}
                alt="Floresta tropical de São Tomé — vegetação endémica do Parque Natural Obô"
                loading="lazy"
                decoding="async"
                width={800}
                height={1000}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-5 sm:-bottom-6 sm:-right-6 bg-card border border-border rounded-2xl shadow-xl p-4 sm:p-5 max-w-[14rem]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-eden-tropical/20 to-primary/15 flex items-center justify-center">
                  <Leaf size={16} className="text-eden-tropical" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">UNESCO</span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                Reserva Mundial da Biosfera
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Príncipe, desde 2012</p>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-eden-tropical mb-3">
              <Leaf size={12} /> Sustentabilidade & Biodiversidade
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-foreground leading-tight mb-4">
              Um dos santuários naturais mais ricos do planeta
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
              São Tomé e Príncipe é internacionalmente reconhecido pela sua biodiversidade.
              A Rotas do Éden apoia o turismo sustentável e a preservação ambiental — cada
              experiência reservada contribui para a proteção destes ecossistemas únicos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pillars.map(({ Icon, title, text }) => (
                <div
                  key={title}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-eden-tropical/40 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eden-tropical/15 to-primary/10 ring-1 ring-eden-tropical/20 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-eden-tropical" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5 leading-snug">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-primary" />
              <span>Compromisso Rotas do Éden — guias licenciados, trilhos responsáveis, comunidades locais beneficiadas.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
