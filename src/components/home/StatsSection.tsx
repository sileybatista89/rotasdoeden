import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function StatsSection() {
  const { t } = useT();
  const stats = [
    { value: t("stats.visitors.value"), label: t("stats.visitors.label"), sublabel: t("stats.visitors.sub") },
    { value: t("stats.pt.value"), label: t("stats.pt.label"), sublabel: t("stats.pt.sub") },
  ];

  return (
    <section className="bg-card border-b border-border">
      <div className="container py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {stats.map((stat, i) => (
            <Reveal
              key={i}
              delay={i * 110}
              className="py-8 md:py-0 md:px-10 first:md:pl-0 last:md:pr-0 border-b md:border-b-0 md:border-r border-border last:border-0 first:pt-0 last:pb-0"
            >
              <p className="font-display text-5xl md:text-6xl font-light text-foreground leading-none tracking-tight">
                {stat.value}
              </p>
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-primary font-semibold mt-5">
                {stat.label}
              </p>
              <p className="text-[0.92rem] text-muted-foreground mt-2 leading-relaxed font-light max-w-xs">
                {stat.sublabel}
              </p>
            </Reveal>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-10">{t("stats.source")}</p>
      </div>
    </section>
  );
}
