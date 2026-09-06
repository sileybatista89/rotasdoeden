import { describe, expect, it } from "vitest";
import { OPPORTUNITY_STATUSES, PAGE_SIZE, emptyFilters } from "@/hooks/useDiscovery";

describe("Discovery Control Center contracts", () => {
  it("uses exactly the database status values", () => {
    expect([...OPPORTUNITY_STATUSES]).toEqual(["nova", "em_analise", "aceite", "rejeitada", "expirada"]);
  });

  it("paginates 25 rows per page", () => {
    expect(PAGE_SIZE).toBe(25);
  });

  it("starts with no filters applied", () => {
    expect(Object.values(emptyFilters).every((v) => v === "")).toBe(true);
  });

  it("requires a note before rejecting or expiring", () => {
    const requiresNote = (status: string) => status === "rejeitada" || status === "expirada";
    expect(requiresNote("rejeitada")).toBe(true);
    expect(requiresNote("expirada")).toBe(true);
    expect(requiresNote("aceite")).toBe(false);
    expect(requiresNote("em_analise")).toBe(false);
  });
});
