import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  ISLAND_LABEL,
  MAX_SELECTIONS_PER_DAY,
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
  onAdd: (item: CatalogItem) => void;
  onRemoveAt: (index: number) => void;
}

export function DayConfigurator({ slot, items, selections, warnings, onAdd, onRemoveAt }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const chosen = selectionsForDay(selections, slot.day);
  const byId = new Map(items.map((i) => [i.id, i]));
  const full = chosen.length >= MAX_SELECTIONS_PER_DAY;

  const categories = CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c));
  const visible = category ? items.filter((i) => i.category === category) : [];

  if (!slot.configurable) {
    return (
      <Card className="p-5 bg-muted/40">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Dia {slot.day}</Badge>
          <div>
            <p className="font-medium text-foreground">{slot.title}</p>
            <p className="text-sm text-muted-foreground">{slot.description}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge>Dia {slot.day}</Badge>
          <p className="font-medium text-foreground">{slot.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">{chosen.length} de {MAX_SELECTIONS_PER_DAY} escolhas</p>
      </div>

      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((s, index) => {
            const item = byId.get(s.item_id);
            return (
              <li key={`${s.item_id}-${index}`}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
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
                  className="w-full text-left rounded-xl border border-border p-3 hover:border-primary disabled:opacity-50 transition-colors"
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
