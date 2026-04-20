import { Leaf, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Leaf size={18} className="text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg sm:text-xl text-foreground">Rotas do Éden</span>
        </Link>

        {/* Desktop nav */}
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

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Entrar</Button>
          <Button size="sm" variant="hero">Registar</Button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu size={22} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80%] max-w-sm flex flex-col">
            <SheetHeader>
              <SheetTitle className="font-display text-left">Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 mt-6">
              <SheetClose asChild>
                <Link to="/guides" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                  Guias
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <a href="/#como-funciona" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                  Como Funciona
                </a>
              </SheetClose>
              <SheetClose asChild>
                <a href="/#contacto" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                  Contacto
                </a>
              </SheetClose>
            </nav>
            <div className="mt-auto flex flex-col gap-2 pb-4">
              <Button variant="outline" className="w-full">Entrar</Button>
              <Button variant="hero" className="w-full">Registar</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
