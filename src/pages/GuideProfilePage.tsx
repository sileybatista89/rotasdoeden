import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

export default function GuideProfilePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="container max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full mb-5">
            <Sparkles size={12} /> Em adesão
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perfil ainda não disponível
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Os primeiros guias parceiros da Rotas do Éden estão em processo de verificação.
            Os perfis individuais ficarão visíveis assim que a equipa concluir as validações.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="hero">
              <Link to="/guides">
                <ArrowLeft size={16} /> Ver página de guias
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/seja-parceiro">Tornar-me guia parceiro</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
