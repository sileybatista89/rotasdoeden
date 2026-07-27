import { Search, CreditCard, Compass } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function HowItWorks() {
  const { t } = useT();
  const steps = [
    { icon: Search, title: t("how.s1.title"), description: t("how.s1.text") },
    { icon: CreditCard, title: t("how.s2.title"), description: t("how.s2.text") },
    { icon: Compass, title: t("how.s3.title"), description: t("how.s3.text") },
  ];

  return (
    <section id="como-funciona" className="py-20 md:py-32 bg-accent/40">
      <div className="container">
        <Reveal className="max-w-2xl mb-14 md:mb-20">
          <span className="eyebrow mb-6">{t("how.title")}</span>
          <p className="lead mt-6">{t("how.subtitle")}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 110} className="border-t border-foreground/15 pt-7">
              <step.icon size={22} className="text-primary mb-6" strokeWidth={1.5} />
              <h3 className="font-display text-2xl font-normal text-foreground mb-3 leading-tight">
                {step.title}
              </h3>
              <p className="text-[0.95rem] text-muted-foreground leading-[1.8] font-light">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
