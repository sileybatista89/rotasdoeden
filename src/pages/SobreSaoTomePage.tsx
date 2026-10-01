import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Plane, Languages, Coins, Sun, AlertTriangle } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import heroImg from "@/assets/real/bom-bom.jpg";

export default function SobreSaoTomePage() {
  const { t } = useT();
  const facts = [
    { icon: MapPin, label: t("sobre.facts.location"), value: t("sobre.facts.locationValue") },
    { icon: Sun, label: t("sobre.facts.climate"), value: t("sobre.facts.climateValue") },
    { icon: Calendar, label: t("sobre.facts.when"), value: t("sobre.facts.whenValue") },
    { icon: Plane, label: t("sobre.facts.howToGet"), value: t("sobre.facts.howToGetValue") },
    { icon: Languages, label: t("sobre.facts.language"), value: t("sobre.facts.languageValue") },
    { icon: Coins, label: t("sobre.facts.currency"), value: t("sobre.facts.currencyValue") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Sobre São Tomé e Príncipe | Rotas do Éden"
        description="Guia essencial sobre São Tomé e Príncipe: história, geografia, cultura, gastronomia, biodiversidade e dicas práticas para viajar."
        path="/sobre-sao-tome"
      />
      <Navbar />

      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-foreground/55" />
        </div>
        <div className="container relative py-24 md:py-36">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
            {t("sobre.eyebrow")}
          </span>
          <h1 className="max-w-3xl font-display text-5xl font-normal leading-none text-primary-foreground md:text-7xl">
            {t("sobre.title")}
          </h1>
          <p className="text-primary-foreground/90 text-base md:text-lg max-w-2xl mt-5 leading-relaxed drop-shadow">
            {t("sobre.lead")}
          </p>
        </div>
      </header>

      <main className="container py-12 md:py-16 flex-1">
        {/* Factos rápidos */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {facts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="border-t border-border py-5">
                <Icon size={18} className="text-primary mb-2" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                <p className="text-sm font-medium text-foreground leading-snug">{f.value}</p>
              </div>
            );
          })}
        </section>

        <div className="grid gap-16 md:grid-cols-[1fr_280px]">
          <article className="prose prose-stone max-w-none">
            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{t("sobre.history.title")}</h2>
              <p className="text-foreground/85 leading-relaxed">{t("sobre.history.text")}</p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{t("sobre.geo.title")}</h2>
              <p className="text-foreground/85 leading-relaxed">{t("sobre.geo.text")}</p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{t("sobre.culture.title")}</h2>
              <p className="text-foreground/85 leading-relaxed">{t("sobre.culture.text")}</p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{t("sobre.nature.title")}</h2>
              <p className="text-foreground/85 leading-relaxed">{t("sobre.nature.text")}</p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{t("sobre.when.title")}</h2>
              <p className="text-foreground/85 leading-relaxed">{t("sobre.when.text")}</p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{t("sobre.tips.title")}</h2>

              {/* Taxa turística destaque */}
              <div className="mb-5 flex gap-4 border-l-2 border-secondary bg-secondary/10 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-secondary-foreground">
                  <AlertTriangle size={20} className="text-secondary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base text-foreground mb-1">{t("sobre.tips.tax.title")}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{t("sobre.tips.tax.text")}</p>
                </div>
              </div>

              <ul className="space-y-2 text-foreground/85 leading-relaxed list-disc pl-5">
                <li>{t("sobre.tips.list.1")}</li>
                <li>{t("sobre.tips.list.2")}</li>
                <li>{t("sobre.tips.list.3")}</li>
                <li>{t("sobre.tips.list.4")}</li>
                <li>{t("sobre.tips.list.5")}</li>
              </ul>
            </section>
          </article>

          <aside className="md:sticky md:top-24 h-fit">
            <div className="border-t-2 border-primary bg-primary/5 p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{t("sobre.sidebar.title")}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t("sobre.sidebar.text")}</p>
              <Link
                to="/experiences"
                className="block bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("sobre.sidebar.cta1")}
              </Link>
              <Link
                to="/guides"
                className="mt-2 block border border-border px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-muted"
              >
                {t("sobre.sidebar.cta2")}
              </Link>
            </div>
          </aside>
        </div>

        {/* Parceiros, secção discreta */}
        <section className="mt-20 md:mt-24 border-t border-border pt-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div className="max-w-xl">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Rede Rotas do Éden
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Onde ficar, onde comer, com quem explorar
              </h2>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                Hotéis, restaurantes e operadores locais que compõem o ecossistema turístico recomendado pela Rotas do Éden.
              </p>
            </div>
            <Link
              to="/parceiros"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
            >
              Ver rede de parceiros →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Hotéis", "Operadores", "Restaurantes", "Empresas locais"].map((label) => (
              <div
                key={label}
                className="border-t border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground"
              >
                {label}
                <span className="block text-[10px] uppercase tracking-wider mt-1 text-primary/70">rede parceira</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
