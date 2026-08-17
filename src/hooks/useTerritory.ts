import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface District {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface Locality {
  id: string;
  district_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export function useTerritory() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: l }] = await Promise.all([
      supabase.from("districts").select("id, name, slug, sort_order, is_active").order("sort_order"),
      supabase.from("localities").select("id, district_id, name, slug, is_active").order("name"),
    ]);
    setDistricts((d ?? []) as District[]);
    setLocalities((l ?? []) as Locality[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const localitiesOf = (districtId?: string | null) =>
    districtId ? localities.filter((l) => l.district_id === districtId && l.is_active) : [];

  return { districts, localities, localitiesOf, loading, reload: load };
}
