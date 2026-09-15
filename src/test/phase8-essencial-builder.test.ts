import { describe, expect, it } from "vitest";
import {
  addSelection,
  buildDayPlan,
  componentIdsFor,
  configurableDays,
  detectConflicts,
  isBookable,
  isValidContactEmail,
  MAX_SELECTIONS_PER_DAY,
  removeSelectionAt,
  sanitizeSelections,
  summarizeBuilder,
  toQuoteCriteria,
  validateBuilderConfig,
  type CatalogItem,
} from "@/lib/packageBuilder";

const item = (over: Partial<CatalogItem> & { id: string }): CatalogItem => ({
  slug: over.id,
  name: over.id,
  category: "praias",
  island: "sao_tome",
  short_description: null,
  image_url: null,
  typical_duration_hours: null,
  service_id: null,
  package_component_id: null,
  ...over,
});

describe("estrutura dos dias", () => {
  it("dia 1 é chegada e o último é regresso", () => {
    const plan = buildDayPlan(7);
    expect(plan).toHaveLength(7);
    expect(plan[0].kind).toBe("chegada");
    expect(plan[6].kind).toBe("regresso");
    expect(configurableDays(7)).toEqual([2, 3, 4, 5, 6]);
  });

  it("a versão de cinco dias mantém a mesma regra", () => {
    expect(configurableDays(5)).toEqual([2, 3, 4]);
  });
});

describe("seleções por dia", () => {
  const praia = item({ id: "praia-jale" });

  it("permite repetir o mesmo local em dias diferentes", () => {
    let s = addSelection([], { day: 2, item_id: praia.id, item_slug: praia.slug }, 7);
    s = addSelection(s, { day: 4, item_id: praia.id, item_slug: praia.slug }, 7);
    expect(s).toHaveLength(2);
  });

  it("permite repetir no mesmo dia até ao limite prático", () => {
    let s: ReturnType<typeof addSelection> = [];
    for (let i = 0; i < MAX_SELECTIONS_PER_DAY + 2; i++) {
      s = addSelection(s, { day: 2, item_id: praia.id, item_slug: praia.slug }, 7);
    }
    expect(s).toHaveLength(MAX_SELECTIONS_PER_DAY);
  });

  it("não aceita escolhas em dias não configuráveis", () => {
    expect(addSelection([], { day: 1, item_id: praia.id, item_slug: praia.slug }, 7)).toHaveLength(0);
    expect(addSelection([], { day: 7, item_id: praia.id, item_slug: praia.slug }, 7)).toHaveLength(0);
  });

  it("remover apaga só uma ocorrência", () => {
    const s = [
      { day: 2, item_id: "a", item_slug: "a" },
      { day: 2, item_id: "a", item_slug: "a" },
      { day: 3, item_id: "a", item_slug: "a" },
    ];
    const out = removeSelectionAt(s, 2, 0);
    expect(out).toHaveLength(2);
    expect(out.filter((x) => x.day === 2)).toHaveLength(1);
    expect(out.filter((x) => x.day === 3)).toHaveLength(1);
  });
});

describe("dados reais versus catálogo editorial", () => {
  it("um ponto editorial sem serviço nem componente não é reservável", () => {
    expect(isBookable(item({ id: "pico" }))).toBe(false);
    expect(isBookable(item({ id: "tour", service_id: "s1" }))).toBe(true);
    expect(isBookable(item({ id: "comp", package_component_id: "c1" }))).toBe(true);
  });

  it("só componentes reais chegam ao Quote Engine", () => {
    const items = [item({ id: "a" }), item({ id: "b", package_component_id: "comp-1" })];
    const ids = componentIdsFor(
      [
        { day: 2, item_id: "a", item_slug: "a" },
        { day: 3, item_id: "b", item_slug: "b" },
        { day: 4, item_id: "b", item_slug: "b" },
      ],
      items,
    );
    expect(ids).toEqual(["comp-1"]);
  });

  it("os critérios enviados não contêm preço, custo ou margem", () => {
    const criteria = toQuoteCriteria({ durationDays: 7, adults: 2, children: 0, rooms: 1, startDate: null });
    const keys = Object.keys(criteria).join(",");
    expect(keys).not.toMatch(/price|cost|margin|markup/i);
    expect(criteria.nights).toBe(6);
  });
});

describe("conflitos só com dados existentes", () => {
  it("não avisa quando a duração é desconhecida", () => {
    const items = [item({ id: "a" }), item({ id: "b" })];
    const warnings = detectConflicts(
      [
        { day: 2, item_id: "a", item_slug: "a" },
        { day: 2, item_id: "b", item_slug: "b" },
      ],
      items,
      7,
    );
    expect(warnings).toHaveLength(0);
  });

  it("avisa quando as durações conhecidas ultrapassam o dia", () => {
    const items = [item({ id: "a", typical_duration_hours: 6 }), item({ id: "b", typical_duration_hours: 5 })];
    const warnings = detectConflicts(
      [
        { day: 2, item_id: "a", item_slug: "a" },
        { day: 2, item_id: "b", item_slug: "b" },
      ],
      items,
      7,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].day).toBe(2);
  });

  it("avisa quando o mesmo dia junta ilhas diferentes", () => {
    const items = [item({ id: "a" }), item({ id: "b", island: "principe" })];
    const warnings = detectConflicts(
      [
        { day: 3, item_id: "a", item_slug: "a" },
        { day: 3, item_id: "b", item_slug: "b" },
      ],
      items,
      7,
    );
    expect(warnings.some((w) => w.message.includes("ilhas diferentes"))).toBe(true);
  });
});

describe("validação e resumo", () => {
  it("respeita o intervalo do produto", () => {
    const base = { minimumDays: 5, maximumDays: 7, adults: 2, children: 0, rooms: 1, selections: [] };
    expect(validateBuilderConfig({ ...base, durationDays: 6 })).toEqual([]);
    expect(validateBuilderConfig({ ...base, durationDays: 4 }).length).toBeGreaterThan(0);
    expect(validateBuilderConfig({ ...base, durationDays: 9 }).length).toBeGreaterThan(0);
  });

  it("separa escolhas reserváveis de inspiração", () => {
    const items = [item({ id: "a", package_component_id: "c1" }), item({ id: "b" })];
    const s = summarizeBuilder(
      [
        { day: 2, item_id: "a", item_slug: "a" },
        { day: 3, item_id: "b", item_slug: "b" },
      ],
      items,
      5,
    );
    expect(s.totalSelections).toBe(2);
    expect(s.bookableSelections).toBe(1);
    expect(s.inspirationSelections).toBe(1);
    expect(s.emptyConfigurableDays).toEqual([4]);
  });

  it("limpa entradas inválidas vindas do cliente", () => {
    const out = sanitizeSelections([
      { day: 2, item_id: "a", item_slug: "a" },
      { day: 0, item_id: "b", item_slug: "b" },
      { day: 3, item_slug: "c" },
      "lixo",
    ]);
    expect(out).toHaveLength(1);
  });

  it("exige email válido para o pedido de proposta", () => {
    expect(isValidContactEmail("pessoa@exemplo.pt")).toBe(true);
    expect(isValidContactEmail("pessoa")).toBe(false);
    expect(isValidContactEmail(null)).toBe(false);
  });
});
