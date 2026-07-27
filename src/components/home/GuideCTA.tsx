import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function GuideCTA() {
  const { t } = useT();
  return (
    <section className="py-24 md:py-32 bg-eden-ink">
      <div className="container">
        <Reveal className="max-w-3xl">
          <span className="eyebrow eyebrow-center mb-6 text-secondary">Rotas do Éden</span>
          <h2 className="display-lg text-primary-foreground mt-5 mb-6">
            {t("guideCta.title")}
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mb-10 text-base md:text-lg leading-[1.8] font-light">
            {t("guideCta.text")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="sand" size="lg">
              <Link to="/auth?mode=register&role=guide&next=/kyc">
                {t("guideCta.primary")} <ArrowRight size={16} strokeWidth={1.75} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground hover:text-eden-ink hover:border-primary-foreground"
            >
              <Link to="/guia-parceiro">{t("guideCta.secondary")}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
