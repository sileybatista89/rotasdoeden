import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";
import picoImg from "@/assets/real/pico-cao-grande.jpg.asset.json";
import praiaImg from "@/assets/real/praia-palmeiras.jpg.asset.json";
import rocaImg from "@/assets/real/roca-casa-grande.jpg.asset.json";
import calulu from "@/assets/real/calulu-real.jpg.asset.json";
import bio from "@/assets/real/costa-floresta.jpg.asset.json";
import cacau from "@/assets/real/cacau-real.jpg.asset.json";

export function DescobreStpSection() {
  const { t } = useT();
  const highlights = [
    { img: picoImg.url, key: "pico", ratio: "aspect-[4/5]" },
    { img: praiaImg.url, key: "praias", ratio: "aspect-[4/5]" },
    { img: rocaImg.url, key: "rocas", ratio: "aspect-[4/5]" },
    { img: calulu.url, key: "sabores", ratio: "aspect-[4/5]" },
    { img: bio.url, key: "bio", ratio: "aspect-[4/5]" },
    { img: cacau.url, key: "cacau", ratio: "aspect-[4/5]" },
  ];

  return (
    <section className="py-20 md:py-32 bg-background">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 md:gap-y-16">
          {highlights.map((h, i) => (
            <Reveal
              key={h.key}
              delay={(i % 3) * 90}
              className={i % 3 === 1 ? "lg:mt-10" : i % 3 === 2 ? "lg:mt-4" : ""}
            >
              <article className="group">
                <div className={`${h.ratio} overflow-hidden rounded-md bg-muted`}>
                  <img
                    src={h.img}
                    alt={t(`descobre.${h.key}.title`)}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={800}
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  />
                </div>
                <div className="pt-6">
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
