/**
 * Fase 11, reexporta o modelo de alojamento partilhado.
 * A fonte única vive em supabase/functions/_shared/ para que servidor e admin
 * usem exatamente as mesmas regras de normalização, expiry e proveniência.
 */
export * from "../../supabase/functions/_shared/accommodation-provider";
export {
  DuffelStaysProvider,
  normalizeDuffelStayQuote,
  normalizeDuffelStayRate,
  normalizeDuffelStayResult,
  mapStaysError,
} from "../../supabase/functions/_shared/duffel-stays-provider";

export const STAYS_CANCELLATION_LABEL: Record<string, string> = {
  refundable: "Reembolsável",
  non_refundable: "Não reembolsável",
  partially_refundable: "Parcialmente reembolsável",
  unknown: "Desconhecido",
};
