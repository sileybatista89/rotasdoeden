import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AccommodationType, CancellationType, ComponentType, MealPlan, RateKind,
  RateStatus, RateUnit, RelationshipStage, RoomType, SourceType, SupplierType, SupplyStatus,
} from "@/lib/supply";

export interface Supplier {
  id: string;
  legal_name: string;
  trading_name: string | null;
  supplier_type: SupplierType;
  country: string;
  locality: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  relationship_stage: RelationshipStage;
  status: SupplyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Accommodation {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  accommodation_type: AccommodationType;
  address: string | null;
  locality_name: string | null;
  country: string;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  star_rating: number | null;
  rating_source: string | null;
  amenities: unknown;
  images: unknown;
  status: SupplyStatus;
  created_at: string;
}

export interface AccommodationRoom {
  id: string;
  accommodation_id: string;
  room_name: string;
  room_type: RoomType;
  max_adults: number | null;
  max_children: number | null;
  max_guests: number | null;
  size_sqm: number | null;
  bed_configuration: string | null;
  capacity_source: string | null;
  status: SupplyStatus;
  created_at: string;
}

export interface PackageComponent {
  id: string;
  component_type: ComponentType;
  name: string;
  description: string | null;
  supplier_id: string | null;
  accommodation_id: string | null;
  room_id: string | null;
  service_id: string | null;
  guide_profile_id: string | null;
  status: SupplyStatus;
  created_at: string;
}

export interface ComponentRate {
  id: string;
  component_id: string;
  supplier_id: string | null;
  rate_kind: RateKind;
  price: number;
  currency: string;
  unit: RateUnit;
  quantity: number;
  occupancy_adults: number | null;
  occupancy_children: number | null;
  occupancy_total: number | null;
  meal_plan: MealPlan;
  cancellation_type: CancellationType;
  cancellation_summary: string | null;
  source_type: SourceType;
  source_reference: string | null;
  source_document_url: string | null;
  observed_at: string;
  valid_from: string | null;
  valid_until: string | null;
  validity_unknown: boolean;
  status: RateStatus;
  notes: string | null;
  created_at: string;
}

const anyDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function useSupplyStats() {
  return useQuery({
    queryKey: ["supply-stats"],
    queryFn: async () => {
      const { data, error } = await anyDb.rpc("supply_stats");
      if (error) throw new Error(error.message);
      return data as Record<string, number>;
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Supplier[];
    },
  });
}

export function useAccommodations(supplierId: string | null) {
  return useQuery({
    queryKey: ["accommodations", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("accommodations").select("*").eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Accommodation[];
    },
  });
}

export function useRooms(accommodationId: string | null) {
  return useQuery({
    queryKey: ["accommodation-rooms", accommodationId],
    enabled: !!accommodationId,
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("accommodation_rooms").select("*").eq("accommodation_id", accommodationId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AccommodationRoom[];
    },
  });
}

export function useComponents() {
  return useQuery({
    queryKey: ["package-components"],
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("package_components").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PackageComponent[];
    },
  });
}

export function useComponentRates(componentId: string | null) {
  return useQuery({
    queryKey: ["component-rates", componentId],
    enabled: !!componentId,
    queryFn: async () => {
      const { data, error } = await anyDb
        .from("component_rates").select("*").eq("component_id", componentId)
        .order("observed_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ComponentRate[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["suppliers", "accommodations", "accommodation-rooms", "package-components", "component-rates", "supply-stats"]) {
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

export const useSaveSupplier = rpcMutation<Record<string, unknown>>("admin_save_supplier", (p) => ({ _payload: p }));
export const useSaveAccommodation = rpcMutation<Record<string, unknown>>("admin_save_accommodation", (p) => ({ _payload: p }));
export const useSaveRoom = rpcMutation<Record<string, unknown>>("admin_save_room", (p) => ({ _payload: p }));
export const useSaveComponent = rpcMutation<Record<string, unknown>>("admin_save_component", (p) => ({ _payload: p }));
export const useSaveRate = rpcMutation<Record<string, unknown>>("admin_save_rate", (p) => ({ _payload: p }));

export const useSetSupplyStatus = rpcMutation<{ entity: string; id: string; status: SupplyStatus; note?: string }>(
  "admin_set_supply_status",
  (v) => ({ _entity: v.entity, _entity_id: v.id, _status: v.status, _note: v.note ?? null }),
);

export const useSetRateStatus = rpcMutation<{ rateId: string; status: RateStatus; note?: string }>(
  "admin_set_rate_status",
  (v) => ({ _rate_id: v.rateId, _status: v.status, _note: v.note ?? null }),
);

export interface SupplyReadiness {
  suppliers: { total: number; approved: number; inactive: number };
  services: { total: number; approved_active: number; without_commercial_link: number };
  accommodations: { total: number; rooms: number };
  components: {
    total: number; ready: number; without_supplier: number;
    not_approved: number; without_rate: number; without_eligible_rate: number;
  };
  rates: { total: number; eligible: number; expired: number; without_source: number; unknown_validity: number };
  catalog: { total: number; linked_component: number; linked_service: number; editorial_only: number };
  products: { slug: string; name: string; status: string; has_version: boolean; linked_components: number }[];
  generated_at: string;
}

/** Indicadores do que falta para o inventário poder gerar propostas reais. */
export function useSupplyReadiness() {
  return useQuery({
    queryKey: ["supply-readiness"],
    queryFn: async () => {
      const { data, error } = await anyDb.rpc("supply_readiness");
      if (error) throw new Error(error.message);
      return data as unknown as SupplyReadiness;
    },
  });
}
