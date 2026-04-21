import { LayoutDashboard, Users, Calendar, Star, Settings, Leaf, ArrowLeft, ShieldCheck, MessageSquare, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type AdminSection = "dashboard" | "users" | "guias" | "kyc" | "reservas" | "chats" | "reviews" | "definicoes";

interface Props {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
}

const items: { id: AdminSection; label: string; icon: typeof Users }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Utilizadores", icon: UserCog },
  { id: "guias", label: "Guias", icon: Users },
  { id: "kyc", label: "Verificação KYC", icon: ShieldCheck },
  { id: "reservas", label: "Reservas", icon: Calendar },
  { id: "chats", label: "Moderação Chat", icon: MessageSquare },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "definicoes", label: "Definições", icon: Settings },
];

export function AdminSidebar({ active, onChange }: Props) {
  return (
    <aside className="w-full md:w-60 md:min-h-screen md:border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Leaf size={16} className="text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-tight">Rotas do Éden</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </Link>
      </div>
      <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 mt-auto hidden md:block">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={12} /> Voltar ao site
        </Link>
      </div>
    </aside>
  );
}
