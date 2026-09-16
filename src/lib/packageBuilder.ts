/**
 * Fase 8, reexporta o configurador de pacote partilhado.
 * A fonte única vive em supabase/functions/_shared/package-builder.ts para que
 * o servidor e o site usem exatamente as mesmas regras.
 */
export * from "../../supabase/functions/_shared/package-builder";
