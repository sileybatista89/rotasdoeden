import { Users, Plane, Calendar } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

export function StatsSection() {
  const { t } = useT();
  const stats = [
    { icon: Users, value: t("stats.visitors.value"), label: t("stats.visitors.label"), sublabel: t("stats.visitors.sub") },
    { icon: Plane, value: t("stats.pt.value"), label: t("stats.pt.label"), sublabel: t("stats.pt.sub") },
    { icon: Calendar, value: t("stats.stay.value"), label: t("stats.stay.label"), sublabel: t("stats.stay.sub") },
  ];

  return (
    <section className="py-16 bg-card border-y border-border/60">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary/10 ring-1 ring-primary/15 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:-translate-y-0.5">
                <stat.icon size={22} className="text-primary" />
              </div>
              <p className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">{stat.value}</p>
              <p className="font-semibold text-foreground text-sm mt-1.5">{stat.label}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
