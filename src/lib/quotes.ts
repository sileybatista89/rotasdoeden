/**
 * Fase 7G, reexporta o Quote Engine partilhado.
 * A fonte única vive em supabase/functions/_shared/quote-engine.ts para que
 * o servidor e o admin usem exatamente as mesmas regras.
 */
export * from "../../supabase/functions/_shared/quote-engine";
