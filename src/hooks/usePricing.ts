import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ComponentRule, FeeRule, FlightProtectionRule, MarginMode, OperationalCostRule,
  PolicyStatus, PricingComponentType, PricingResult, RoundingMode, SupplementRule,
} from "@/lib/pricing";

export interface PricingPolicy {
  id: string;
  name: string;
  description: string | null;
  base_currency: string;
  status: PolicyStatus;
  current_version_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingPolicyVersionRow {
  id: string;
  policy_id: string;
  version_number: number;
  status: PolicyStatus;
  base_currency: string;
  margin_mode: MarginMode;
  min_margin_pct: number;
  target_margin_pct: number;
  component_rules: Partial<Record<PricingComponentType, ComponentRule>>;
  flight_protection: FlightProtectionRule;
  fees: FeeRule[];
  supplements: SupplementRule[];
  operational_costs: OperationalCostRule[];
  rounding_mode: RoundingMode;
  valid_from: string | null;
  valid_until: string | null;
  change_reason: string | null;
  created_at: string;
  activated_at: string | null;
}

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

export function usePricingStats() {
  return useQuery({
    queryKey: ["pricing-stats"],
    queryFn: async () => {
      const { data, error } = await anyDb.rpc("pricing_stats");
      if (error) throw new Error(error.message);
      return (data ?? {}) as Record<string, number>;
    },
  });
}

export function usePricingPolicies() {
  return useQuery({
    queryKey: ["pricing-policies"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("pricing_policies").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PricingPolicy[];
    },
  });
}

export function usePolicyVersions(policyId: string | null) {
  return useQuery({
    queryKey: ["pricing-policy-versions", policyId],
    enabled: !!policyId,
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("pricing_policy_versions").select("*").eq("policy_id", policyId)
        .order("version_number", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PricingPolicyVersionRow[];
    },
  });
}

export function usePricingCalculations() {
  return useQuery({
    queryKey: ["pricing-calculations"],
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("pricing_calculations").select("*").order("created_at", { ascending: false }).limit(25);
      if (error) throw new Error(error.message);
      return (data ?? []) as Record<string, unknown>[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["pricing-policies", "pricing-policy-versions", "pricing-stats", "pricing-calculations"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

function rpcMutation<TVars>(fn: string, build: (vars: TVars) => Record<string, unknown>) {
  return function useRpc() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: async (vars: TVars) => {
        const { data, error } = await anyDb.rpc(fn, build(vars));
        if (error) throw new Error(error.message);
        return data;
      },
      onSuccess: invalidate,
    });
  };
}

export const useSavePricingPolicy = rpcMutation<Record<string, unknown>>("admin_save_pricing_policy", (p) => ({ _payload: p }));
export const useSavePolicyVersion = rpcMutation<Record<string, unknown>>("admin_save_policy_version", (p) => ({ _payload: p }));
export const useSetPolicyVersionStatus = rpcMutation<{ versionId: string; status: PolicyStatus; note?: string }>(
  "admin_set_policy_version_status",
  (v) => ({ _version_id: v.versionId, _status: v.status, _note: v.note ?? null }),
);

/** Simulação: o cálculo é sempre feito no servidor. */
export function useSimulatePricing() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (vars: {
      componentIds: string[]; durationDays: number; nights: number;
      adults: number; children: number; rooms: number; referenceDate: string; persist?: boolean;
      productId?: string | null;
    }) => {
      const { data, error } = await anyDb.functions.invoke("pricing-engine", {
        body: {
          component_ids: vars.componentIds,
          duration_days: vars.durationDays,
          nights: vars.nights,
          adults: vars.adults,
          children: vars.children,
          rooms: vars.rooms,
          reference_date: vars.referenceDate,
          product_id: vars.productId ?? null,
          persist: vars.persist ?? false,
        },
      });
      if (error) throw new Error(error.message ?? "Falha no motor de preços");
      if (data?.error) throw new Error(data.error);
      return data.result as PricingResult;
    },
    onSuccess: invalidate,
  });
}
