import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle2, ShieldAlert, Cloud, Sparkles, Star, FileText } from "lucide-react";
import { AdminSidebar, type AdminSection } from "@/components/admin/AdminSidebar";
import { StatsCards, defaultStats } from "@/components/admin/StatsCards";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { KycQueue } from "@/components/admin/KycQueue";
import { VerificationQueue } from "@/components/admin/VerificationQueue";
import { ServiceModeration } from "@/components/admin/ServiceModeration";
import { TerritoryManager } from "@/components/admin/TerritoryManager";
import { FlaggedMessages } from "@/components/admin/FlaggedMessages";
import { AdminGuideTable } from "@/components/admin/AdminGuideTable";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { DiscoveryPanel } from "@/components/admin/discovery/DiscoveryPanel";
import { ContentPanel } from "@/components/admin/content/ContentPanel";
import { AcquisitionPanel } from "@/components/admin/acquisition/AcquisitionPanel";
import { PackagesPanel } from "@/components/admin/packages/PackagesPanel";
import { SuppliersPanel } from "@/components/admin/suppliers/SuppliersPanel";
import { PricingPanel } from "@/components/admin/pricing/PricingPanel";
import { FlightsPanel } from "@/components/admin/flights/FlightsPanel";
import { QuotesPanel } from "@/components/admin/quotes/QuotesPanel";
import { ConversionPanel } from "@/components/admin/conversion/ConversionPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Activity { id: string; icon: "booking" | "doc" | "verification"; title: string; detail: string }

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const { user } = useAuth();
  const [liveStats, setLiveStats] = useState(defaultStats);
  const [chart, setChart] = useState<{ month: string; reservas: number }[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: guides }, { count: bookingsCount }, { count: pendingKyc }, { count: pendingVerif }] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "guide"),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setLiveStats((prev) => prev.map((s, i) => {
        if (i === 0) return { ...s, value: String(guides ?? 0) };
        if (i === 1) return { ...s, value: String(bookingsCount ?? 0) };
        if (i === 2) return { ...s, value: String(pendingKyc ?? 0) };
        return { ...s, value: String(pendingVerif ?? 0) };
      }));

      // Reservas por mês — últimos 6 meses, a partir de dados reais
      const since = new Date();
      since.setMonth(since.getMonth() - 5, 1);
      const buckets: { month: string; reservas: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
        buckets.push({ month: MONTH_LABELS[d.getMonth()], reservas: 0 });
      }
      const { data: recent } = await supabase
        .from("bookings")
        .select("id, service_title, created_at, status")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      (recent ?? []).forEach((b) => {
        const d = new Date(b.created_at);
        const idx = (d.getFullYear() - since.getFullYear()) * 12 + d.getMonth() - since.getMonth();
        if (idx >= 0 && idx < 6) buckets[idx].reservas += 1;
      });
      setChart(buckets);

      const [{ data: docs }, { data: verifs }] = await Promise.all([
        supabase.from("document_requests").select("id, label, status, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("verification_requests").select("id, status, created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      const feed: Activity[] = [
        ...(recent ?? []).slice(0, 3).map((b) => ({
          id: `b-${b.id}`, icon: "booking" as const, title: "Reserva registada", detail: b.service_title,
        })),
        ...(docs ?? []).map((d) => ({
          id: `d-${d.id}`, icon: "doc" as const,
          title: d.status === "open" ? "Documento solicitado" : "Documento recebido", detail: d.label,
        })),
        ...(verifs ?? []).map((v) => ({
          id: `v-${v.id}`, icon: "verification" as const,
          title: "Pedido de verificação", detail: `Estado: ${v.status}`,
        })),
      ].slice(0, 6);
      setActivity(feed);
    })();
  }, []);


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-muted/40 via-background to-primary/5">
      <AdminSidebar active={section} onChange={setSection} />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl space-y-8">
        {section === "dashboard" && (
          <div className="space-y-8">
            <AdminSectionHeader
              eyebrow="Visão geral"
              title={`Olá, ${user?.user_metadata?.full_name?.split(" ")[0] ?? "Admin"}`}
              description="Acompanha o que se passa na plataforma — guias, reservas, verificações e moderação."
              actions={
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                  <Sparkles size={12} /> Dados reais
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
                    <BarChart data={chart}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="month" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} className="text-xs" stroke="hsl(var(--muted-foreground))" />
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

              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4">Actividade recente</h2>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ainda sem actividade registada. Reservas, pedidos de documentos e verificações aparecem aqui.
                  </p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {activity.map((a) => (
                      <li key={a.id} className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {a.icon === "booking" ? <CheckCircle2 size={14} className="text-primary" />
                            : a.icon === "doc" ? <FileText size={14} className="text-secondary-foreground" />
                            : <ShieldAlert size={14} className="text-destructive" />}
                        </span>
                        <div>
                          <p className="text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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

        {section === "verificacao" && (
          <>
            <AdminSectionHeader
              eyebrow="Verificação"
              title="Perfis profissionais a verificar"
              description="Pedidos de verificação com documentos confidenciais. Aprova, recusa e deixa notas para o profissional."
            />
            <VerificationQueue />
          </>
        )}

        {section === "servicos" && (
          <>
            <AdminSectionHeader
              eyebrow="Qualidade"
              title="Moderação de serviços"
              description="Revê as experiências criadas pelos guias. Só serviços aprovados ficam visíveis publicamente."
            />
            <ServiceModeration />
          </>
        )}

        {section === "discovery" && (
          <>
            <AdminSectionHeader
              eyebrow="Agentes IA"
              title="Discovery Control Center"
              description="Oportunidades de procura detetadas pelo agente Discovery. As ações aqui apenas classificam oportunidades — não executam campanhas."
            />
            <DiscoveryPanel />
          </>
        )}

        {section === "conteudo" && (
          <>
            <AdminSectionHeader
              eyebrow="Agentes IA"
              title="Conteúdo IA"
              description="Rascunhos criados a partir de oportunidades aceites, com as fontes usadas e o controlo de qualidade. Nada é publicado sem a tua decisão."
            />
            <ContentPanel />
          </>
        )}

        {section === "aquisicao" && (
          <>
            <AdminSectionHeader
              eyebrow="Agentes IA"
              title="Aquisição IA"
              description="Planos de aquisição em rascunho criados a partir de oportunidades aceites e da capacidade real da plataforma. Nada é publicado, contactado ou pago a partir daqui."
            />
            <AcquisitionPanel />
          </>
        )}

        {section === "pacotes" && (
          <>
            <AdminSectionHeader
              eyebrow="Produtos"
              title="Pacotes"
              description="Os produtos de viagem e as suas versões. Nesta fase não existem preços, custos, fornecedores nem voos, e nada aparece no site público."
            />
            <PackagesPanel />
          </>
        )}

        {section === "fornecedores" && (
          <>
            <AdminSectionHeader
              eyebrow="Fornecimento"
              title="Fornecedores"
              description="Fornecedores reais, alojamentos, quartos, componentes e tarifas. Cada valor exige fonte e data, o preço público observado nunca se confunde com o custo da Rotas do Éden, e nada fica visível no site."
            />
            <SuppliersPanel />
          </>
        )}

        {section === "precos" && (
          <>
            <AdminSectionHeader
              eyebrow="Fornecimento"
              title="Preços"
              description="Políticas de preço versionadas: markup e margem bruta separados, margem mínima, regras por componente, taxas, suplementos, proteção futura de tarifa aérea e arredondamento. O preço é sempre calculado no servidor a partir de custos válidos."
            />
            <PricingPanel />
          </>
        )}



        {section === "voos" && (
          <>
            <AdminSectionHeader
              eyebrow="Fornecimento"
              title="Voos (modo de teste)"
              description="Pesquisa de ofertas aéreas reais no ambiente de teste da Duffel. Os valores são custo de fornecedor: a margem, a proteção e o arredondamento continuam a ser aplicados em Preços. Não há reservas, pagamentos nem emissão de bilhetes."
            />
            <FlightsPanel />
          </>
        )}

        {section === "cotacoes" && (
          <>
            <AdminSectionHeader
              eyebrow="Comercial"
              title="Cotações"
              description="Propostas comerciais versionadas e imutáveis. O preço vem sempre do motor de preços no servidor; cada alteração cria uma nova versão com a diferença explícita. Uma cotação não é reserva nem pagamento."
            />
            <QuotesPanel />
          </>
        )}

        {section === "assistente" && <ConversionPanel />}

        {section === "territorio" && (
          <>
            <AdminSectionHeader
              eyebrow="Território"
              title="Distritos e localidades"
              description="Gere a lista oficial de distritos e localidades de São Tomé e Príncipe usada nos perfis e experiências."
            />
            <TerritoryManager />
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
              description="Todas as reservas reais da plataforma, com guia, viajante, valor e estado do pagamento."
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
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star size={20} className="text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">Sem avaliações ainda</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                As reviews aparecerão aqui assim que as primeiras reservas forem concluídas pelos guias parceiros verificados.
              </p>
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
