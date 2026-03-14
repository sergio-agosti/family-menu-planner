import { useState, useEffect } from "react";
import { RemovablePill } from "@/components/RemovablePill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getData,
  setRecipeIngredients,
  type Recipe,
  type Ingredient,
  type RecipeIngredient,
} from "@/lib/data";
import { getTescoSearchUrl } from "@/lib/utils";
import { ExternalLink, Plus, Search, Trash2, X } from "lucide-react";

interface RecipeDetailProps {
  recipeId: string;
  onClose: () => void;
  onUpdated?: () => void;
  /** When true, render only the ingredients section (no card, no title). */
  inline?: boolean;
}

export function RecipeDetail({
  recipeId,
  onClose,
  onUpdated,
  inline = false,
}: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeIngredients, setRecipeIngredientsState] = useState<
    RecipeIngredient[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addIngredientId, setAddIngredientId] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [quantityDraft, setQuantityDraft] = useState<Record<string, string>>(
    {},
  );

  const refreshIngredients = () =>
    getData().then((data) =>
      setRecipeIngredientsState(
        data.recipeIngredients.filter((ri) => ri.recipeId === recipeId),
      ),
    );

  useEffect(() => {
    getData().then((data) => {
      const r = data.recipes.find((x) => x.id === recipeId) ?? null;
      setRecipe(r);
      setIngredients(data.ingredients);
      setRecipeIngredientsState(
        data.recipeIngredients.filter((ri) => ri.recipeId === recipeId),
      );
      setIsLoading(false);
    });
  }, [recipeId]);

  const persistIngredients = async (
    items: { ingredientId: string; quantity: string }[],
  ) => {
    if (!recipeId) return;
    setSaving(true);
    try {
      await setRecipeIngredients(recipeId, items);
      await refreshIngredients();
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (ingredientId: string) => {
    const next = recipeIngredients
      .filter((ri) => ri.ingredientId !== ingredientId)
      .map((ri) => ({ ingredientId: ri.ingredientId, quantity: ri.quantity }));
    persistIngredients(next);
  };

  const handleAdd = () => {
    const id = addIngredientId.trim();
    if (!id) return;
    const next = [
      ...recipeIngredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
      })),
      { ingredientId: id, quantity: addQuantity.trim() },
    ];
    setAddIngredientId("");
    setAddQuantity("");
    persistIngredients(next);
  };

  const handleQuantityBlur = (ingredientId: string) => {
    const value = (
      quantityDraft[ingredientId] ??
      recipeIngredients.find((ri) => ri.ingredientId === ingredientId)
        ?.quantity ??
      ""
    ).trim();
    setQuantityDraft((prev) => {
      const next = { ...prev };
      delete next[ingredientId];
      return next;
    });
    const current = recipeIngredients.find(
      (ri) => ri.ingredientId === ingredientId,
    );
    if (current?.quantity === value) return;
    const next = recipeIngredients.map((ri) =>
      ri.ingredientId === ingredientId
        ? { ingredientId: ri.ingredientId, quantity: value }
        : { ingredientId: ri.ingredientId, quantity: ri.quantity },
    );
    persistIngredients(next);
  };

  const byId = Object.fromEntries(ingredients.map((i) => [i.id, i]));

  const ingredientsBlock = (
    <div className="flex flex-col gap-y-2">
      {!inline && <h4 className="text-sm font-medium">Ingredients</h4>}
      <div className="grid grid-cols-[2fr_1fr_auto] items-center gap-x-2 gap-y-2">
        <div className="col-span-full grid grid-cols-subgrid items-center gap-x-2 text-sm">
          <Select
            value={addIngredientId || "__none__"}
            onValueChange={(v) => setAddIngredientId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Add ingredient…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Add ingredient…</SelectItem>
              {ingredients.map((ing) => (
                <SelectItem key={ing.id} value={ing.id}>
                  {ing.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Qty"
            value={addQuantity}
            onChange={(e) => setAddQuantity(e.target.value)}
            className="h-8 w-full justify-self-end text-right text-sm"
          />
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 touch-manipulation p-0 text-muted-foreground"
              title="Add ingredient"
              onClick={handleAdd}
              disabled={saving || !addIngredientId.trim()}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <ul className="col-span-full grid grid-cols-subgrid items-center gap-x-2 gap-y-2">
          {recipeIngredients.length === 0 ? (
            <li
              key="empty"
              className="col-span-full text-sm text-muted-foreground"
            >
              No ingredients yet.
            </li>
          ) : (
            recipeIngredients.map((ri, index) => {
              const ing = byId[ri.ingredientId];
              const label = ing ? ing.name : "(unknown)";
              return (
                <li
                  key={`${ri.ingredientId}-${index}`}
                  className="col-span-full grid grid-cols-subgrid items-center gap-x-2 text-sm"
                >
                  <div className="w-full min-w-0">
                    <RemovablePill
                      label={label}
                      onRemove={() => handleRemove(ri.ingredientId)}
                      disabled={saving}
                      removeTitle="Remove ingredient"
                      fullWidth
                    />
                  </div>
                  <Input
                    value={quantityDraft[ri.ingredientId] ?? ri.quantity}
                    onChange={(e) =>
                      setQuantityDraft((prev) => ({
                        ...prev,
                        [ri.ingredientId]: e.target.value,
                      }))
                    }
                    onBlur={() => handleQuantityBlur(ri.ingredientId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    disabled={saving}
                    className="h-8 w-full justify-self-end text-right text-sm"
                  />
                  <div className="flex items-center justify-end">
                    {ing?.tescoUrl ? (
                      <a
                        href={ing.tescoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Open Tesco product (new tab)"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                    {ing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 touch-manipulation p-0 text-muted-foreground"
                        title="Find on Tesco"
                        onClick={() =>
                          window.open(
                            getTescoSearchUrl(ing.name),
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <Search className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );

  if (isLoading || !recipe) {
    return inline ? (
      <p className="pt-2 text-sm text-muted-foreground">Loading...</p>
    ) : (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (inline) {
    return <div className="border-t pt-3">{ingredientsBlock}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 truncate text-lg sm:text-base">
          {recipe.name}
        </CardTitle>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 touch-manipulation p-0"
            title="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{ingredientsBlock}</CardContent>
    </Card>
  );
}
