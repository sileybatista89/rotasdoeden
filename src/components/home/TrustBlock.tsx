import { ShieldCheck, BadgeCheck, Users } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function TrustBlock() {
  const { t } = useT();
  const pillars = [
    { icon: ShieldCheck, title: t("trust.p1.title"), text: t("trust.p1.text") },
    { icon: BadgeCheck, title: t("trust.p2.title"), text: t("trust.p2.text") },
    { icon: Users, title: t("trust.p3.title"), text: t("trust.p3.text") },
  ];

  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="container">
        <Reveal className="max-w-2xl mb-14">
          <span className="eyebrow mb-6">{t("trust.eyebrow")}</span>
          <h2 className="display-md text-foreground mt-5">{t("trust.title")}</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 100} className="flex gap-5">
              <p.icon size={20} className="text-primary shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <h3 className="font-display text-xl text-foreground mb-2 leading-snug">{p.title}</h3>
                <p className="text-[0.93rem] text-muted-foreground leading-[1.8] font-light">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
