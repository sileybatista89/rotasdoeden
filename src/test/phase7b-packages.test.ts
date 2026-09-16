import { describe, expect, it } from "vitest";
import {
  OFFICIAL_PRODUCTS,
  canTransition,
  defaultNights,
  formatDuration,
  isDurationWithinProduct,
  isVersionEditable,
  validateDurationRange,
} from "@/lib/travelProducts";

const byslug = (slug: string) => OFFICIAL_PRODUCTS.find((p) => p.slug === slug)!;
const range = (slug: string) => {
  const p = byslug(slug);
  return { minimum_days: p.minDays, maximum_days: p.maxDays };
};

describe("produtos oficiais", () => {
  it("são exactamente quatro", () => {
    expect(OFFICIAL_PRODUCTS).toHaveLength(4);
  });

  it("Essencial aceita 5 a 7 dias", () => {
    expect(isDurationWithinProduct(5, range("rotas-essencial"))).toBe(true);
    expect(isDurationWithinProduct(7, range("rotas-essencial"))).toBe(true);
    expect(isDurationWithinProduct(4, range("rotas-essencial"))).toBe(false);
    expect(isDurationWithinProduct(8, range("rotas-essencial"))).toBe(false);
  });

  it("Explorar aceita 8 a 10 dias", () => {
    expect(isDurationWithinProduct(8, range("rotas-explorar"))).toBe(true);
    expect(isDurationWithinProduct(10, range("rotas-explorar"))).toBe(true);
    expect(isDurationWithinProduct(7, range("rotas-explorar"))).toBe(false);
    expect(isDurationWithinProduct(11, range("rotas-explorar"))).toBe(false);
  });

  it("Imersão aceita 14 a 15 dias", () => {
    expect(isDurationWithinProduct(14, range("rotas-imersao"))).toBe(true);
    expect(isDurationWithinProduct(15, range("rotas-imersao"))).toBe(true);
    expect(isDurationWithinProduct(13, range("rotas-imersao"))).toBe(false);
    expect(isDurationWithinProduct(16, range("rotas-imersao"))).toBe(false);
  });

  it("À Medida aceita cinco dias ou mais, sem máximo", () => {
    const r = range("rotas-a-medida");
    expect(r.maximum_days).toBeNull();
    expect(byslug("rotas-a-medida").type).toBe("custom_package");
    expect(isDurationWithinProduct(5, r)).toBe(true);
    expect(isDurationWithinProduct(40, r)).toBe(true);
    expect(isDurationWithinProduct(4, r)).toBe(false);
  });

  it("nenhum produto oficial define preço ou custo", () => {
    for (const p of OFFICIAL_PRODUCTS) {
      expect(Object.keys(p)).toEqual(["slug", "name", "type", "minDays", "maxDays"]);
    }
  });
});

describe("validação de duração", () => {
  it("rejeita mínimos inválidos", () => {
    expect(validateDurationRange({ minimum_days: 0, maximum_days: 5 })).not.toBeNull();
    expect(validateDurationRange({ minimum_days: 2.5, maximum_days: 5 })).not.toBeNull();
  });

  it("rejeita máximo inferior ao mínimo", () => {
    expect(validateDurationRange({ minimum_days: 8, maximum_days: 5 })).not.toBeNull();
  });

  it("aceita máximo nulo", () => {
    expect(validateDurationRange({ minimum_days: 5, maximum_days: null })).toBeNull();
  });

  it("calcula noites por defeito e apresenta a duração", () => {
    expect(defaultNights(5)).toBe(4);
    expect(defaultNights(1)).toBe(0);
    expect(formatDuration(range("rotas-essencial"))).toBe("5-7 dias");
    expect(formatDuration(range("rotas-a-medida"))).toBe("5+ dias");
  });
});

describe("estados e versões", () => {
  it("não publica automaticamente a partir de rascunho", () => {
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("draft", "under_review")).toBe(true);
    expect(canTransition("under_review", "published")).toBe(true);
  });

  it("um produto publicado só pode ser arquivado", () => {
    expect(canTransition("published", "archived")).toBe(true);
    expect(canTransition("published", "draft")).toBe(false);
  });

  it("uma versão publicada deixa de ser editável", () => {
    expect(isVersionEditable("draft")).toBe(true);
    expect(isVersionEditable("published")).toBe(false);
    expect(isVersionEditable("archived")).toBe(false);
  });
});
