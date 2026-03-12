import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getData,
  setRecipeIngredients,
  type Recipe,
  type Ingredient,
  type RecipeIngredient,
} from "@/lib/data";
import { RecipeIngredientRows } from "@/components/RecipeIngredientRows";

interface RecipeDetailProps {
  recipeId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function RecipeDetail({
  recipeId,
  onClose,
  onUpdated,
}: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeIngredients, setRecipeIngredientsState] = useState<
    RecipeIngredient[]
  >([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleSaveIngredients = async (
    items: { ingredientId: string; quantity: string }[],
  ) => {
    if (!recipeId) return;
    setSaving(true);
    try {
      await setRecipeIngredients(recipeId, items);
      const data = await getData();
      setRecipeIngredientsState(
        data.recipeIngredients.filter((ri) => ri.recipeId === recipeId),
      );
      setIsEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !recipe) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const byId = Object.fromEntries(ingredients.map((i) => [i.id, i]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{recipe.name}</CardTitle>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit ingredients
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Ingredients</h4>
          {isEditing ? (
            <RecipeIngredientRows
              ingredients={ingredients}
              value={recipeIngredients.map((ri) => ({
                ingredientId: ri.ingredientId,
                quantity: ri.quantity,
              }))}
              onSave={handleSaveIngredients}
              onCancel={() => setIsEditing(false)}
              saving={saving}
            />
          ) : (
            <ul className="space-y-1">
              {recipeIngredients.length === 0 ? (
                <li className="text-muted-foreground text-sm">
                  No ingredients yet.
                </li>
              ) : (
                recipeIngredients.map((ri) => {
                  const ing = byId[ri.ingredientId];
                  const label = ing ? ing.name : "(unknown)";
                  return (
                    <li
                      key={`${ri.ingredientId}-${ri.quantity}`}
                      className="flex gap-2 text-sm"
                    >
                      <span>{ri.quantity}</span>
                      {ing?.tescoUrl ? (
                        <a
                          href={ing.tescoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {label}
                        </a>
                      ) : (
                        <span>{label}</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
