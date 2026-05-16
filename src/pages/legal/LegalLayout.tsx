import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { legalNav, type LegalPage } from "@/data/legalContent";
import { ChevronRight, FileText } from "lucide-react";

interface LegalLayoutProps {
  page: LegalPage;
}

export function LegalLayout({ page }: LegalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${page.title} | Rotas do Éden`}
        description={page.intro.slice(0, 155)}
        path={`/legal/${page.slug}`}
      />
      <Navbar />

      {/* Hero band */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b border-border">
        <div className="container py-10 md:py-14">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
            <ChevronRight size={12} />
            <span className="text-foreground">Legal</span>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium">{page.title}</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/15 text-primary items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-[32px] font-bold text-foreground mb-3">
                {page.title}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base md:text-lg leading-relaxed">{page.intro}</p>
              <p className="text-xs text-muted-foreground/80 mt-3">
                Última actualização: <span className="font-medium text-foreground/80">{page.updated}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-10 md:py-14 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
          {/* Sidebar nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Políticas
                </h3>
                <ul className="space-y-1">
                  {legalNav.map((item) => {
                    const active = item.slug === page.slug;
                    return (
                      <li key={item.slug}>
                        <Link
                          to={`/legal/${item.slug}`}
                          className={`block px-3 py-2 rounded-lg text-[13px] transition-colors ${
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {page.sections.length > 1 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Nesta página
                  </h3>
                  <ul className="space-y-1 border-l border-border">
                    {page.sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block pl-3 -ml-px py-1.5 text-[13px] text-muted-foreground hover:text-foreground border-l border-transparent hover:border-primary transition-colors"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* Content */}
          <article className="max-w-[720px] lg:pl-2">
            <div className="space-y-12">
              {page.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="font-display text-xl md:text-[22px] font-bold text-foreground mb-5 pb-3 border-b border-border">
                    {section.title}
                  </h2>
                  <div className="space-y-5 text-foreground/85 leading-[1.7]">
                    {section.blocks.map((block, i) => {
                      if (block.type === "p")
                        return <p key={i} className="text-base md:text-[17px]">{block.text}</p>;
                      if (block.type === "h3")
                        return (
                          <h3 key={i} className="font-display text-lg font-semibold text-foreground mt-6">
                            {block.text}
                          </h3>
                        );
                      return (
                        <ul key={i} className="space-y-2.5 list-disc pl-5 text-base md:text-[17px] marker:text-primary">
                          {block.items.map((it, j) => (
                            <li key={j}>{it}</li>
                          ))}
                        </ul>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-xl bg-muted/40 border border-border text-base text-muted-foreground leading-relaxed">
              Para questões relativas a esta política, contacte-nos em{" "}
              <a href="mailto:info@rotasdoeden.com" className="text-primary font-medium hover:underline">
                info@rotasdoeden.com
              </a>
              .
            </div>

            {/* Mobile nav */}
            <div className="lg:hidden mt-10 p-5 rounded-xl border border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Outras políticas
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {legalNav
                  .filter((i) => i.slug !== page.slug)
                  .map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={`/legal/${item.slug}`}
                        className="block px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
