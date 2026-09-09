import { BadgeCheck, MapPin, LayoutDashboard, Users, Calendar, Star, Settings, ArrowLeft, ShieldCheck, MessageSquare, UserCog, Radar, FileText, Megaphone, Package } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type AdminSection = "dashboard" | "users" | "guias" | "kyc" | "verificacao" | "servicos" | "discovery" | "conteudo" | "aquisicao" | "pacotes" | "territorio" | "reservas" | "chats" | "reviews" | "definicoes";

interface Props {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
}

const items: { id: AdminSection; label: string; icon: typeof Users }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Utilizadores", icon: UserCog },
  { id: "guias", label: "Guias", icon: Users },
  { id: "kyc", label: "Verificação KYC", icon: ShieldCheck },
  { id: "verificacao", label: "Perfis a verificar", icon: BadgeCheck },
  { id: "servicos", label: "Moderar serviços", icon: BadgeCheck },
  { id: "discovery", label: "Discovery IA", icon: Radar },
  { id: "conteudo", label: "Conteúdo IA", icon: FileText },
  { id: "aquisicao", label: "Aquisição IA", icon: Megaphone },
  { id: "pacotes", label: "Pacotes", icon: Package },
  { id: "territorio", label: "Distritos e localidades", icon: MapPin },
  { id: "reservas", label: "Reservas", icon: Calendar },
  { id: "chats", label: "Moderação Chat", icon: MessageSquare },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "definicoes", label: "Definições", icon: Settings },
];

export function AdminSidebar({ active, onChange }: Props) {
  return (
    <aside className="w-full md:w-64 md:min-h-screen md:border-r border-border bg-gradient-to-b from-card via-card to-primary/5 md:sticky md:top-0">
      <div className="p-5 border-b border-border bg-gradient-to-br from-primary/15 via-card to-secondary/10">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark size="md" />
          <div>
            <p className="font-display font-bold text-base leading-tight text-foreground">Rotas do Éden</p>
            <p className="text-[11px] text-primary font-semibold uppercase tracking-wider">Admin Console</p>
          </div>
        </Link>
      </div>
      <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              )}
            >
              <Icon size={16} className={cn("transition-transform", isActive ? "" : "group-hover:scale-110")} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 mt-auto hidden md:block">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={12} /> Voltar ao site
        </Link>
      </div>
    </aside>
  );
}
