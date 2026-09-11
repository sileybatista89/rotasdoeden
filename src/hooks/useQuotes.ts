import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QuoteStatus } from "@/lib/quotes";

export interface QuoteRow {
  id: string;
  quote_number: string;
  product_id: string | null;
  product_version_id: string | null;
  status: QuoteStatus;
  sale_currency: string;
  current_version_id: string | null;
  version_count: number;
  channel: string;
  visitor_id: string | null;
  attribution: Record<string, unknown>;
  customer_name: string | null;
  customer_email: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  accepted_at?: string | null;
  accepted_version_id?: string | null;
  accepted_channel?: string | null;
  requires_reacceptance?: boolean;
  package_booking_id?: string | null;
  last_revalidated_at?: string | null;
}

export interface QuoteVersionRow {
  id: string;
  quote_id: string;
  version_number: number;
  status: QuoteStatus;
  customer_criteria: Record<string, any>;
  policy_version_id: string | null;
  policy_version_number: number | null;
  pricing_calculation_id: string | null;
  pricing_status: string | null;
  total_cost: number;
  total_price: number;
  cost_currency: string | null;
  sale_currency: string | null;
  fx_rate: number | null;
  flight_provider_offer_id: string | null;
  flight_expires_at: string | null;
  flight_snapshot: Record<string, any> | null;
  valid_until: string | null;
  validity_limited_by: string | null;
  confirmable: boolean;
  blocking_reasons: string[];
  warnings: string[];
  change_reason: string | null;
  previous_version_id: string | null;
  previous_price: number | null;
  price_difference: number | null;
  created_at: string;
  superseded_at: string | null;
}

export interface QuoteItemRow {
  id: string;
  line_order: number;
  display_name: string;
  component_type: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  total_cost: number;
  rule_mode: string | null;
  rule_pct: number | null;
  selling_price: number;
  currency: string | null;
  rate_kind: string | null;
  source_type: string | null;
  rate_valid_until: string | null;
  validity_unknown: boolean;
  cancellation_summary: string | null;
  estimated: boolean;
}

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

async function callQuoteEngine(body: Record<string, unknown>) {
  const { data, error } = await anyDb.functions.invoke("quote-engine", { body });
  if (error) throw new Error(typeof data?.error === "string" ? data.error : error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useQuoteStats() {
  return useQuery({
    queryKey: ["quote-stats"],
    queryFn: async () => {
      const { data, error } = await anyDb.rpc("quote_stats");
      if (error) throw new Error(error.message);
      return (data ?? {}) as Record<string, number>;
    },
  });
}

export interface QuoteFilters {
  status?: string;
  productId?: string;
  currency?: string;
  channel?: string;
  from?: string;
  to?: string;
}

export function useQuotes(filters: QuoteFilters = {}, limit = 50) {
  return useQuery({
    queryKey: ["quotes", filters, limit],
    queryFn: async () => {
      let q = anyDb.from("travel_quotes").select("*").order("created_at", { ascending: false }).limit(limit);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.productId) q = q.eq("product_id", filters.productId);
      if (filters.currency) q = q.eq("sale_currency", filters.currency);
      if (filters.channel) q = q.eq("channel", filters.channel);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as QuoteRow[];
      const versionIds = rows
        .map((r) => (r as unknown as { current_version_id?: string | null }).current_version_id)
        .filter((v): v is string => !!v);
      if (versionIds.length === 0) return rows;
      const { data: versions } = await anyDb
        .from("travel_quote_versions")
        .select("id,total_price,sale_currency")
        .in("id", versionIds);
      const priceById = new Map<string, { total_price: number; sale_currency: string }>(
        ((versions ?? []) as { id: string; total_price: number; sale_currency: string }[]).map((v) => [
          v.id,
          { total_price: v.total_price, sale_currency: v.sale_currency },
        ]),
      );
      return rows.map((r) => {
        const vid = (r as unknown as { current_version_id?: string | null }).current_version_id;
        const p = vid ? priceById.get(vid) : undefined;
        return { ...r, total_price: p?.total_price ?? null, sale_currency: p?.sale_currency ?? r.sale_currency };
      }) as QuoteRow[];
    },

  });
}

export function useQuoteDetail(quoteId: string | null) {
  return useQuery({
    queryKey: ["quote-detail", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const data = await callQuoteEngine({ action: "get", quote_id: quoteId });
      return data as { quote: QuoteRow; versions: QuoteVersionRow[]; items: QuoteItemRow[] };
    },
  });
}

export function useRepriceQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => callQuoteEngine({ action: "reprice", quote_id: quoteId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote-detail"] });
      qc.invalidateQueries({ queryKey: ["quote-stats"] });
    },
  });
}

export function useSetQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quoteId, status, note }: { quoteId: string; status: QuoteStatus; note?: string }) => {
      const { error } = await anyDb.rpc("admin_set_quote_status", {
        _quote_id: quoteId, _status: status, _note: note ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote-detail"] });
      qc.invalidateQueries({ queryKey: ["quote-stats"] });
    },
  });
}

export function useIssueQuoteToken() {
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const data = await callQuoteEngine({ action: "issue_token", quote_id: quoteId });
      return data as { token: string; expires_at: string };
    },
  });
}

// ===== Fase 7I — aceitação, revalidação e reserva de pacote =====

export interface QuoteAcceptanceFields {
  accepted_at: string | null;
  accepted_version_id: string | null;
  accepted_channel: string | null;
  requires_reacceptance: boolean;
  package_booking_id: string | null;
  last_revalidated_at: string | null;
}

export interface QuoteRevalidationRow {
  id: string;
  quote_id: string;
  quote_version_id: string;
  new_quote_version_id: string | null;
  outcome: "unchanged" | "changed_within_tolerance" | "changed_requires_reacceptance" | "blocked" | "failed";
  previous_price: number | null;
  new_price: number | null;
  price_difference: number | null;
  price_difference_pct: number | null;
  currency: string | null;
  pricing_status: string | null;
  blocking_reasons: string[];
  flight_note: string | null;
  requires_reacceptance: boolean;
  created_at: string;
}

export const REVALIDATION_OUTCOME_LABEL: Record<QuoteRevalidationRow["outcome"], string> = {
  unchanged: "Sem alteração",
  changed_within_tolerance: "Alterada dentro da tolerância",
  changed_requires_reacceptance: "Precisa de nova aceitação",
  blocked: "Bloqueada",
  failed: "Falhou",
};

async function callPackageBooking(body: Record<string, unknown>) {
  const { data, error } = await anyDb.functions.invoke("package-booking", { body });
  if (error && !data) throw new Error(error.message);
  return data;
}

export function useQuoteRevalidations(quoteId: string | null) {
  return useQuery({
    queryKey: ["quote-revalidations", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await anyDb.from("quote_revalidations").select("*")
        .eq("quote_id", quoteId).order("created_at", { ascending: false }).limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as QuoteRevalidationRow[];
    },
  });
}

export function usePackageBookingForQuote(quoteId: string | null) {
  return useQuery({
    queryKey: ["package-booking-for-quote", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await anyDb.from("package_bookings").select("*")
        .eq("quote_id", quoteId).order("created_at", { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return ((data ?? [])[0] ?? null) as Record<string, any> | null;
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ["quotes", "quote-detail", "quote-stats", "quote-revalidations", "package-booking-for-quote"]
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useRevalidateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => callPackageBooking({ action: "revalidate", quote_id: quoteId }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCreatePackageBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => callPackageBooking({ action: "create", quote_id: quoteId }),
    onSuccess: () => invalidateAll(qc),
  });
}
