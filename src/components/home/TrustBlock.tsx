import { ShieldCheck, BadgeCheck, Users } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

export function TrustBlock() {
  const { t } = useT();
  const pillars = [
    { icon: ShieldCheck, title: t("trust.p1.title"), text: t("trust.p1.text") },
    { icon: BadgeCheck, title: t("trust.p2.title"), text: t("trust.p2.text") },
    { icon: Users, title: t("trust.p3.title"), text: t("trust.p3.text") },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-card via-card to-muted/40 border-y border-border/60">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">{t("trust.eyebrow")}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {t("trust.title")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="group bg-background border border-border/70 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mb-5">
                <p.icon size={20} className="text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
