import { useState } from "react";
import { Search, ChevronDown, Sparkles, ShieldCheck, MapPin } from "lucide-react";
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
    <section className="relative overflow-hidden min-h-[92vh] flex items-center">
      <HeroCarousel />

      <div className="container relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/25 text-primary-foreground text-[11px] sm:text-xs font-medium tracking-wide mb-6 border border-primary-foreground/20">
            <Sparkles size={12} className="text-secondary" />
            {t("hero.badge")}
          </div>

          <h1 className="font-display text-[2.5rem] md:text-6xl lg:text-[4.25rem] font-semibold text-primary-foreground leading-[1.08] tracking-[-0.02em] mb-6">
            {t("hero.title.1")}<br />
            <span className="text-secondary">
              {t("hero.title.2")}
            </span><br />
            {t("hero.title.3")}
          </h1>

          <p className="text-base md:text-lg text-primary-foreground/90 max-w-xl mx-auto mb-9 font-body leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <form
            onSubmit={submit}
            className="bg-card rounded-2xl shadow-[0_16px_40px_-24px_rgba(0,0,0,0.55)] border border-border/60 p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
          >
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/60">
              <Search size={18} className="text-primary" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("hero.searchPlaceholder")}
                className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="rounded-xl">
              {t("hero.searchCta")}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8 text-xs sm:text-sm text-primary-foreground/85 flex-wrap">
            <span className="px-3 py-1 rounded-full border border-primary-foreground/25">{t("hero.tag.dive")}</span>
            <span className="px-3 py-1 rounded-full border border-primary-foreground/25">{t("hero.tag.hike")}</span>
            <span className="px-3 py-1 rounded-full border border-primary-foreground/25">{t("hero.tag.food")}</span>
            <span className="px-3 py-1 rounded-full border border-primary-foreground/25">{t("hero.tag.history")}</span>
          </div>


          <div className="hidden md:flex items-center justify-center gap-8 mt-12 text-xs uppercase tracking-widest text-primary-foreground/85">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> KYC</span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> São Tomé · Príncipe</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> Eco · Local</span>
          </div>
        </div>

        <div className="flex justify-center mt-14">
          <ChevronDown size={24} className="text-primary-foreground/85 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
