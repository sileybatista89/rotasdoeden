import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

async function callStays(body: Record<string, unknown>) {
  const { data, error } = await anyDb.functions.invoke("accommodation-engine", { body });
  if (error && !data) throw new Error(error.message ?? "Falha de ligação.");
  if (data?.error) throw new Error(data.error);
  return data;
}

export interface StaysConfig {
  provider: string;
  mode: "test" | "live";
  configured: boolean;
  enabled: boolean;
  booking_supported: boolean;
  note: string;
}

export function useStaysConfig() {
  return useQuery({
    queryKey: ["stays-config"],
    queryFn: async () => (await callStays({ action: "config" })) as StaysConfig,
    staleTime: 5 * 60 * 1000,
  });
}

export interface StayOfferRow {
  id: string;
  kind: string;
  status: string;
  accommodation_name: string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  total_amount: number | null;
  total_currency: string | null;
  cancellation_type: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useStayOffers() {
  return useQuery({
    queryKey: ["stay-offers"],
    queryFn: async () => ((await callStays({ action: "offers" })).offers ?? []) as StayOfferRow[],
  });
}

export function useComponents() {
  return useQuery({
    queryKey: ["stays-components"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("package_components").select("id,name").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export function useImportStayRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId, componentId }: { offerId: string; componentId: string }) =>
      callStays({ action: "import_rate", offer_id: offerId, component_id: componentId }),
    onSuccess: () => {
      ["stay-offers", "component-rates", "supply-readiness", "supply-stats"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
  });
}
