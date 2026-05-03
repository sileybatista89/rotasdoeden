import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LanguageProvider";

export function GuidesComingSoon() {
  const { t } = useT();
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.06),_transparent_60%)]" />
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full mb-5 ring-1 ring-primary/20">
            <Sparkles size={12} /> {t("coming.eyebrow")}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
            {t("coming.title")}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            {t("coming.text")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="hero" size="lg" className="rounded-full px-7">
              <Link to="/seja-parceiro">
                {t("coming.cta")} <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-7">
              <Link to="/seja-parceiro#processo">{t("coming.more")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
