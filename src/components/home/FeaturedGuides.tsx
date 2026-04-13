import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GuideCard } from "@/components/guides/GuideCard";
import { mockGuides } from "@/data/mockData";

export function FeaturedGuides() {
  const featured = mockGuides.slice(0, 6);

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Guias em Destaque
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Os guias mais bem avaliados de São Tomé e Príncipe, prontos para te mostrar o paraíso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {featured.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>

        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/guides">Ver Todos os Guias →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
