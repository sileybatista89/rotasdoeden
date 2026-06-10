import { ShieldCheck, BadgeCheck, QrCode } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import uniformeImg from "@/assets/guias/uniforme-oficial.jpg";

export function UniformeSection() {
  const { t } = useT();
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-border">
              <img
                src={uniformeImg}
                alt={t("uniforme.alt")}
                loading="lazy"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2">
              <BadgeCheck size={20} />
              <span className="text-sm font-semibold">{t("uniforme.badge")}</span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              {t("uniforme.eyebrow")}
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("uniforme.title")}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
              {t("uniforme.lead")}
            </p>

            <ul className="space-y-4">
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
        </div>
      </div>
    </section>
  );
}
