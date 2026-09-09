import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TravelProductStatus, TravelProductType } from "@/lib/travelProducts";

export interface TravelProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  product_type: TravelProductType;
  minimum_days: number;
  maximum_days: number | null;
  minimum_nights: number;
  maximum_nights: number | null;
  status: TravelProductStatus;
  current_version_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TravelProductVersion {
  id: string;
  product_id: string;
  version_number: number;
  duration_days: number;
  nights: number;
  terms: string | null;
  change_reason: string | null;
  included_components: unknown;
  status: "draft" | "published" | "archived";
  created_at: string;
  published_at: string | null;
}

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function useTravelProductStats() {
  return useQuery({
    queryKey: ["travel-product-stats"],
    queryFn: async () => {
      const { data, error } = await anyDb.rpc("travel_product_stats");
      if (error) throw new Error(error.message);
      return data as Record<string, number>;
    },
  });
}

export function useTravelProducts() {
  return useQuery({
    queryKey: ["travel-products"],
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("travel_products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as TravelProduct[];
    },
  });
}

export function useTravelProductVersions(productId: string | null) {
  return useQuery({
    queryKey: ["travel-product-versions", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("travel_product_versions")
        .select("*")
        .eq("product_id", productId)
        .order("version_number", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TravelProductVersion[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["travel-products"] });
    qc.invalidateQueries({ queryKey: ["travel-product-versions"] });
    qc.invalidateQueries({ queryKey: ["travel-product-stats"] });
  };
}

export function useSaveTravelProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await anyDb.rpc("admin_save_travel_product", { _payload: payload });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useSetTravelProductStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (vars: { productId: string; status: TravelProductStatus; note?: string }) => {
      const { data, error } = await anyDb.rpc("admin_set_travel_product_status", {
        _product_id: vars.productId,
        _status: vars.status,
        _note: vars.note ?? null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCreateProductVersion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await anyDb.rpc("admin_create_product_version", { _payload: payload });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function usePublishProductVersion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (vars: { versionId: string; note?: string }) => {
      const { data, error } = await anyDb.rpc("admin_publish_product_version", {
        _version_id: vars.versionId,
        _note: vars.note ?? null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}
