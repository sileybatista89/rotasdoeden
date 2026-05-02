import { Leaf, Menu, LogOut, ShieldCheck, MessageSquare, LayoutDashboard, User as UserIcon, Briefcase, Calendar } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email?.charAt(0).toUpperCase() ?? "?";

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
          <Link to="/experiences" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Experiências
          </Link>
          <Link to="/guides" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Guias
          </Link>
          <a href="/#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Como Funciona
          </a>
          <a href="/#contacto" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Contacto
          </a>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {!user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Entrar</Button>
              <Button size="sm" variant="hero" onClick={() => navigate("/auth")}>Registar</Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center hover:opacity-90 transition-opacity">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs">
                  {user.email}
                  <span className="block text-[10px] text-muted-foreground capitalize mt-0.5">{role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                  <Calendar size={14} className="mr-2" /> {role === "guide" ? "Reservas recebidas" : "As minhas reservas"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/messages")}>
                  <MessageSquare size={14} className="mr-2" /> Mensagens
                </DropdownMenuItem>
                {role === "guide" && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/my-services")}>
                      <Briefcase size={14} className="mr-2" /> Os meus serviços
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/kyc")}>
                      <ShieldCheck size={14} className="mr-2" /> KYC
                    </DropdownMenuItem>
                  </>
                )}
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <LayoutDashboard size={14} className="mr-2" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut().then(() => navigate("/"))}>
                  <LogOut size={14} className="mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                <Link to="/experiences" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                  Experiências
                </Link>
              </SheetClose>
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
              {user && <>
                <SheetClose asChild>
                  <Link to="/my-bookings" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                    <Calendar size={16} /> {role === "guide" ? "Reservas recebidas" : "As minhas reservas"}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/messages" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                    <MessageSquare size={16} /> Mensagens
                  </Link>
                </SheetClose>
                {role === "guide" && <>
                  <SheetClose asChild>
                    <Link to="/my-services" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                      <Briefcase size={16} /> Os meus serviços
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/kyc" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                      <ShieldCheck size={16} /> KYC
                    </Link>
                  </SheetClose>
                </>}
                {role === "admin" && <SheetClose asChild>
                  <Link to="/admin" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                    <LayoutDashboard size={16} /> Admin
                  </Link>
                </SheetClose>}
              </>}
            </nav>
            <div className="mt-auto flex flex-col gap-2 pb-4">
              {!user ? <>
                <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate("/auth"); }}>Entrar</Button>
                <Button variant="hero" className="w-full" onClick={() => { setOpen(false); navigate("/auth"); }}>Registar</Button>
              </> : <>
                <div className="flex items-center gap-2 px-3 text-sm text-muted-foreground">
                  <UserIcon size={14} /> {user.email}
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setOpen(false); signOut().then(() => navigate("/")); }}>
                  <LogOut size={14} className="mr-2" /> Sair
                </Button>
              </>}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
