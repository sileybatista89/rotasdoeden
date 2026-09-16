import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function GuidesComingSoon() {
  const { t } = useT();
  return (
    <section className="section-space border-y border-border bg-accent/35">
      <div className="container">
        <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end">
          <div className="lg:col-span-7">
             <span className="eyebrow mb-6">Quem conhece o caminho</span>
             <h2 className="display-lg text-foreground mt-5 mb-6">As ilhas, contadas por quem as vive.</h2>
             <p className="body-copy max-w-xl">{t("coming.text")}</p>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/guides">
                Conhecer os guias <ArrowRight size={16} strokeWidth={1.75} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/seja-parceiro#processo">{t("coming.more")}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
