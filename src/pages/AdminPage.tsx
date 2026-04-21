import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Star, CheckCircle2, ShieldAlert, Cloud, Sparkles } from "lucide-react";
import { AdminSidebar, type AdminSection } from "@/components/admin/AdminSidebar";
import { StatsCards, defaultStats } from "@/components/admin/StatsCards";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { KycQueue } from "@/components/admin/KycQueue";
import { FlaggedMessages } from "@/components/admin/FlaggedMessages";
import { AdminGuideTable } from "@/components/admin/AdminGuideTable";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockReviews } from "@/data/mockData";
import { bookingsPerMonth } from "@/data/mockBookings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const { user } = useAuth();
  const [liveStats, setLiveStats] = useState(defaultStats);

  useEffect(() => {
    (async () => {
      const [{ count: guides }, { count: bookings }, { count: pendingKyc }] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "guide"),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      ]);
      setLiveStats((prev) => prev.map((s, i) => {
        if (i === 0) return { ...s, value: String(guides ?? 0), delta: "Guias registados" };
        if (i === 1) return { ...s, value: String(bookings ?? 0), delta: "Reservas totais" };
        if (i === 2) return { ...s, value: String(pendingKyc ?? 0), delta: "KYC a rever" };
        return s;
      }));
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-muted/40 via-background to-primary/5">
      <AdminSidebar active={section} onChange={setSection} />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl space-y-8">
        {section === "dashboard" && (
          <div className="space-y-8">
            <AdminSectionHeader
              eyebrow="Visão geral · Abril 2026"
              title={`Olá, ${user?.user_metadata?.full_name?.split(" ")[0] ?? "Admin"} 🌿`}
              description="Acompanha em tempo real o que se passa na plataforma — guias, reservas, KYC e moderação."
              actions={
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                  <Sparkles size={12} /> Live
                </Badge>
              }
            />

            <StatsCards stats={liveStats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-end justify-between mb-1">
                  <h2 className="font-display font-semibold text-lg text-foreground">Reservas por mês</h2>
                  <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
                </div>
                <div className="w-full h-72 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingsPerMonth}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="month" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                      <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.75rem",
                          fontSize: "0.75rem",
                        }}
                      />
                      <Bar dataKey="reservas" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border rounded-3xl p-6 shadow-sm">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4">Actividade recente</h2>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"><CheckCircle2 size={14} className="text-primary" /></span>
                    <div><p className="text-foreground">Nova reserva confirmada</p><p className="text-xs text-muted-foreground">Mergulho nos Recifes</p></div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-secondary/25 flex items-center justify-center flex-shrink-0"><Star size={14} className="text-secondary-foreground" /></span>
                    <div><p className="text-foreground">Nova review 5★</p><p className="text-xs text-muted-foreground">para Ana Quaresma</p></div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0"><ShieldAlert size={14} className="text-destructive" /></span>
                    <div><p className="text-foreground">Pedido de licença pendente</p><p className="text-xs text-muted-foreground">Tomás Vaz</p></div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {section === "users" && (
          <>
            <AdminSectionHeader
              eyebrow="Gestão"
              title="Utilizadores"
              description="Todos os utilizadores reais registados na plataforma. Banir/desbanir e consultar estado KYC."
            />
            <UsersTable />
          </>
        )}

        {section === "kyc" && (
          <>
            <AdminSectionHeader
              eyebrow="Verificação"
              title="Fila KYC"
              description="Submissões de guias à espera de revisão. Aprova ou rejeita após verificar os documentos."
            />
            <KycQueue />
          </>
        )}

        {section === "chats" && (
          <>
            <AdminSectionHeader
              eyebrow="Anti-fraude"
              title="Moderação de Chat"
              description="Mensagens detectadas pelo filtro automático — contactos, pagamentos e termos suspeitos."
            />
            <FlaggedMessages />
          </>
        )}

        {section === "guias" && (
          <>
            <AdminSectionHeader
              eyebrow="Comunidade"
              title="Guias"
              description="Guias reais registados na plataforma. Clica em Ver para abrir o detalhe administrativo."
            />
            <AdminGuideTable />
          </>
        )}

        {section === "reservas" && (
          <>
            <AdminSectionHeader
              eyebrow="Operações"
              title="Reservas"
              description="Histórico completo de reservas (dados de demonstração até integração de pagamentos)."
            />
            <BookingsTable />
          </>
        )}

        {section === "reviews" && (
          <>
            <AdminSectionHeader
              eyebrow="Comunidade"
              title="Reviews"
              description="Modera as avaliações deixadas por turistas."
            />
            <div className="space-y-3">
              {mockReviews.slice(0, 8).map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:shadow-sm transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">{r.tourist?.name}</span>
                      <span className="text-xs text-muted-foreground">· {r.tourist?.nationality}</span>
                      <span className="inline-flex items-center gap-0.5 ml-auto sm:ml-0 text-xs text-secondary-foreground">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} size={12} className="fill-secondary text-secondary" />
                        ))}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.comment}</p>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <Button size="sm" variant="outline" onClick={() => toast.success("Review aprovada")}>Aprovar</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.error("Review removida")}>Remover</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {section === "definicoes" && (
          <>
            <AdminSectionHeader
              eyebrow="Configuração"
              title="Definições"
              description="Configurações globais da plataforma."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Cloud size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Lovable Cloud</h3>
                    <p className="text-sm text-muted-foreground mt-1">Auth, base de dados, storage de KYC e chat em tempo real activos.</p>
                    <Badge variant="outline" className="mt-2 text-xs bg-primary/10 text-primary border-primary/30">Activo</Badge>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-secondary/15 via-card to-card border border-border rounded-2xl p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">Comissão da plataforma</h3>
                <p className="text-4xl font-display font-bold text-primary">10%</p>
                <p className="text-xs text-muted-foreground mt-1">Aplicada sobre o valor de cada reserva confirmada.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
