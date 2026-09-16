import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  DEFAULT_MAX_SELECTIONS_PER_DAY,
  ISLAND_LABEL,
  isBookable,
  selectionsForDay,
  type CatalogItem,
  type CatalogCategory,
  type DaySelection,
  type DaySlot,
  type Island,
} from "@/lib/packageBuilder";

interface Props {
  slot: DaySlot;
  items: CatalogItem[];
  selections: DaySelection[];
  warnings: string[];
  /** Limite por dia definido no produto. */
  maxPerDay?: number;
  /** Categorias permitidas pelo produto. Vazio/omisso = todas as do catálogo. */
  categories?: string[];
  onAdd: (item: CatalogItem) => void;
  onRemoveAt: (index: number) => void;
}

export function DayConfigurator({
  slot,
  items,
  selections,
  warnings,
  maxPerDay = DEFAULT_MAX_SELECTIONS_PER_DAY,
  categories: allowed,
  onAdd,
  onRemoveAt,
}: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const chosen = selectionsForDay(selections, slot.day);
  const byId = new Map(items.map((i) => [i.id, i]));
  const full = chosen.length >= maxPerDay;

  // Categorias saem do próprio catálogo; o produto só pode restringi-las.
  const catalogCategories = [...new Set(items.map((i) => i.category))];
  const ordered = [
    ...CATEGORY_ORDER.filter((c) => catalogCategories.includes(c)),
    ...catalogCategories.filter((c) => !(CATEGORY_ORDER as string[]).includes(c)),
  ];
  const categories = allowed && allowed.length > 0 ? ordered.filter((c) => allowed.includes(c)) : ordered;
  const visible = category ? items.filter((i) => i.category === category) : [];

  if (!slot.configurable) {
    return (
      <Card className="rounded-sm bg-muted/40 p-5 shadow-none">
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-xs uppercase text-primary">Dia {slot.day}</span>
          <div>
            <p className="font-medium text-foreground">{slot.title}</p>
            <p className="text-sm text-muted-foreground">{slot.description}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 rounded-sm p-5 shadow-none md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase text-primary">Dia {slot.day}</span>
          <p className="font-medium text-foreground">{slot.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">{chosen.length} de {maxPerDay} escolhas</p>
      </div>

      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((s, index) => {
            const item = byId.get(s.item_id);
            return (
              <li key={`${s.item_id}-${index}`}>
                <span className="inline-flex items-center gap-2 border-b border-border bg-background px-2 py-1.5 text-sm">
                  {item?.name ?? s.item_slug}
                  {item && !isBookable(item) && (
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">inspiração</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remover ${item?.name ?? "escolha"} do dia ${slot.day}`}
                    onClick={() => onRemoveAt(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {warnings.map((w) => (
        <p key={w} className="text-sm text-secondary-foreground bg-secondary/20 rounded-md px-3 py-2">{w}</p>
      ))}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {CATEGORY_LABEL[c as CatalogCategory] ?? c}
            </Button>
          ))}
        </div>

        {category && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => onAdd(item)}
                  className="w-full border-l-2 border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-accent/35 disabled:opacity-50"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block font-medium text-foreground">{item.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {ISLAND_LABEL[item.island as Island] ?? item.island}
                        {item.typical_duration_hours ? ` · ${item.typical_duration_hours} h` : ""}
                        {isBookable(item) ? "" : " · inspiração"}
                      </span>
                      {item.short_description && (
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.short_description}</span>
                      )}
                    </span>
                    <Plus size={16} className="mt-1 shrink-0 text-primary" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
