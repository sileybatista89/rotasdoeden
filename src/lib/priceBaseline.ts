/**
 * Fase 13 — reexporta a lógica do preço de referência ("desde €X").
 * A fonte única vive em supabase/functions/_shared/price-baseline.ts para que
 * o servidor e o admin usem exatamente a mesma regra.
 */
export * from "../../supabase/functions/_shared/price-baseline";
