/**
 * Fase 7C — regras puras de fornecedores, alojamentos, quartos,
 * componentes e tarifas/custos. Sem margem, preço de venda ou voos.
 */

export type SupplyStatus = "draft" | "under_review" | "approved" | "inactive" | "archived";
export type RelationshipStage = "prospect" | "contacted" | "negotiating" | "active" | "inactive" | "archived";
export type SupplierType =
  | "accommodation" | "guide" | "transport" | "restaurant"
  | "experience_operator" | "insurance" | "airline" | "other";
export type AccommodationType =
  | "hotel" | "resort" | "guest_house" | "local_lodging" | "eco_lodge" | "apartment" | "villa" | "other";
export type RoomType =
  | "standard" | "superior" | "premium" | "suite" | "family" | "bungalow" | "villa" | "dormitory" | "other";
export type ComponentType =
  | "accommodation" | "room" | "transport" | "transfer" | "experience"
  | "guide" | "meal" | "insurance" | "flight" | "other";
export type RateKind = "market_observed_price" | "supplier_cost" | "negotiated_rotas_rate" | "estimated_cost";
export type RateUnit = "per_person" | "per_night" | "per_room" | "per_day" | "per_group" | "per_service" | "fixed";
export type RateStatus = "observed" | "quoted" | "negotiated" | "confirmed" | "expired" | "withdrawn";
export type SourceType =
  | "official_website" | "booking_channel" | "supplier_quote" | "supplier_contract"
  | "supplier_rate_sheet" | "internal_service" | "other_verified_source";
export type MealPlan = "room_only" | "breakfast" | "half_board" | "full_board" | "all_inclusive" | "other" | "unknown";
export type CancellationType = "refundable" | "non_refundable" | "partially_refundable" | "unknown";

export const SUPPLY_STATUS_LABEL: Record<SupplyStatus, string> = {
  draft: "Rascunho",
  under_review: "Em revisão",
  approved: "Aprovado",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const RELATIONSHIP_LABEL: Record<RelationshipStage, string> = {
  prospect: "Potencial",
  contacted: "Contactado",
  negotiating: "Em negociação",
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const SUPPLIER_TYPE_LABEL: Record<SupplierType, string> = {
  accommodation: "Alojamento",
  guide: "Guia",
  transport: "Transporte",
  restaurant: "Restauração",
  experience_operator: "Operador de experiências",
  insurance: "Seguros",
  airline: "Companhia aérea",
  other: "Outro",
};

export const ACCOMMODATION_TYPE_LABEL: Record<AccommodationType, string> = {
  hotel: "Hotel",
  resort: "Resort",
  guest_house: "Guest house",
  local_lodging: "Alojamento local",
  eco_lodge: "Eco lodge",
  apartment: "Apartamento",
  villa: "Villa",
  other: "Outro",
};

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  standard: "Standard",
  superior: "Superior",
  premium: "Premium",
  suite: "Suite",
  family: "Family room",
  bungalow: "Bungalow",
  villa: "Villa",
  dormitory: "Dormitório",
  other: "Outro",
};

export const COMPONENT_TYPE_LABEL: Record<ComponentType, string> = {
  accommodation: "Alojamento",
  room: "Quarto",
  transport: "Transporte",
  transfer: "Transfer",
  experience: "Experiência",
  guide: "Guia",
  meal: "Refeição",
  insurance: "Seguro",
  flight: "Voo (estrutura futura)",
  other: "Outro",
};

export const RATE_KIND_LABEL: Record<RateKind, string> = {
  market_observed_price: "Preço público observado",
  supplier_cost: "Custo de fornecedor",
  negotiated_rotas_rate: "Tarifa Rotas do Éden",
  estimated_cost: "Custo estimado",
};

export const RATE_STATUS_LABEL: Record<RateStatus, string> = {
  observed: "Observada",
  quoted: "Cotada",
  negotiated: "Negociada",
  confirmed: "Confirmada",
  expired: "Expirada",
  withdrawn: "Retirada",
};

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  per_person: "Por pessoa",
  per_night: "Por noite",
  per_room: "Por quarto",
  per_day: "Por dia",
  per_group: "Por grupo",
  per_service: "Por serviço",
  fixed: "Valor fixo",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  official_website: "Website oficial",
  booking_channel: "Canal de reservas",
  supplier_quote: "Cotação do fornecedor",
  supplier_contract: "Contrato com fornecedor",
  supplier_rate_sheet: "Tabela de tarifas do fornecedor",
  internal_service: "Serviço interno da plataforma",
  other_verified_source: "Outra fonte verificada",
};

export const MEAL_PLAN_LABEL: Record<MealPlan, string> = {
  room_only: "Só alojamento",
  breakfast: "Pequeno-almoço",
  half_board: "Meia pensão",
  full_board: "Pensão completa",
  all_inclusive: "Tudo incluído",
  other: "Outro",
  unknown: "Desconhecido",
};

export const CANCELLATION_LABEL: Record<CancellationType, string> = {
  refundable: "Reembolsável",
  non_refundable: "Não reembolsável",
  partially_refundable: "Parcialmente reembolsável",
  unknown: "Desconhecido",
};

/** Fontes que suportam documento/contrato de referência. */
export const DOCUMENT_BACKED_SOURCES: SourceType[] = [
  "supplier_quote",
  "supplier_contract",
  "supplier_rate_sheet",
];

export interface RateInput {
  component_id?: string | null;
  rate_kind?: RateKind | null;
  price?: number | null;
  currency?: string | null;
  unit?: RateUnit | null;
  source_type?: SourceType | null;
  observed_at?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  validity_unknown?: boolean;
  status?: RateStatus;
  occupancy_adults?: number | null;
  occupancy_children?: number | null;
  occupancy_total?: number | null;
}

/**
 * Bloqueia um custo comercial sem fonte, moeda, unidade, preço,
 * validade impossível ou ocupação incompatível.
 */
export function validateRate(input: RateInput): string | null {
  if (!input.component_id) return "Escolhe o componente ao qual a tarifa pertence.";
  if (!input.rate_kind) return "Indica se é preço observado, custo de fornecedor ou tarifa Rotas.";
  if (input.price === null || input.price === undefined || Number.isNaN(input.price) || input.price < 0) {
    return "O valor tem de ser um número igual ou superior a zero.";
  }
  if (!input.currency || !/^[A-Z]{3}$/.test(input.currency)) return "Indica a moeda (por exemplo EUR).";
  if (!input.unit) return "Indica a unidade da tarifa.";
  if (!input.source_type) return "A fonte do valor é obrigatória.";
  if (!input.observed_at) return "Indica a data em que o valor foi observado.";
  if (new Date(input.observed_at).getTime() > Date.now() + 86_400_000) {
    return "A data de observação não pode estar no futuro.";
  }
  if (input.valid_from && input.valid_until && input.valid_until < input.valid_from) {
    return "A validade final não pode ser anterior à inicial.";
  }
  if (input.validity_unknown === false && !input.valid_until && !input.valid_from) {
    return "Indica a validade ou marca-a como desconhecida.";
  }
  const adults = input.occupancy_adults ?? null;
  const children = input.occupancy_children ?? null;
  const total = input.occupancy_total ?? null;
  if (total !== null && adults !== null && children !== null && total < adults + children) {
    return "A ocupação total não pode ser inferior a adultos mais crianças.";
  }
  if (input.status === "confirmed") {
    const problem = validateConfirmation({ ...input, status: "confirmed" });
    if (problem) return problem;
  }
  return null;
}

/** Um custo só pode ser confirmado com validade conhecida e não expirada. */
export function validateConfirmation(input: RateInput): string | null {
  if (input.rate_kind === "market_observed_price") {
    return "Um preço público observado não pode ser confirmado como custo da Rotas do Éden.";
  }
  if (input.validity_unknown !== false) {
    return "Um custo confirmado precisa de validade conhecida.";
  }
  if (input.valid_until && new Date(input.valid_until) < new Date(new Date().toDateString())) {
    return "Não é possível confirmar uma tarifa já expirada.";
  }
  return null;
}

/** Uma tarifa expirada nunca conta como custo confirmado atual. */
export function isUsableAsCurrentCost(rate: {
  status: RateStatus;
  rate_kind: RateKind;
  valid_until?: string | null;
  validity_unknown?: boolean;
}, today = new Date()): boolean {
  if (rate.status !== "confirmed") return false;
  if (rate.rate_kind === "market_observed_price") return false;
  if (rate.validity_unknown) return false;
  if (rate.valid_until && new Date(rate.valid_until) < new Date(today.toDateString())) return false;
  return true;
}

export function isExpired(rate: { status: RateStatus; valid_until?: string | null }, today = new Date()): boolean {
  if (rate.status === "expired") return true;
  return !!rate.valid_until && new Date(rate.valid_until) < new Date(today.toDateString());
}

/** Rascunhos e revisões não estão aprovados para venda. */
export function isApprovedForCommercialUse(status: SupplyStatus): boolean {
  return status === "approved";
}

export function canTransitionSupply(from: SupplyStatus, to: SupplyStatus): boolean {
  const allowed: Record<SupplyStatus, SupplyStatus[]> = {
    draft: ["under_review", "archived"],
    under_review: ["draft", "approved", "archived"],
    approved: ["inactive", "archived"],
    inactive: ["under_review", "approved", "archived"],
    archived: ["draft"],
  };
  return allowed[from].includes(to);
}

/** Estados fechados preservam o histórico e não podem ser reabertos. */
export function canTransitionRate(from: RateStatus, to: RateStatus): boolean {
  if (from === "expired" || from === "withdrawn") return to === "expired" || to === "withdrawn";
  return true;
}

export function formatRateAmount(price: number, currency: string, unit: RateUnit): string {
  return `${new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(price)} · ${RATE_UNIT_LABEL[unit].toLowerCase()}`;
}
