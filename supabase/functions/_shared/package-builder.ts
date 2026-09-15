/**
 * Fase 8 — Configurador de pacote (lógica pura, sem I/O).
 *
 * Regras desta camada:
 *  - NÃO existe matemática de preço aqui. O preço continua a vir apenas do
 *    Pricing Engine (Fase 7D) através do Quote Engine (Fase 7G).
 *  - O catálogo editorial é descoberta. Só é reservável o item que estiver
 *    ligado a um serviço real ou a um componente de pacote real.
 *  - A repetição do mesmo local em dias diferentes é permitida por desenho.
 */

export type CatalogCategory =
  | "praias"
  | "marinho"
  | "natureza"
  | "cacau_rocas"
  | "cultura"
  | "gastronomia";

export const CATEGORY_LABEL: Record<CatalogCategory, string> = {
  praias: "Praias",
  marinho: "Mar e vida marinha",
  natureza: "Natureza e floresta",
  cacau_rocas: "Cacau, roças e património",
  cultura: "Cultura e história",
  gastronomia: "Gastronomia",
};

export const CATEGORY_ORDER: CatalogCategory[] = [
  "praias",
  "natureza",
  "cacau_rocas",
  "cultura",
  "marinho",
  "gastronomia",
];

export type Island = "sao_tome" | "principe" | "rolas";

export const ISLAND_LABEL: Record<Island, string> = {
  sao_tome: "São Tomé",
  principe: "Príncipe",
  rolas: "Ilhéu das Rolas",
};

export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  island: string;
  short_description: string | null;
  image_url: string | null;
  typical_duration_hours: number | null;
  service_id: string | null;
  package_component_id: string | null;
}

/** Um item só é vendável quando existe inventário real por trás. */
export function isBookable(item: Pick<CatalogItem, "service_id" | "package_component_id">): boolean {
  return Boolean(item.service_id || item.package_component_id);
}

export type DayKind = "chegada" | "livre" | "regresso";

export interface DaySlot {
  day: number;
  kind: DayKind;
  title: string;
  description: string;
  configurable: boolean;
}

/**
 * Dia 1 é sempre chegada/transfer/alojamento e o último dia é regresso.
 * Os dias intermédios são livres e configuráveis pelo cliente.
 */
export function buildDayPlan(durationDays: number): DaySlot[] {
  const days: DaySlot[] = [];
  for (let day = 1; day <= durationDays; day++) {
    if (day === 1) {
      days.push({
        day,
        kind: "chegada",
        title: "Chegada",
        description: "Chegada, transfer do aeroporto e alojamento. Estrutura padrão do pacote.",
        configurable: false,
      });
    } else if (day === durationDays) {
      days.push({
        day,
        kind: "regresso",
        title: "Regresso",
        description: "Check-out e transfer para o aeroporto. Estrutura padrão do pacote.",
        configurable: false,
      });
    } else {
      days.push({
        day,
        kind: "livre",
        title: `Dia ${day}`,
        description: "Escolha o que quer fazer neste dia.",
        configurable: true,
      });
    }
  }
  return days;
}

export function configurableDays(durationDays: number): number[] {
  return buildDayPlan(durationDays).filter((d) => d.configurable).map((d) => d.day);
}

export interface DaySelection {
  day: number;
  item_id: string;
  item_slug: string;
}

/** Horas úteis realistas de um dia de programa. Só usado para avisar, nunca para bloquear. */
export const DAY_CAPACITY_HOURS = 8;
export const MAX_SELECTIONS_PER_DAY = 4;

export function selectionsForDay(selections: DaySelection[], day: number): DaySelection[] {
  return selections.filter((s) => s.day === day);
}

/** A repetição do mesmo local noutro dia — e no mesmo dia — nunca é bloqueada artificialmente. */
export function addSelection(
  selections: DaySelection[],
  selection: DaySelection,
  durationDays: number,
): DaySelection[] {
  if (!configurableDays(durationDays).includes(selection.day)) return selections;
  if (selectionsForDay(selections, selection.day).length >= MAX_SELECTIONS_PER_DAY) return selections;
  return [...selections, selection];
}

/** Remove uma ocorrência concreta, não todas as repetições daquele local. */
export function removeSelectionAt(selections: DaySelection[], day: number, index: number): DaySelection[] {
  const dayItems = selectionsForDay(selections, day);
  const target = dayItems[index];
  if (!target) return selections;
  let removed = false;
  return selections.filter((s) => {
    if (removed) return true;
    if (s.day === target.day && s.item_id === target.item_id) {
      removed = true;
      return false;
    }
    return true;
  });
}

export interface DayWarning {
  day: number;
  message: string;
}

/**
 * Só sinaliza conflitos com dados que existem mesmo na base.
 * Nunca inventa duração, disponibilidade ou logística em falta.
 */
export function detectConflicts(
  selections: DaySelection[],
  items: CatalogItem[],
  durationDays: number,
): DayWarning[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const warnings: DayWarning[] = [];

  for (const day of configurableDays(durationDays)) {
    const chosen = selectionsForDay(selections, day)
      .map((s) => byId.get(s.item_id))
      .filter((i): i is CatalogItem => Boolean(i));
    if (chosen.length === 0) continue;

    const known = chosen.filter((i) => typeof i.typical_duration_hours === "number");
    if (known.length === chosen.length) {
      const total = known.reduce((sum, i) => sum + Number(i.typical_duration_hours), 0);
      if (total > DAY_CAPACITY_HOURS) {
        warnings.push({
          day,
          message: `As escolhas deste dia somam ${total} horas, acima das ${DAY_CAPACITY_HOURS} horas de um dia de programa.`,
        });
      }
    }

    const islands = [...new Set(chosen.map((i) => i.island))];
    if (islands.length > 1) {
      warnings.push({
        day,
        message: "Este dia junta locais em ilhas diferentes, o que exige uma ligação aérea ou marítima.",
      });
    }
  }

  return warnings;
}

export interface BuilderConfigInput {
  durationDays: number;
  minimumDays: number;
  maximumDays: number | null;
  adults: number;
  children: number;
  rooms: number;
  selections: DaySelection[];
}

export function validateBuilderConfig(input: BuilderConfigInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.durationDays) || input.durationDays < input.minimumDays) {
    errors.push(`A duração tem de ser de pelo menos ${input.minimumDays} dias.`);
  }
  if (input.maximumDays !== null && input.durationDays > input.maximumDays) {
    errors.push(`A duração não pode ultrapassar ${input.maximumDays} dias.`);
  }
  if (!Number.isInteger(input.adults) || input.adults < 1) errors.push("É necessário pelo menos um adulto.");
  if (input.children < 0) errors.push("Número de crianças inválido.");
  if (input.rooms < 1) errors.push("É necessário pelo menos um quarto.");

  const allowed = configurableDays(input.durationDays);
  for (const s of input.selections) {
    if (!allowed.includes(s.day)) {
      errors.push(`O dia ${s.day} não é configurável nesta duração.`);
      break;
    }
  }
  for (const day of allowed) {
    if (selectionsForDay(input.selections, day).length > MAX_SELECTIONS_PER_DAY) {
      errors.push(`O dia ${day} tem escolhas a mais.`);
      break;
    }
  }
  return errors;
}

export interface BuilderSummaryDay {
  day: number;
  kind: DayKind;
  title: string;
  items: { id: string; name: string; bookable: boolean }[];
}

export interface BuilderSummary {
  days: BuilderSummaryDay[];
  totalSelections: number;
  bookableSelections: number;
  inspirationSelections: number;
  emptyConfigurableDays: number[];
  warnings: DayWarning[];
}

export function summarizeBuilder(
  selections: DaySelection[],
  items: CatalogItem[],
  durationDays: number,
): BuilderSummary {
  const byId = new Map(items.map((i) => [i.id, i]));
  const plan = buildDayPlan(durationDays);
  const days: BuilderSummaryDay[] = plan.map((slot) => ({
    day: slot.day,
    kind: slot.kind,
    title: slot.title,
    items: selectionsForDay(selections, slot.day).map((s) => {
      const item = byId.get(s.item_id);
      return {
        id: s.item_id,
        name: item?.name ?? s.item_slug,
        bookable: item ? isBookable(item) : false,
      };
    }),
  }));

  const flat = days.flatMap((d) => d.items);
  return {
    days,
    totalSelections: flat.length,
    bookableSelections: flat.filter((i) => i.bookable).length,
    inspirationSelections: flat.filter((i) => !i.bookable).length,
    emptyConfigurableDays: plan.filter((d) => d.configurable && selectionsForDay(selections, d.day).length === 0).map((d) => d.day),
    warnings: detectConflicts(selections, items, durationDays),
  };
}

/** Componentes reais que a cotação pode usar. Itens só editoriais nunca entram no preço. */
export function componentIdsFor(selections: DaySelection[], items: CatalogItem[]): string[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const ids = selections
    .map((s) => byId.get(s.item_id)?.package_component_id)
    .filter((v): v is string => Boolean(v));
  return [...new Set(ids)];
}

export const BUILDER_LIMITS = {
  maxSelections: 40,
  maxNotesLength: 800,
  maxContactLength: 160,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidContactEmail(value: unknown): boolean {
  return typeof value === "string" && EMAIL_RE.test(value.trim()) && value.trim().length <= BUILDER_LIMITS.maxContactLength;
}

export function sanitizeSelections(raw: unknown): DaySelection[] {
  if (!Array.isArray(raw)) return [];
  const out: DaySelection[] = [];
  for (const entry of raw.slice(0, BUILDER_LIMITS.maxSelections)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const day = Number(e.day);
    const itemId = typeof e.item_id === "string" ? e.item_id : "";
    const slug = typeof e.item_slug === "string" ? e.item_slug.slice(0, 120) : "";
    if (!Number.isInteger(day) || day < 1 || day > 60 || !itemId) continue;
    out.push({ day, item_id: itemId, item_slug: slug });
  }
  return out;
}

/** Critérios para o Quote Engine existente. Sem preços — só o que descreve a viagem. */
export function toQuoteCriteria(config: {
  durationDays: number;
  adults: number;
  children: number;
  rooms: number;
  startDate?: string | null;
  interests?: string[];
}): Record<string, unknown> {
  return {
    destination: "São Tomé e Príncipe",
    duration_days: config.durationDays,
    nights: Math.max(config.durationDays - 1, 0),
    adults: config.adults,
    children: config.children,
    rooms: config.rooms,
    departure_date: config.startDate ?? null,
    interests: [...new Set(config.interests ?? [])].slice(0, 10),
  };
}
