import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Opportunity = Tables<"discovery_opportunities">;
export type OpportunityHistory = Tables<"discovery_opportunity_history">;

export const OPPORTUNITY_STATUSES = ["nova", "em_analise", "aceite", "rejeitada", "expirada"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const PAGE_SIZE = 25;

export interface DiscoveryFilterState {
  search: string;
  country: string;
  market: string;
  language: string;
  intent: string;
  category: string;
  status: string;
  source: string;
  minScore: string;
  minConfidence: string;
  from: string;
  to: string;
}

export const emptyFilters: DiscoveryFilterState = {
  search: "", country: "", market: "", language: "", intent: "",
  category: "", status: "", source: "", minScore: "", minConfidence: "", from: "", to: "",
};

export type SortKey = "discovered_at" | "opportunity_score" | "confidence_score";

export interface DiscoveryStats {
  total: number;
  novas: number;
  em_analise: number;
  aceites: number;
  rejeitadas: number;
  expiradas: number;
  avg_score: number | null;
  avg_confidence: number | null;
  distinct_countries: number;
  distinct_markets: number;
  total_cost: number | null;
  avg_cost: number | null;
  last_run_at: string | null;
}

export function useDiscoveryStats() {
  return useQuery({
    queryKey: ["discovery", "stats"],
    queryFn: async (): Promise<DiscoveryStats | null> => {
      const { data, error } = await supabase.rpc("discovery_stats");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as DiscoveryStats) ?? null;
    },
  });
}

export function useOpportunities(
  filters: DiscoveryFilterState,
  page: number,
  sort: { key: SortKey; asc: boolean },
) {
  return useQuery({
    queryKey: ["discovery", "opportunities", filters, page, sort],
    queryFn: async () => {
      let q = supabase
        .from("discovery_opportunities")
        .select("*", { count: "exact" });

      if (filters.country) q = q.eq("country", filters.country);
      if (filters.market) q = q.eq("market", filters.market);
      if (filters.language) q = q.eq("language", filters.language);
      if (filters.intent) q = q.eq("intent", filters.intent);
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.source) q = q.eq("source", filters.source);
      if (filters.minScore) q = q.gte("opportunity_score", Number(filters.minScore));
      if (filters.minConfidence) q = q.gte("confidence_score", Number(filters.minConfidence));
      if (filters.from) q = q.gte("discovered_at", new Date(filters.from).toISOString());
      if (filters.to) q = q.lte("discovered_at", new Date(`${filters.to}T23:59:59`).toISOString());

      const term = filters.search.trim();
      if (term) {
        const like = `%${term.replace(/[%,]/g, "")}%`;
        q = q.or(
          `query.ilike.${like},country.ilike.${like},market.ilike.${like},category.ilike.${like},rationale.ilike.${like}`,
        );
      }

      const start = page * PAGE_SIZE;
      const { data, error, count } = await q
        .order(sort.key, { ascending: sort.asc })
        .range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Opportunity[], count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

/** Distinct filter options derived from the real rows (no artificial options). */
export function useDiscoveryFacets() {
  return useQuery({
    queryKey: ["discovery", "facets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discovery_opportunities")
        .select("country, market, language, intent, category, source, status")
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
        country: uniq("country"),
        market: uniq("market"),
        language: uniq("language"),
        intent: uniq("intent"),
        category: uniq("category"),
        source: uniq("source"),
        status: uniq("status"),
      };
    },
  });
}

export function useOpportunityDetail(id: string | null) {
  return useQuery({
    queryKey: ["discovery", "opportunity", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discovery_opportunities")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return (data as Opportunity) ?? null;
    },
  });
}

export function useOpportunityHistory(id: string | null) {
  return useQuery({
    queryKey: ["discovery", "history", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discovery_opportunity_history")
        .select("*")
        .eq("opportunity_id", id as string)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OpportunityHistory[];
    },
  });
}

export function useOpportunityRun(runId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ["discovery", "run", runId, taskId],
    enabled: Boolean(runId || taskId),
    queryFn: async () => {
      const run = runId
        ? (await supabase.from("agent_runs").select("*").eq("id", runId).maybeSingle()).data
        : null;
      const task = taskId
        ? (await supabase.from("agent_tasks").select("id, task_type, status, agent_type").eq("id", taskId).maybeSingle()).data
        : null;
      const costs = runId
        ? (await supabase.from("agent_costs").select("*").eq("run_id", runId)).data ?? []
        : [];
      return { run, task, costs };
    },
  });
}

export function useDiscoveryWeights() {
  return useQuery({
    queryKey: ["discovery", "weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_config")
        .select("value")
        .eq("key", "discovery_score_weights")
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as Record<string, number> | null;
    },
  });
}

export function useSetOpportunityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: OpportunityStatus; note?: string | null }) => {
      const { error } = await supabase.rpc("admin_set_opportunity_status", {
        _opportunity_id: input.id,
        _status: input.status,
        _note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["discovery"] });
    },
  });
}
