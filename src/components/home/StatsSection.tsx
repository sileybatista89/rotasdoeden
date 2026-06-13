import { Calendar, Globe2, Users } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

export function StatsSection() {
  const { t } = useT();
  const stats = [
    { icon: Users, value: t("stats.visitors.value"), label: t("stats.visitors.label"), sublabel: t("stats.visitors.sub") },
    { icon: Globe2, value: t("stats.pt.value"), label: t("stats.pt.label"), sublabel: t("stats.pt.sub") },
    { icon: Calendar, value: t("stats.stay.value"), label: t("stats.stay.label"), sublabel: t("stats.stay.sub") },
  ];

  return (
    <section className="py-14 md:py-16 bg-card border-y border-border/60">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl border border-border bg-background p-5 md:p-6 transition-all duration-300 hover:border-primary/35 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">{stat.value}</p>
                  <p className="font-semibold text-foreground text-sm mt-2">{stat.label}</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-snug">{stat.sublabel}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-accent ring-1 ring-primary/15 flex items-center justify-center shrink-0 transition-transform group-hover:-translate-y-0.5">
                  <stat.icon size={20} className="text-primary" />
                </div>
              </div>
              <div className="mt-5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${82 - i * 12}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
