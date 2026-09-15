import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const INTENT_LABEL: Record<string, string> = {
  inspiracao: "Inspiração",
  duvida: "Dúvida",
  interesse_pacote: "Interesse em pacote",
  pedido_orcamento: "Pedido de orçamento",
  intencao_reserva: "Intenção de reserva",
};

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  cotado: "Cotado",
  convertido: "Convertido",
  arquivado: "Arquivado",
};

export function ConversionPanel() {
  const conversations = useQuery({
    queryKey: ["conversion-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversion_conversations")
        .select("id, intent, status, message_count, last_message_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const leads = useQuery({
    queryKey: ["conversion-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversion_leads")
        .select("id, contact_name, contact_email, contact_phone, travel_start, duration_days, travelers_adults, travelers_children, origin_city, intent, status, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Assistente IA"
        description="Conversas do assistente público e pedidos de orçamento recolhidos. O assistente não cria reservas nem pagamentos."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pedidos de orçamento ({leads.data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {!leads.isLoading && (leads.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Ainda não há pedidos registados.</p>
          )}
          {(leads.data ?? []).map((lead) => (
            <div key={lead.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{lead.contact_name || "Sem nome"}</span>
                <Badge variant="secondary">{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
                <Badge variant="outline">{INTENT_LABEL[lead.intent] ?? lead.intent}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                {[lead.contact_email, lead.contact_phone].filter(Boolean).join(" · ") || "Sem contacto"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {[
                  lead.travel_start ? `A partir de ${lead.travel_start}` : null,
                  lead.duration_days ? `${lead.duration_days} dias` : null,
                  `${lead.travelers_adults} adulto(s)${lead.travelers_children ? ` + ${lead.travelers_children} criança(s)` : ""}`,
                  lead.origin_city ? `Origem: ${lead.origin_city}` : null,
                ].filter(Boolean).join(" · ")}
              </p>
              {lead.notes && <p className="mt-1 text-muted-foreground">{lead.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Conversas recentes ({conversations.data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {conversations.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {!conversations.isLoading && (conversations.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Ainda não há conversas.</p>
          )}
          {(conversations.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <Badge variant="outline">{INTENT_LABEL[c.intent] ?? c.intent}</Badge>
              <span className="text-muted-foreground">{c.message_count} mensagens</span>
              <span className="text-muted-foreground">
                {new Date(c.last_message_at ?? c.created_at).toLocaleString("pt-PT")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
