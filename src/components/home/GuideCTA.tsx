import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

export function GuideCTA() {
  const { t } = useT();
  return (
    <section className="py-24 bg-gradient-to-br from-primary via-primary to-eden-green-dark relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full bg-primary-foreground/10 blur-3xl" />
      </div>
      <div className="container relative text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-5 tracking-tight">
          {t("guideCta.title")}
        </h2>
        <p className="text-primary-foreground/85 max-w-xl mx-auto mb-9 text-base md:text-lg leading-relaxed">
          {t("guideCta.text")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="sand" size="lg" className="rounded-full px-8 shadow-lg shadow-secondary/30">
            <Link to="/auth?mode=register&role=guide&next=/kyc">
              {t("guideCta.primary")} <ArrowRight size={18} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8 bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link to="/seja-parceiro">{t("guideCta.secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
