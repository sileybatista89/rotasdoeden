import { Link } from "react-router-dom";
import { useT } from "@/i18n/LanguageProvider";
import picoImg from "@/assets/real/ilhas-tinhosas.jpg.asset.json";
import praiaImg from "@/assets/real/praia-banana.webp.asset.json";
import rocaImg from "@/assets/real/santana.jpg.asset.json";
import calulu from "@/assets/optimized/calulu-card.webp";
import bio from "@/assets/real/estrada-norte.webp.asset.json";
import cacau from "@/assets/optimized/cacau-card.webp";

export function DescobreStpSection() {
  const { t } = useT();
  const highlights = [
    { img: typeof picoImg === "string" ? picoImg : picoImg.url, key: "pico" },
    { img: typeof praiaImg === "string" ? praiaImg : praiaImg.url, key: "praias" },
    { img: typeof rocaImg === "string" ? rocaImg : rocaImg.url, key: "rocas" },
    { img: calulu, key: "sabores" },
    { img: typeof bio === "string" ? bio : bio.url, key: "bio" },
    { img: cacau, key: "cacau" },
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        <div className="max-w-2xl mb-10 md:mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            {t("descobre.eyebrow")}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("descobre.title")}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t("descobre.lead")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {highlights.map((h) => (
            <article
              key={h.key}
              className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={h.img}
                  alt={t(`descobre.${h.key}.title`)}
                  loading="lazy"
                  width={640}
                  height={400}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{t(`descobre.${h.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`descobre.${h.key}.text`)}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/sobre-sao-tome"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t("descobre.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
