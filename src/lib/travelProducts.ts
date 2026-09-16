/**
 * Fase 7B, regras puras dos produtos de pacote.
 * Sem preços, custos, fornecedores ou voos: só identidade e duração.
 */

export type TravelProductType = "standard_package" | "custom_package";
export type TravelProductStatus = "draft" | "under_review" | "published" | "archived";
export type TravelProductVersionStatus = "draft" | "published" | "archived";

export const PRODUCT_STATUS_LABEL: Record<TravelProductStatus, string> = {
  draft: "Rascunho",
  under_review: "Em revisão",
  published: "Publicado",
  archived: "Arquivado",
};

export const VERSION_STATUS_LABEL: Record<TravelProductVersionStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
};

export const PRODUCT_TYPE_LABEL: Record<TravelProductType, string> = {
  standard_package: "Pacote padrão",
  custom_package: "Pacote à medida",
};

/** Os quatro produtos comerciais oficiais. Nenhum outro deve existir nesta fase. */
export const OFFICIAL_PRODUCTS = [
  { slug: "rotas-essencial", name: "Rotas Essencial", type: "standard_package", minDays: 5, maxDays: 7 },
  { slug: "rotas-explorar", name: "Rotas Explorar", type: "standard_package", minDays: 8, maxDays: 10 },
  { slug: "rotas-imersao", name: "Rotas Imersão", type: "standard_package", minDays: 14, maxDays: 15 },
  { slug: "rotas-a-medida", name: "Rotas à Medida", type: "custom_package", minDays: 5, maxDays: null },
] as const satisfies readonly {
  slug: string;
  name: string;
  type: TravelProductType;
  minDays: number;
  maxDays: number | null;
}[];

export interface DurationRange {
  minimum_days: number;
  maximum_days: number | null;
}

export function validateDurationRange(range: DurationRange): string | null {
  if (!Number.isInteger(range.minimum_days) || range.minimum_days < 1) {
    return "A duração mínima tem de ser pelo menos 1 dia.";
  }
  if (range.maximum_days !== null) {
    if (!Number.isInteger(range.maximum_days) || range.maximum_days < 1) {
      return "A duração máxima tem de ser um número de dias válido.";
    }
    if (range.maximum_days < range.minimum_days) {
      return "A duração máxima não pode ser inferior à mínima.";
    }
  }
  return null;
}

export function isDurationWithinProduct(days: number, range: DurationRange): boolean {
  if (!Number.isInteger(days) || days < 1) return false;
  if (days < range.minimum_days) return false;
  if (range.maximum_days !== null && days > range.maximum_days) return false;
  return true;
}

export function defaultNights(days: number): number {
  return Math.max(days - 1, 0);
}

export function formatDuration(range: DurationRange): string {
  if (range.maximum_days === null) return `${range.minimum_days}+ dias`;
  if (range.maximum_days === range.minimum_days) return `${range.minimum_days} dias`;
  return `${range.minimum_days}-${range.maximum_days} dias`;
}

/** Transições permitidas. Publicar é sempre um ato humano após revisão. */
export function canTransition(from: TravelProductStatus, to: TravelProductStatus): boolean {
  const allowed: Record<TravelProductStatus, TravelProductStatus[]> = {
    draft: ["under_review", "archived"],
    under_review: ["draft", "published", "archived"],
    published: ["archived"],
    archived: ["draft"],
  };
  return allowed[from].includes(to);
}

export function isVersionEditable(status: TravelProductVersionStatus): boolean {
  return status === "draft";
}
