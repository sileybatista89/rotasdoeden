/**
 * Fase 7D — reexporta o Pricing Engine partilhado.
 * A fonte única vive em supabase/functions/_shared/pricing-engine.ts para que
 * o servidor e o admin usem exatamente a mesma matemática.
 */
export * from "../../supabase/functions/_shared/pricing-engine";
