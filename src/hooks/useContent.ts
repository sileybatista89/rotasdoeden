import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ContentItem = Tables<"content_items">;
export type ContentVersion = Tables<"content_versions">;
export type ContentSource = Tables<"content_sources">;
export type ContentReview = Tables<"content_reviews">;

export const CONTENT_STATUSES = ["draft", "in_review", "approved", "published", "rejected", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Rejeitado",
  archived: "Arquivado",
};

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  destination_page: "Página de destino",
  seo_article: "Artigo SEO",
  landing_page: "Landing page",
  faq: "Perguntas frequentes",
  social_post: "Publicação social",
  experience_content: "Conteúdo de experiência",
  market_content: "Conteúdo de mercado",
};

export const CONTENT_PAGE_SIZE = 25;

export interface ContentFilterState {
  search: string;
  status: string;
  contentType: string;
  language: string;
  market: string;
  quality: string;
}

export const emptyContentFilters: ContentFilterState = {
  search: "",
  status: "",
  contentType: "",
  language: "",
  market: "",
  quality: "",
};

export interface ContentStats {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  published: number;
  rejected: number;
  archived: number;
  quality_passed: number;
  languages: number;
  content_types: number;
  from_opportunities: number;
  latest_created_at: string | null;
  pending_publications: number;
  content_cost: number;
  content_runs: number;
}

export function useContentStats() {
  return useQuery({
    queryKey: ["content", "stats"],
    queryFn: async (): Promise<ContentStats | null> => {
      const { data, error } = await supabase.rpc("content_stats");
      if (error) throw error;
      return (data as unknown as ContentStats) ?? null;
    },
  });
}

export function useContentItems(filters: ContentFilterState, page: number) {
  return useQuery({
    queryKey: ["content", "items", filters, page],
    queryFn: async () => {
      let q = supabase.from("content_items").select("*", { count: "exact" });

      if (filters.status) q = q.eq("status", filters.status);
      if (filters.contentType) q = q.eq("content_type", filters.contentType);
      if (filters.language) q = q.eq("language", filters.language);
      if (filters.market) q = q.eq("market", filters.market);
      if (filters.quality === "passed") q = q.eq("quality_passed", true);
      if (filters.quality === "failed") q = q.eq("quality_passed", false);

      const term = filters.search.trim();
      if (term) {
        const like = `%${term.replace(/[%,]/g, "")}%`;
        q = q.or(`title.ilike.${like},slug.ilike.${like},market.ilike.${like}`);
      }

      const start = page * CONTENT_PAGE_SIZE;
      const { data, error, count } = await q
        .order("updated_at", { ascending: false })
        .range(start, start + CONTENT_PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as ContentItem[], count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

/** Filter options built only from rows that really exist. */
export function useContentFacets() {
  return useQuery({
    queryKey: ["content", "facets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("status, content_type, language, market")
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
        contentType: uniq("content_type"),
        language: uniq("language"),
        market: uniq("market"),
      };
    },
  });
}

export function useContentDetail(id: string | null) {
  return useQuery({
    queryKey: ["content", "item", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return (data as ContentItem) ?? null;
    },
  });
}

export function useContentVersions(id: string | null) {
  return useQuery({
    queryKey: ["content", "versions", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_versions")
        .select("*")
        .eq("content_id", id as string)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentVersion[];
    },
  });
}

export function useContentSources(id: string | null) {
  return useQuery({
    queryKey: ["content", "sources", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_sources")
        .select("*")
        .eq("content_id", id as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentSource[];
    },
  });
}

export function useContentReviews(id: string | null) {
  return useQuery({
    queryKey: ["content", "reviews", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_reviews")
        .select("*")
        .eq("content_id", id as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentReview[];
    },
  });
}

export function useContentRun(runId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ["content", "run", runId, taskId],
    enabled: Boolean(runId || taskId),
    queryFn: async () => {
      const run = runId
        ? (await supabase.from("agent_runs").select("*").eq("id", runId).maybeSingle()).data
        : null;
      const task = taskId
        ? (await supabase.from("agent_tasks").select("id, task_type, status, agent_type").eq("id", taskId).maybeSingle())
            .data
        : null;
      const costs = runId ? (await supabase.from("agent_costs").select("*").eq("run_id", runId)).data ?? [] : [];
      return { run, task, costs };
    },
  });
}

export function useSetContentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ContentStatus; note?: string | null }) => {
      const { error } = await supabase.rpc("admin_set_content_status", {
        _content_id: input.id,
        _status: input.status,
        _note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useRestoreContentVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contentId: string; versionId: string; note?: string | null }) => {
      const { error } = await supabase.rpc("admin_restore_content_version", {
        _content_id: input.contentId,
        _version_id: input.versionId,
        _note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["content"] }),
  });
}
