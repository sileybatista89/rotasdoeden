import { Link } from "react-router-dom";
import { useT } from "@/i18n/LanguageProvider";
import picoImg from "@/assets/praias/pico-cao-grande.jpg";
import praiaImg from "@/assets/praias/praia-jale.jpg";
import rocaImg from "@/assets/stp/roca.jpg";
import calulu from "@/assets/stp/calulu.jpg";
import bio from "@/assets/stp/biodiversidade.jpg";
import cacau from "@/assets/stp/cacau.jpg";

export function DescobreStpSection() {
  const { t } = useT();
  const highlights = [
    { img: picoImg, key: "pico" },
    { img: praiaImg, key: "praias" },
    { img: rocaImg, key: "rocas" },
    { img: calulu, key: "sabores" },
    { img: bio, key: "bio" },
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
