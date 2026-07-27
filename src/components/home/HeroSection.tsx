import { useState } from "react";
import { Search, ShieldCheck, MapPin, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useT } from "@/i18n/LanguageProvider";
import { HeroCarousel } from "./HeroCarousel";

export function HeroSection() {
  const navigate = useNavigate();
  const { t } = useT();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = q.trim() ? `/experiences?q=${encodeURIComponent(q.trim())}` : "/experiences";
    navigate(target);
  }

  return (
    <section className="relative overflow-hidden min-h-[88vh] flex items-end">
      <HeroCarousel />

      <div className="container relative pt-28 pb-16 md:pt-40 md:pb-24">
        <div className="max-w-3xl">
          <p className="text-[0.68rem] md:text-xs uppercase tracking-[0.34em] text-primary-foreground/80 mb-6 md:mb-8 flex items-center gap-4">
            <span className="hidden sm:block w-10 h-px bg-primary-foreground/50" />
            {t("hero.badge")}
          </p>

          <h1 className="display-xl text-primary-foreground mb-7 md:mb-8">
            {t("hero.title.1")}{" "}
            <em className="not-italic font-normal text-secondary">{t("hero.title.2")}</em>
            <br />
            {t("hero.title.3")}
          </h1>

          <p className="text-base md:text-[1.15rem] text-primary-foreground/90 max-w-lg font-light leading-[1.75] mb-9 md:mb-11">
            {t("hero.subtitle")}
          </p>

          <form
            onSubmit={submit}
            className="bg-card/97 rounded-full border border-border/70 p-1.5 pl-6 flex flex-col sm:flex-row gap-2 sm:items-center max-w-xl shadow-soft"
          >
            <div className="flex-1 flex items-center gap-3 py-2.5 sm:py-0">
              <Search size={17} className="text-primary shrink-0" strokeWidth={1.75} />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("hero.searchPlaceholder")}
                className="bg-transparent text-[0.95rem] flex-1 outline-none text-foreground placeholder:text-muted-foreground/80"
              />
            </div>
            <Button type="submit" variant="hero" size="default" className="px-8 shrink-0">
              {t("hero.searchCta")}
            </Button>
          </form>

          <div className="flex items-center gap-x-6 gap-y-2 mt-8 text-xs sm:text-[0.8rem] text-primary-foreground/80 flex-wrap font-light">
            <span>{t("hero.tag.dive")}</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/40" />
            <span>{t("hero.tag.hike")}</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/40" />
            <span>{t("hero.tag.food")}</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/40" />
            <span>{t("hero.tag.history")}</span>
          </div>

          <div className="hidden md:flex items-center gap-10 mt-12 pt-8 border-t border-primary-foreground/15 text-[0.7rem] uppercase tracking-[0.2em] text-primary-foreground/75">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} strokeWidth={1.75} /> Guias licenciados</span>
            <span className="inline-flex items-center gap-2"><MapPin size={14} strokeWidth={1.75} /> São Tomé · Príncipe</span>
            <span className="inline-flex items-center gap-2"><Leaf size={14} strokeWidth={1.75} /> Turismo responsável</span>
          </div>
        </div>
      </div>
    </section>
  );
}
