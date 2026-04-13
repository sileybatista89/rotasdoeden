import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Leaf size={18} className="text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Rotas do Éden</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/guides" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Guias
          </Link>
          <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Como Funciona
          </a>
          <a href="#contacto" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Contacto
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">Entrar</Button>
          <Button size="sm" variant="hero">Registar</Button>
        </div>
      </div>
    </header>
  );
}
