import { Users, Calendar, DollarSign, Star } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  delta: string;
  icon: typeof Users;
}

interface Props {
  stats: Stat[];
}

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                <Icon size={16} className="text-primary" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-primary mt-1">{s.delta}</p>
          </div>
        );
      })}
    </div>
  );
}

export const defaultStats: Stat[] = [
  { label: "Guias activos", value: "6", delta: "+2 este mês", icon: Users },
  { label: "Reservas pendentes", value: "3", delta: "Requer atenção", icon: Calendar },
  { label: "Receita (Abr)", value: "€13.2k", delta: "+34% vs Mar", icon: DollarSign },
  { label: "Rating médio", value: "4.86", delta: "Estável", icon: Star },
];
