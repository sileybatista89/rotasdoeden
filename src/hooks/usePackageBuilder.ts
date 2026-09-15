import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/attribution";
import type { BuilderProduct, CatalogItem, DaySelection } from "@/lib/packageBuilder";

const TOKEN_KEY = "rde_builder_token";

const fn = supabase as unknown as {
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

async function call(body: Record<string, unknown>) {
  const { data, error } = await fn.functions.invoke("package-builder", { body });
  if (error) throw new Error(error.message ?? "Falha de ligação.");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useCatalogItems() {
  return useQuery({
    queryKey: ["builder-catalog"],
    queryFn: async () => ((await call({ action: "catalog" })).items ?? []) as CatalogItem[],
    staleTime: 5 * 60 * 1000,
  });
}

/** Regras do produto vindas do servidor (travel_products.builder_config). */
export function useBuilderProduct(slug: string) {
  return useQuery({
    queryKey: ["builder-product", slug],
    queryFn: async () => (await call({ action: "product", product_slug: slug })).product as BuilderProduct,
    staleTime: 5 * 60 * 1000,
  });
}

export interface PublicBaseline {
  currency: string | null;
  price_per_person: number;
  duration_days: number | null;
  adults: number | null;
  indicative: boolean;
  computed_at: string;
}

/** "Desde €X" calculado no servidor pelo Pricing Engine. Nunca hardcoded. */
export function useProductBaseline(slug: string) {
  return useQuery({
    queryKey: ["builder-baseline", slug],
    queryFn: async () =>
      ((await call({ action: "baseline", product_slug: slug })).baseline ?? null) as PublicBaseline | null,
    staleTime: 10 * 60 * 1000,
  });
}

export interface BuilderConfig {
  durationDays: number;
  adults: number;
  children: number;
  rooms: number;
  startDate: string | null;
  selections: DaySelection[];
}

/** Cada produto tem a sua própria viagem guardada no dispositivo. */
export function builderTokenKey(productSlug: string) {
  return productSlug === "rotas-essencial" ? TOKEN_KEY : `${TOKEN_KEY}_${productSlug}`;
}

/**
 * Guarda a configuração do visitante no servidor através de um token opaco.
 * O token vive apenas no dispositivo; as tabelas não são acessíveis diretamente.
 */
export function useBuilderSession(productSlug: string, defaultDurationDays: number) {
  const storageKey = builderTokenKey(productSlug);
  const [config, setConfig] = useState<BuilderConfig>({
    durationDays: defaultDurationDays,
    adults: 2,
    children: 0,
    rooms: 1,
    startDate: null,
    selections: [],
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setRestored(true); return; }
      try {
        const data = await call({ action: "get", session_token: token });
        if (!active) return;
        const c = data.config;
        setConfig({
          durationDays: c.duration_days,
          adults: c.adults,
          children: c.children,
          rooms: c.rooms,
          startDate: c.start_date,
          selections: c.selections ?? [],
        });
      } catch {
        localStorage.removeItem(storageKey);
        if (active) setToken(null);
      } finally {
        if (active) setRestored(true);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (next: BuilderConfig) => {
    setStatus("saving");
    try {
      const data = await call({
        action: "save",
        product_slug: productSlug,
        session_token: token,
        visitor_id: getVisitorId(),
        duration_days: next.durationDays,
        adults: next.adults,
        children: next.children,
        rooms: next.rooms,
        start_date: next.startDate,
        selections: next.selections,
      });
      if (data.session_token && data.session_token !== token) {
        localStorage.setItem(storageKey, data.session_token);
        setToken(data.session_token);
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [productSlug, token]);

  const update = useCallback((updater: (prev: BuilderConfig) => BuilderConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      void persist(next);
      return next;
    });
  }, [persist]);

  const submit = useCallback(async (contact: { name: string; email: string; phone?: string; notes?: string }) => {
    let current = token;
    if (!current) {
      await persist(config);
      current = localStorage.getItem(storageKey);
    }
    if (!current) throw new Error("Não foi possível guardar a viagem. Tente de novo.");
    return call({
      action: "submit",
      session_token: current,
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone ?? null,
      notes: contact.notes ?? null,
    });
  }, [config, persist, token]);

  return { config, update, submit, status, restored };
}
