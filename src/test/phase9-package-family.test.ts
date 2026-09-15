import { describe, expect, it } from "vitest";
import {
  ABSOLUTE_MAX_DAYS,
  addSelection,
  buildDayPlan,
  configurableDays,
  DEFAULT_MAX_SELECTIONS_PER_DAY,
  durationOptions,
  normalizeBuilderProduct,
  validateBuilderConfig,
} from "@/lib/packageBuilder";

const row = (over: Record<string, unknown>) => ({
  slug: "rotas-essencial",
  name: "Rotas Essencial",
  description: null,
  product_type: "standard_package",
  minimum_days: 5,
  maximum_days: 7,
  minimum_nights: 4,
  maximum_nights: 6,
  builder_config: { max_selections_per_day: 4, categories: [], base_components: ["transfer"], duration_cap_days: 7 },
  ...over,
});

describe("família de produtos configurável", () => {
  it("cada produto gera as suas durações a partir dos dados", () => {
    expect(durationOptions(normalizeBuilderProduct(row({})))).toEqual([5, 6, 7]);
    expect(durationOptions(normalizeBuilderProduct(row({ minimum_days: 8, maximum_days: 10 })))).toEqual([8, 9, 10]);
    expect(durationOptions(normalizeBuilderProduct(row({ minimum_days: 14, maximum_days: 15 })))).toEqual([14, 15]);
  });

  it("à medida não tem máximo de produto, só um limite de sugestão", () => {
    const custom = normalizeBuilderProduct(
      row({
        slug: "rotas-a-medida",
        product_type: "custom_package",
        maximum_days: null,
        maximum_nights: null,
        builder_config: { max_selections_per_day: 4, categories: [], base_components: [], duration_cap_days: 21 },
      }),
    );
    expect(custom.maximum_days).toBeNull();
    const options = durationOptions(custom);
    expect(options[0]).toBe(5);
    expect(options[options.length - 1]).toBe(21);
  });

  it("o servidor aceita durações longas à medida até ao teto de segurança", () => {
    const base = { adults: 2, children: 0, rooms: 1, minimumDays: 5, maximumDays: null, selections: [] };
    expect(validateBuilderConfig({ ...base, durationDays: 30 })).toEqual([]);
    expect(validateBuilderConfig({ ...base, durationDays: ABSOLUTE_MAX_DAYS + 1 }).length).toBeGreaterThan(0);
  });

  it("o plano de dias adapta-se a qualquer duração da família", () => {
    for (const days of [5, 10, 15, 21]) {
      const plan = buildDayPlan(days);
      expect(plan).toHaveLength(days);
      expect(plan[0].kind).toBe("chegada");
      expect(plan[days - 1].kind).toBe("regresso");
      expect(configurableDays(days)).toHaveLength(days - 2);
    }
  });

  it("o limite diário vem do produto e o padrão mantém-se em 4", () => {
    expect(DEFAULT_MAX_SELECTIONS_PER_DAY).toBe(4);
    let selections = [] as ReturnType<typeof addSelection>;
    for (let i = 0; i < 4; i++) {
      selections = addSelection(selections, { day: 2, item_id: `i${i}`, item_slug: `i${i}` }, 10, 2);
    }
    expect(selections.filter((s) => s.day === 2)).toHaveLength(2);

    let wide = [] as ReturnType<typeof addSelection>;
    for (let i = 0; i < 8; i++) {
      wide = addSelection(wide, { day: 3, item_id: `i${i}`, item_slug: `i${i}` }, 10, 6);
    }
    expect(wide.filter((s) => s.day === 3)).toHaveLength(6);
  });

  it("repetir o mesmo local em dias diferentes continua permitido", () => {
    let s = addSelection([], { day: 2, item_id: "a", item_slug: "a" }, 10);
    s = addSelection(s, { day: 5, item_id: "a", item_slug: "a" }, 10);
    expect(s).toHaveLength(2);
  });

  it("configuração em falta cai em valores seguros sem inventar dados", () => {
    const p = normalizeBuilderProduct(row({ builder_config: {} }));
    expect(p.max_selections_per_day).toBe(DEFAULT_MAX_SELECTIONS_PER_DAY);
    expect(p.categories).toEqual([]);
    expect(p.base_components).toEqual([]);
  });
});
