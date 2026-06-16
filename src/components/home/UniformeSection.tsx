import { ShieldCheck, BadgeCheck, QrCode } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

export function UniformeSection() {
  const { t } = useT();
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-3xl mx-auto text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
          {t("uniforme.eyebrow")}
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          {t("uniforme.title")}
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
          {t("uniforme.lead")}
        </p>

        <ul className="space-y-4 text-left">
          <li className="flex gap-3">
            <ShieldCheck size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{t("uniforme.item1.title")}</p>
              <p className="text-sm text-muted-foreground">{t("uniforme.item1.text")}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <BadgeCheck size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{t("uniforme.item2.title")}</p>
              <p className="text-sm text-muted-foreground">{t("uniforme.item2.text")}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <QrCode size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{t("uniforme.item3.title")}</p>
              <p className="text-sm text-muted-foreground">{t("uniforme.item3.text")}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

