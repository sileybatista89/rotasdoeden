import { Users, Calendar, DollarSign, Star } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  delta: string;
  icon: typeof Users;
  tone?: "primary" | "secondary" | "ocean" | "muted";
}

interface Props {
  stats: Stat[];
}

const toneMap = {
  primary: "from-primary/15 via-card to-card text-primary",
  secondary: "from-secondary/20 via-card to-card text-secondary-foreground",
  ocean: "from-eden-ocean/15 via-card to-card text-eden-ocean",
  muted: "from-muted via-card to-card text-foreground",
} as const;

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = s.icon;
        const tone = s.tone ?? (["primary", "secondary", "ocean", "muted"][i % 4] as keyof typeof toneMap);
        return (
          <div
            key={s.label}
            className={`relative overflow-hidden bg-gradient-to-br ${toneMap[tone]} border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.14em]">{s.label}</span>
              <div className="w-10 h-10 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center shadow-sm">
                <Icon size={18} />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.delta}</p>
          </div>
        );
      })}
    </div>
  );
}

export const defaultStats: Stat[] = [
  { label: "Guias activos", value: "6", delta: "+2 este mês", icon: Users, tone: "primary" },
  { label: "Reservas pendentes", value: "3", delta: "Requer atenção", icon: Calendar, tone: "secondary" },
  { label: "Receita (Abr)", value: "€13.2k", delta: "+34% vs Mar", icon: DollarSign, tone: "ocean" },
  { label: "Rating médio", value: "4.86", delta: "Estável", icon: Star, tone: "muted" },
];
