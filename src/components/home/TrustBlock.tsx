import { ShieldCheck, BadgeCheck, Users } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Verificação manual",
    text: "Cada guia é avaliado individualmente pela nossa equipa antes de ser activado na plataforma.",
  },
  {
    icon: BadgeCheck,
    title: "Licença DGTH validada",
    text: "Trabalhamos apenas com guias com licença reconhecida pela autoridade turística de São Tomé e Príncipe.",
  },
  {
    icon: Users,
    title: "Experiências locais autênticas",
    text: "Sem intermediários estrangeiros. Cada euro pago beneficia directamente comunidades locais.",
  },
];

export function TrustBlock() {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Confiança</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Uma plataforma construída com critério
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="bg-background border border-border rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <p.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1.5">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
