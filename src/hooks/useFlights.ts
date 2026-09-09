import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CabinClass, RepriceResult } from "@/lib/flights";

export interface FlightSearchRow {
  id: string;
  provider: string;
  provider_mode: string;
  provider_offer_request_id: string | null;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
  max_connections: number | null;
  status: "ok" | "failed";
  error_code: string | null;
  offers_count: number;
  duration_ms: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface FlightOfferRow {
  id: string;
  search_id: string | null;
  provider: string;
  provider_offer_id: string;
  provider_offer_request_id: string | null;
  total_amount: number;
  total_currency: string;
  owner_carrier: string | null;
  owner_name: string | null;
  slices: unknown[];
  requires_instant_payment: boolean;
  hold_capable: boolean;
  payment_required_by: string | null;
  expires_at: string | null;
  refreshed_at: string | null;
  last_reprice: RepriceResult | null;
  status: string;
  created_at: string;
}

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

async function callFlightEngine(body: Record<string, unknown>) {
  const { data, error } = await anyDb.functions.invoke("flight-engine", { body });
  if (error) {
    const detail = typeof data?.error === "string" ? data.error : error.message;
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useFlightConfig() {
  return useQuery({
    queryKey: ["flight-config"],
    queryFn: async () => {
      const data = await callFlightEngine({ action: "config" });
      return data as { provider: string; mode: string; configured: boolean };
    },
    retry: false,
  });
}

export function useFlightStats() {
  return useQuery({
    queryKey: ["flight-stats"],
    queryFn: async () => {
      const { data, error } = await anyDb.rpc("flight_stats");
      if (error) throw new Error(error.message);
      return (data ?? {}) as Record<string, number | string | null>;
    },
  });
}

export function useFlightSearches(limit = 20) {
  return useQuery({
    queryKey: ["flight-searches", limit],
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("flight_searches").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as FlightSearchRow[];
    },
  });
}

export function useFlightOffers(searchId: string | null) {
  return useQuery({
    queryKey: ["flight-offers", searchId],
    enabled: !!searchId,
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("flight_offers").select("*").eq("search_id", searchId).order("total_amount", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as FlightOfferRow[];
    },
  });
}

export interface FlightSearchInput {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string | null;
  adults: number;
  children?: number;
  infants?: number;
  cabin: CabinClass;
  max_connections?: number | null;
}

export function useFlightSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FlightSearchInput) => {
      const data = await callFlightEngine({ action: "search", ...input });
      return data as { search_id: string; cached: boolean; offers: FlightOfferRow[]; count: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flight-searches"] });
      qc.invalidateQueries({ queryKey: ["flight-stats"] });
    },
  });
}

export function useRefreshFlightOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (providerOfferId: string) => {
      const data = await callFlightEngine({ action: "refresh_offer", provider_offer_id: providerOfferId });
      return data.reprice as RepriceResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flight-offers"] });
      qc.invalidateQueries({ queryKey: ["flight-stats"] });
    },
  });
}
