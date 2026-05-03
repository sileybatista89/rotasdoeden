import { Search, CreditCard, Compass } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

export function HowItWorks() {
  const { t } = useT();
  const steps = [
    { icon: Search, title: t("how.s1.title"), description: t("how.s1.text") },
    { icon: CreditCard, title: t("how.s2.title"), description: t("how.s2.text") },
    { icon: Compass, title: t("how.s3.title"), description: t("how.s3.text") },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-muted/40">
      <div className="container">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
            {t("how.title")}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("how.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative bg-card border border-border/70 rounded-3xl p-7 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center shadow-md ring-4 ring-card">
                {i + 1}
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center mx-auto mb-5 mt-2">
                <step.icon size={26} className="text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
