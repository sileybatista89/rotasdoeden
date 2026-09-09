/**
 * Fase 7E — reexporta o modelo de voos partilhado.
 * A fonte única vive em supabase/functions/_shared/ para que servidor e admin
 * usem exatamente as mesmas regras de validação, expiry e normalização.
 */
export * from "../../supabase/functions/_shared/flight-provider";
export { DuffelFlightProvider, normalizeDuffelOffer, mapDuffelError } from "../../supabase/functions/_shared/duffel-provider";

export const FLIGHT_OFFER_STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  expired: "Expirada",
  price_changed: "Preço alterado",
  unavailable: "Indisponível",
  superseded: "Substituída",
};
