import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function DescobreStpSection() {
  const { t } = useT();
  const highlights = [
    { key: "pico" },
    { key: "praias" },
    { key: "rocas" },
    { key: "sabores" },
    { key: "bio" },
    { key: "cacau" },
  ];

  return (
    <section className="section-space bg-background">
      <div className="container">
        <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-14 md:mb-20">
          <div className="lg:col-span-7">
            <span className="eyebrow mb-6">{t("descobre.eyebrow")}</span>
            <h2 className="display-lg text-foreground mt-5">{t("descobre.title")}</h2>
          </div>
          <div className="lg:col-span-5 lg:pb-2">
            <p className="body-copy">{t("descobre.lead")}</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-12 md:gap-y-16">
          {highlights.map((h, i) => (
            <Reveal
              key={h.key}
              delay={(i % 3) * 90}
              className={i === 0 || i === 3 ? "lg:col-span-5" : "lg:col-span-3"}
            >
              <article className="group">
                <div className="border-t border-border pt-6">
                  <span className="text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-2xl md:text-[1.7rem] font-normal text-foreground mt-2 mb-3 leading-tight">
                    {t(`descobre.${h.key}.title`)}
                  </h3>
                  <p className="text-[0.95rem] text-muted-foreground leading-[1.75] font-light">
                    {t(`descobre.${h.key}.text`)}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 md:mt-20 pt-10 border-t border-border">
          <Link
            to="/sobre-sao-tome"
            className="link-underline text-sm uppercase tracking-[0.16em] text-foreground hover:text-primary transition-colors"
          >
            {t("descobre.cta")} <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </section>
  );
}
