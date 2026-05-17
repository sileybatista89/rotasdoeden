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
import { useT } from "@/i18n/LanguageProvider";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();

  const initials = user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/60">
      <div className="container flex items-center justify-between h-16">
        <Logo size="md" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <Link to="/experiences" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.experiences")}
          </Link>
          <Link to="/guides" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.guides")}
          </Link>
          <Link to="/sobre-sao-tome" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            O destino
          </Link>
          <a href="/#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.how")}
          </a>
          <a href="/#contacto" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.contact")}
          </a>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          {!user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/seja-parceiro">{t("nav.becomePartner")}</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/auth?mode=login")}>{t("nav.login")}</Button>
              <Button size="sm" variant="hero" className="rounded-full" onClick={() => navigate("/auth?mode=register")}>{t("nav.register")}</Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-eden-green-dark text-primary-foreground font-semibold flex items-center justify-center hover:opacity-90 transition-opacity ring-2 ring-primary/15">
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
        <div className="flex md:hidden items-center gap-1">
          <LanguageSwitcher compact />
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
                  <Link to="/experiences" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                    {t("nav.experiences")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/guides" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                    {t("nav.guides")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/sobre-sao-tome" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                    O destino
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/#como-funciona" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                    {t("nav.how")}
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/#contacto" className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">
                    {t("nav.contact")}
                  </a>
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
                  <Button asChild variant="ghost" className="w-full justify-center">
                    <Link to="/seja-parceiro" onClick={() => setOpen(false)}>{t("nav.becomePartner")}</Link>
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate("/auth?mode=login"); }}>{t("nav.login")}</Button>
                  <Button variant="hero" className="w-full" onClick={() => { setOpen(false); navigate("/auth?mode=register"); }}>{t("nav.register")}</Button>
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
    </header>
  );
}
