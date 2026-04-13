import { Search, CreditCard, Compass } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Encontra o teu guia",
    description: "Pesquisa por especialidade, língua ou localização. Todos os guias são verificados e licenciados.",
  },
  {
    icon: CreditCard,
    title: "Reserva online",
    description: "Escolhe o serviço, a data e paga com segurança. O dinheiro fica retido até à conclusão.",
  },
  {
    icon: Compass,
    title: "Vive a experiência",
    description: "Desfruta de uma experiência autêntica e avalia o teu guia para ajudar futuros visitantes.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 bg-muted/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Como Funciona
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Em três passos simples, tens a tua aventura garantida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon size={28} className="text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center md:right-auto md:left-1/2 md:ml-6 md:-top-1">
                {i + 1}
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
