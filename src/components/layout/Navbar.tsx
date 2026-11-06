import { Menu, LogOut, ShieldCheck, MessageSquare, LayoutDashboard, User as UserIcon, Briefcase, Calendar } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useT } from "@/i18n/LanguageProvider";
import { JourneyChoiceDialog } from "@/components/home/JourneyChoiceDialog";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();

  const initials = user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between md:h-24">
        <Logo size="sm" />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 xl:flex">
          <a href="/#pacotes" className="text-[0.72rem] uppercase text-foreground transition-colors hover:text-primary">
            Pacotes
          </a>
          <Link to="/experiences" className="text-[0.78rem] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
            {t("nav.experiences")}
          </Link>
          <Link to="/voos" className="text-[0.78rem] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
            Voos
          </Link>
          <Link to="/guides" className="text-[0.78rem] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
            {t("nav.guides")}
          </Link>
          <Link to="/sobre-sao-tome" className="text-[0.78rem] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
            {t("nav.destino")}
          </Link>
        </nav>


        {/* Desktop actions */}
        <div className="hidden items-center gap-2 xl:flex">
          <LanguageSwitcher />
          <NotificationCenter />
          {!user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth?mode=login")}>{t("nav.login")}</Button>
              <Button size="sm" variant="hero" onClick={() => setChoiceOpen(true)}>Começar a viagem</Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-eden-ink text-primary-foreground font-medium text-sm flex items-center justify-center hover:bg-primary transition-colors duration-500">
                  {initials}
                </button>

              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  {user.email}
                  <span className="block text-[10px] text-muted-foreground capitalize mt-0.5">{role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                  <Calendar size={14} className="mr-2" /> {role === "guide" ? t("nav.guideBookings") : t("nav.myBookings")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/messages")}>
                  <MessageSquare size={14} className="mr-2" /> {t("nav.messages")}
                </DropdownMenuItem>
                {role === "guide" && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/my-services")}>
                      <Briefcase size={14} className="mr-2" /> {t("nav.myServices")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/perfil-profissional")}>
                      <Briefcase size={14} className="mr-2" /> Perfil profissional
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/verificacao")}>
                      <ShieldCheck size={14} className="mr-2" /> Verificação
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/kyc")}>
                      <ShieldCheck size={14} className="mr-2" /> {t("nav.kyc")}
                    </DropdownMenuItem>

                  </>
                )}
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <LayoutDashboard size={14} className="mr-2" /> {t("nav.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut().then(() => navigate("/"))}>
                  <LogOut size={14} className="mr-2" /> {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 xl:hidden">
          <LanguageSwitcher compact />
          <NotificationCenter />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("nav.menu")}>
                <Menu size={22} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] max-w-sm flex flex-col">
              <SheetHeader>
                <SheetTitle className="font-display text-left">{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                <SheetClose asChild>
                  <a href="/#pacotes" className="border-b border-border px-1 py-4 font-display text-2xl text-foreground">Pacotes</a>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/experiences" className="border-b border-border px-1 py-4 font-display text-2xl text-foreground">
                    {t("nav.experiences")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/voos" className="border-b border-border px-1 py-4 font-display text-2xl text-foreground">Voos</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/guides" className="border-b border-border px-1 py-4 font-display text-2xl text-foreground">
                    {t("nav.guides")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/sobre-sao-tome" className="border-b border-border px-1 py-4 font-display text-2xl text-foreground">
                    {t("nav.destino")}
                  </Link>
                </SheetClose>
                {user && <>
                  <SheetClose asChild>
                    <Link to="/my-bookings" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                      <Calendar size={16} /> {role === "guide" ? t("nav.guideBookings") : t("nav.myBookings")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/messages" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                      <MessageSquare size={16} /> {t("nav.messages")}
                    </Link>
                  </SheetClose>
                  {role === "guide" && <>
                    <SheetClose asChild>
                      <Link to="/my-services" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                        <Briefcase size={16} /> {t("nav.myServices")}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/kyc" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                        <ShieldCheck size={16} /> {t("nav.kyc")}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/perfil-profissional" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                        <Briefcase size={16} /> Perfil profissional
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/verificacao" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                        <ShieldCheck size={16} /> Verificação
                      </Link>
                    </SheetClose>
                  </>}
                  {role === "admin" && <SheetClose asChild>
                    <Link to="/admin" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                      <LayoutDashboard size={16} /> {t("nav.admin")}
                    </Link>
                  </SheetClose>}
                </>}

              </nav>
              <div className="mt-auto flex flex-col gap-2 pb-4">
                {!user ? <>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate("/auth?mode=login"); }}>{t("nav.login")}</Button>
                  <Button variant="hero" className="w-full" onClick={() => { setOpen(false); setChoiceOpen(true); }}>Começar a viagem</Button>
                </> : <>
                  <div className="flex items-center gap-2 px-3 text-sm text-muted-foreground">
                    <UserIcon size={14} /> {user.email}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); signOut().then(() => navigate("/")); }}>
                    <LogOut size={14} className="mr-2" /> {t("nav.signOut")}
                  </Button>
                </>}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <JourneyChoiceDialog open={choiceOpen} onOpenChange={setChoiceOpen} />
    </header>
  );
}
