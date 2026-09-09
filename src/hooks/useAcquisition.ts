import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AcquisitionPlan = Tables<"acquisition_plans">;
export type AcquisitionAsset = Tables<"acquisition_assets">;
export type AcquisitionCampaign = Tables<"acquisition_campaigns">;
export type AcquisitionResult = Tables<"acquisition_results">;
export type AcquisitionLearning = Tables<"acquisition_learning">;
export type AcquisitionPlanHistory = Tables<"acquisition_plan_history">;

/** Statuses an administrator may set. Publishing and spending are not options. */
export const PLAN_ADMIN_STATUSES = ["rascunho", "em_revisao", "rejeitado", "arquivado"] as const;
export type PlanAdminStatus = (typeof PLAN_ADMIN_STATUSES)[number];

export const PLAN_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  arquivado: "Arquivado",
};

export const PLAN_DECISION_LABEL: Record<string, string> = {
  perseguir: "Perseguir",
  esperar: "Esperar",
  descartar: "Descartar",
};

export const MARKET_STATE_LABEL: Record<string, string> = {
  descoberto: "Descoberto",
  potencial: "Potencial",
  prioritario: "Prioritário",
  ativo: "Ativo",
  sem_evidencia: "Sem evidência",
};

export const CHANNEL_LABEL: Record<string, string> = {
  seo: "SEO / orgânico",
  landing_page: "Landing page",
  instagram_organico: "Instagram orgânico",
  email: "Email",
  google_ads: "Google Ads (não ligado)",
  meta_ads: "Meta Ads (não ligado)",
};

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aguarda_aprovacao: "Aguarda aprovação",
  aprovada: "Aprovada",
  ativa: "Ativa",
  pausada: "Pausada",
  terminada: "Terminada",
  rejeitada: "Rejeitada",
};

export const ASSET_STATUS_LABEL: Record<string, string> = {
  necessario: "Necessário",
  solicitado: "Solicitado ao Conteúdo IA",
  reutilizado: "Conteúdo reutilizado",
  pronto: "Pronto",
};

export const ACQUISITION_PAGE_SIZE = 25;

export interface AcquisitionFilterState {
  search: string;
  status: string;
  market: string;
  channel: string;
  decision: string;
}

export const emptyAcquisitionFilters: AcquisitionFilterState = {
  search: "",
  status: "",
  market: "",
  channel: "",
  decision: "",
};

export interface AcquisitionStats {
  total: number;
  rascunho: number;
  em_revisao: number;
  aprovado: number;
  rejeitado: number;
  arquivado: number;
  markets: number;
  opportunities: number;
  avg_score: number;
  latest_created_at: string | null;
  campaigns_draft: number;
  campaigns_awaiting: number;
  campaigns_active: number;
  assets_total: number;
  results_total: number;
  learning_total: number;
  accepted_opportunities: number;
  acquisition_cost: number;
  acquisition_runs: number;
  last_run_at: string | null;
}

export interface AcquisitionMarketRow {
  market: string;
  market_state: string;
  plans: number;
  opportunities: number;
  avg_score: number | null;
  avg_confidence: number | null;
  evidence_count: number | null;
  last_analysis: string | null;
}

export function useAcquisitionStats() {
  return useQuery({
    queryKey: ["acquisition", "stats"],
    queryFn: async (): Promise<AcquisitionStats | null> => {
      const { data, error } = await supabase.rpc("acquisition_stats");
      if (error) throw error;
      return (data as unknown as AcquisitionStats) ?? null;
    },
  });
}

export function useAcquisitionMarkets() {
  return useQuery({
    queryKey: ["acquisition", "markets"],
    queryFn: async (): Promise<AcquisitionMarketRow[]> => {
      const { data, error } = await supabase.rpc("acquisition_markets");
      if (error) throw error;
      return (data as unknown as AcquisitionMarketRow[]) ?? [];
    },
  });
}

export function useAcquisitionPlans(filters: AcquisitionFilterState, page: number) {
  return useQuery({
    queryKey: ["acquisition", "plans", filters, page],
    queryFn: async () => {
      let q = supabase.from("acquisition_plans").select("*", { count: "exact" });
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.market) q = q.eq("market", filters.market);
      if (filters.channel) q = q.eq("channel", filters.channel);
      if (filters.decision) q = q.eq("decision", filters.decision);

      const term = filters.search.trim();
      if (term) {
        const like = `%${term.replace(/[%,]/g, "")}%`;
        q = q.or(`market.ilike.${like},hypothesis.ilike.${like},objective.ilike.${like}`);
      }

      const start = page * ACQUISITION_PAGE_SIZE;
      const { data, error, count } = await q
        .order("acquisition_score", { ascending: false })
        .range(start, start + ACQUISITION_PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as AcquisitionPlan[], count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

/** Filter options built only from plans that really exist. */
export function useAcquisitionFacets() {
  return useQuery({
    queryKey: ["acquisition", "facets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_plans")
        .select("status, market, channel, decision")
        .limit(1000);
      if (error) throw error;
      const uniq = (key: string) =>
        Array.from(
          new Set(
            (data ?? [])
              .map((r) => (r as Record<string, string | null>)[key])
              .filter((v): v is string => Boolean(v && v.trim())),
          ),
        ).sort();
      return {
        status: uniq("status"),
        market: uniq("market"),
        channel: uniq("channel"),
        decision: uniq("decision"),
      };
    },
  });
}

export function useAcquisitionPlanDetail(id: string | null) {
  return useQuery({
    queryKey: ["acquisition", "plan", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_plans")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return (data as AcquisitionPlan) ?? null;
    },
  });
}

export function useAcquisitionPlanRelated(id: string | null) {
  return useQuery({
    queryKey: ["acquisition", "related", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const planId = id as string;
      const [assets, campaigns, history, results] = await Promise.all([
        supabase.from("acquisition_assets").select("*").eq("plan_id", planId).order("created_at"),
        supabase.from("acquisition_campaigns").select("*").eq("plan_id", planId).order("created_at"),
        supabase
          .from("acquisition_plan_history")
          .select("*")
          .eq("plan_id", planId)
          .order("created_at", { ascending: false }),
        supabase.from("acquisition_results").select("*").eq("plan_id", planId).order("created_at"),
      ]);
      return {
        assets: (assets.data ?? []) as AcquisitionAsset[],
        campaigns: (campaigns.data ?? []) as AcquisitionCampaign[],
        history: (history.data ?? []) as AcquisitionPlanHistory[],
        results: (results.data ?? []) as AcquisitionResult[],
      };
    },
  });
}

export function useAcquisitionOpportunity(id: string | null) {
  return useQuery({
    queryKey: ["acquisition", "opportunity", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discovery_opportunities")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useAcquisitionRun(runId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ["acquisition", "run", runId, taskId],
    enabled: Boolean(runId || taskId),
    queryFn: async () => {
      const run = runId
        ? (await supabase.from("agent_runs").select("*").eq("id", runId).maybeSingle()).data
        : null;
      const task = taskId
        ? (
            await supabase
              .from("agent_tasks")
              .select("id, task_type, status, agent_type")
              .eq("id", taskId)
              .maybeSingle()
          ).data
        : null;
      const costs = runId ? (await supabase.from("agent_costs").select("*").eq("run_id", runId)).data ?? [] : [];
      const approvals = taskId
        ? (await supabase.from("agent_approvals").select("*").eq("task_id", taskId)).data ?? []
        : [];
      return { run, task, costs, approvals };
    },
  });
}

export function useAcquisitionLearning() {
  return useQuery({
    queryKey: ["acquisition", "learning"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_learning")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AcquisitionLearning[];
    },
  });
}

export function useSetPlanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: PlanAdminStatus; note?: string | null }) => {
      const { error } = await supabase.rpc("admin_set_plan_status", {
        _plan_id: input.id,
        _status: input.status,
        _note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["acquisition"] }),
  });
}
