import { Leaf, Globe2, Bird, TreePine, Waves, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import obo from "@/assets/real/costa-floresta.jpg.asset.json";


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
    <section className="section-space bg-accent/40">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Visual */}
          <Reveal className="relative order-2 lg:order-1 lg:col-span-5">
            <div className="aspect-[4/5] overflow-hidden bg-muted">
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
            <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-foreground/15 pt-4">
              <p className="font-display text-lg text-foreground leading-snug">Reserva Mundial da Biosfera</p>
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground shrink-0">Príncipe · 2012</p>
            </div>
          </Reveal>

          {/* Content */}
          <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <span className="eyebrow mb-6">
                <Leaf size={13} strokeWidth={1.75} className="ml-1" /> Sustentabilidade & Biodiversidade
              </span>
              <h2 className="display-lg text-foreground mt-5 mb-6">
                Um dos santuários naturais mais ricos do planeta
              </h2>
              <p className="body-copy mb-10">
                São Tomé e Príncipe é internacionalmente reconhecido pela sua biodiversidade.
                A Rotas do Éden apoia o turismo sustentável e a preservação ambiental — cada
                experiência reservada contribui para a proteção destes ecossistemas únicos.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {pillars.map(({ Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 2) * 90} className="border-t border-foreground/15 pt-5">
                  <Icon size={18} className="text-primary mb-4" strokeWidth={1.5} />
                  <h3 className="font-display text-xl text-foreground mb-2 leading-snug">{title}</h3>
                  <p className="text-[0.9rem] text-muted-foreground leading-[1.8] font-light">{text}</p>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 flex items-start gap-3 text-[0.85rem] text-muted-foreground font-light">
              <ShieldCheck size={15} className="text-primary shrink-0 mt-1" strokeWidth={1.5} />
              <span>Compromisso Rotas do Éden — guias licenciados, trilhos responsáveis, comunidades locais beneficiadas.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

