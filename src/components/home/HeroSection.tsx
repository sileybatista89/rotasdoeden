import { useState } from "react";
import { Search, ChevronDown, Sparkles, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { useT } from "@/i18n/LanguageProvider";

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
      <div className="absolute inset-0">
        <img src={heroBg} alt="Pico Cão Grande, São Tomé e Príncipe" className="w-full h-full object-cover scale-105" width={1920} height={1080} fetchPriority="high" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/35 to-foreground/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(153_42%_25%_/_0.35),_transparent_55%)]" />
      </div>

      <div className="container relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-md text-primary-foreground text-xs sm:text-sm font-medium mb-6 border border-primary-foreground/25 shadow-lg">
            <Sparkles size={13} className="text-secondary" />
            {t("hero.badge")}
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.05] mb-6 drop-shadow-2xl">
            {t("hero.title.1")}<br />
            <span className="bg-gradient-to-r from-secondary via-amber-300 to-secondary bg-clip-text text-transparent">
              {t("hero.title.2")}
            </span><br />
            {t("hero.title.3")}
          </h1>

          <p className="text-base md:text-xl text-primary-foreground/90 max-w-xl mx-auto mb-10 font-body drop-shadow-md leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <form
            onSubmit={submit}
            className="bg-card/95 backdrop-blur-md rounded-2xl shadow-[0_25px_60px_-20px_rgba(0,0,0,0.5)] border border-border/50 p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
          >
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/70">
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

          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-8 text-xs sm:text-sm text-primary-foreground/80 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15">{t("hero.tag.dive")}</span>
            <span className="px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15">{t("hero.tag.hike")}</span>
            <span className="px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15">{t("hero.tag.food")}</span>
            <span className="px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15">{t("hero.tag.history")}</span>
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
