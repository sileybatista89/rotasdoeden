import { Search, SlidersHorizontal, Compass, Luggage } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export function HowItWorks() {
  const steps = [
    { icon: Search, title: "Descobrir", description: "Conheça as ilhas, os seus ritmos e as possibilidades de cada rota." },
    { icon: Compass, title: "Escolher", description: "Comece pelo pacote que melhor acompanha o seu tempo de viagem." },
    { icon: SlidersHorizontal, title: "Personalizar", description: "Ajuste os dias, os viajantes e as experiências que quer viver." },
    { icon: Luggage, title: "Viajar", description: "Receba uma proposta confirmada antes de tomar qualquer decisão." },
  ];

  return (
    <section id="como-funciona" className="section-space bg-background">
      <div className="container">
        <Reveal className="max-w-2xl mb-14 md:mb-20">
          <span className="eyebrow mb-6">Da ideia à viagem</span>
          <h2 className="display-md mt-5">Quatro passos. Sem ruído.</h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 md:gap-10">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 110} className="border-t border-foreground/15 pt-7">
              <step.icon size={22} className="text-primary mb-6" strokeWidth={1.5} />
              <h3 className="font-display text-2xl font-normal text-foreground mb-3 leading-tight">
                {step.title}
              </h3>
              <p className="text-[0.95rem] text-muted-foreground leading-[1.8] font-light">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
