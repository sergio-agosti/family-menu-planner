import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Ingredient } from "@/lib/data";

export interface IngredientQuantityRow {
  ingredientId: string;
  quantity: string;
}

interface RecipeIngredientRowsProps {
  ingredients: Ingredient[];
  value: IngredientQuantityRow[];
  onSave: (
    items: { ingredientId: string; quantity: string }[],
  ) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function RecipeIngredientRows({
  ingredients,
  value,
  onSave,
  onCancel,
  saving,
}: RecipeIngredientRowsProps) {
  const [rows, setRows] = useState<IngredientQuantityRow[]>(
    value.length ? [...value] : [{ ingredientId: "", quantity: "" }],
  );

  useEffect(() => {
    setRows(
      value.length
        ? value.map((v) => ({ ...v }))
        : [{ ingredientId: "", quantity: "" }],
    );
  }, [JSON.stringify(value)]);

  const addRow = () =>
    setRows((prev) => [...prev, { ingredientId: "", quantity: "" }]);

  const removeRow = (index: number) =>
    setRows((prev) =>
      prev.length <= 1
        ? [{ ingredientId: "", quantity: "" }]
        : prev.filter((_, i) => i !== index),
    );

  const updateRow = (
    index: number,
    field: "ingredientId" | "quantity",
    val: string,
  ) =>
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });

  const handleSave = () => {
    const items = rows.filter((r) => r.ingredientId.trim());
    onSave(
      items.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity || "",
      })),
    );
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2"
        >
          <Select
            value={row.ingredientId || "__none__"}
            onValueChange={(v) =>
              updateRow(index, "ingredientId", v === "__none__" ? "" : v)
            }
          >
            <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
              <SelectValue placeholder="Ingredient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select…</SelectItem>
              {ingredients.map((ing) => (
                <SelectItem key={ing.id} value={ing.id}>
                  {ing.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Quantity"
              value={row.quantity}
              onChange={(e) => updateRow(index, "quantity", e.target.value)}
              className="w-full min-w-0 flex-1 sm:w-[120px] sm:flex-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeRow(index)}
              disabled={rows.length <= 1}
              className="shrink-0 touch-manipulation"
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          Add ingredient
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
