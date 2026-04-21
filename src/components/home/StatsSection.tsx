import { Users, Plane, Calendar } from "lucide-react";

const stats = [
  { icon: Users, value: "52.000+", label: "Visitantes em 2025", sublabel: "Novo recorde histórico" },
  { icon: Plane, value: "54%", label: "Portugueses", sublabel: "Principal mercado emissor" },
  { icon: Calendar, value: "18 dias", label: "Estadia média", sublabel: "Tempo para explorar" },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
                <stat.icon size={22} className="text-primary" />
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="font-semibold text-foreground text-sm mt-1">{stat.label}</p>
              <p className="text-muted-foreground text-xs">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
