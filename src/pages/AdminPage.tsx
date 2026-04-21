import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Star, CheckCircle2, ShieldAlert, Cloud } from "lucide-react";
import { AdminSidebar, type AdminSection } from "@/components/admin/AdminSidebar";
import { StatsCards, defaultStats } from "@/components/admin/StatsCards";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { KycQueue } from "@/components/admin/KycQueue";
import { FlaggedMessages } from "@/components/admin/FlaggedMessages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockGuides, mockReviews } from "@/data/mockData";
import { guidePhotos } from "@/data/guidePhotos";
import { bookingsPerMonth } from "@/data/mockBookings";
import { toast } from "sonner";

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      <AdminSidebar active={section} onChange={setSection} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
        {section === "dashboard" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Visão geral da plataforma — Abril de 2026</p>
            </header>

            <StatsCards stats={defaultStats} />

            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-display font-semibold text-foreground mb-1">Reservas por mês</h2>
              <p className="text-xs text-muted-foreground mb-4">Últimos 6 meses</p>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="reservas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-display font-semibold text-foreground mb-3">Actividade recente</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-primary" /> Nova reserva confirmada — <span className="font-medium">Mergulho nos Recifes</span></li>
                <li className="flex items-center gap-3"><Star size={16} className="text-secondary" /> Nova review 5★ para <span className="font-medium">Ana Quaresma</span></li>
                <li className="flex items-center gap-3"><ShieldAlert size={16} className="text-destructive" /> Pedido de licença pendente — <span className="font-medium">Tomás Vaz</span></li>
              </ul>
            </div>
          </div>
        )}

        {section === "users" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Utilizadores</h1>
              <p className="text-sm text-muted-foreground">Gestão de utilizadores reais (Lovable Cloud)</p>
            </header>
            <UsersTable />
          </div>
        )}

        {section === "kyc" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Verificação KYC</h1>
              <p className="text-sm text-muted-foreground">Fila de submissões de guias para revisão</p>
            </header>
            <KycQueue />
          </div>
        )}

        {section === "chats" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Moderação de Chat</h1>
              <p className="text-sm text-muted-foreground">Mensagens detectadas pelo filtro anti-fraude</p>
            </header>
            <FlaggedMessages />
          </div>
        )}

        {section === "guias" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Guias</h1>
              <p className="text-sm text-muted-foreground">Gestão de guias registados na plataforma</p>
            </header>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guia</TableHead>
                    <TableHead className="hidden sm:table-cell">Cidade</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockGuides.map((g) => {
                    const photo = guidePhotos[g.id];
                    return (
                      <TableRow key={g.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                              {photo && <img src={photo} alt={g.user?.name ?? ""} className="w-full h-full object-cover" />}
                            </div>
                            <span className="font-medium text-foreground">{g.user?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{g.city}</TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1">
                            <Star size={12} className="fill-secondary text-secondary" /> {g.rating.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">({g.total_reviews})</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {g.license_verified ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Verificado</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary/30 text-xs">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => toast.info(`Ver perfil de ${g.user?.name}`)}>Ver</Button>
                          <Button size="sm" variant="outline" onClick={() => toast.success(`${g.user?.name} aprovado`)}>Aprovar</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {section === "reservas" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Reservas</h1>
              <p className="text-sm text-muted-foreground">Todas as reservas da plataforma</p>
            </header>
            <BookingsTable />
          </div>
        )}

        {section === "reviews" && (
          <div className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Reviews</h1>
              <p className="text-sm text-muted-foreground">Moderação de avaliações</p>
            </header>
            <div className="space-y-3">
              {mockReviews.slice(0, 8).map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
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
          </div>
        )}

        {section === "definicoes" && (
          <div className="space-y-6 max-w-2xl">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Definições</h1>
              <p className="text-sm text-muted-foreground">Configuração da plataforma</p>
            </header>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Cloud size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Lovable Cloud</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Para activar autenticação real, base de dados, storage e protecção de rotas administrativas, é necessário activar o Lovable Cloud na próxima fase.
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">Fase 2 — em planeamento</Badge>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-foreground mb-2">Comissão da plataforma</h3>
              <p className="text-3xl font-display font-bold text-primary">10%</p>
              <p className="text-xs text-muted-foreground mt-1">Aplicada sobre o valor de cada reserva confirmada.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
