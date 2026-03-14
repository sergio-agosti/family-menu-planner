import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getData, type Recipe } from "@/lib/data";

interface RecipeListProps {
  refreshTrigger: number;
  onSelectRecipe: (id: string) => void;
}

export function RecipeList({
  refreshTrigger,
  onSelectRecipe,
}: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeIngredientCounts, setRecipeIngredientCounts] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setRecipes([]);
    setRecipeIngredientCounts({});
    getData()
      .then((data) => {
        if (cancelled) return;
        setRecipes(
          [...data.recipes].sort((a, b) => a.name.localeCompare(b.name)),
        );
        const counts: Record<string, number> = {};
        for (const ri of data.recipeIngredients) {
          counts[ri.recipeId] = (counts[ri.recipeId] ?? 0) + 1;
        }
        setRecipeIngredientCounts(counts);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load recipes",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading recipes...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recipes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No recipes yet. Add your first recipe above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recipes ({recipes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            >
              <span className="min-w-0 truncate font-medium">
                {recipe.name}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {recipeIngredientCounts[recipe.id] != null && (
                  <span className="text-sm text-muted-foreground">
                    {recipeIngredientCounts[recipe.id]} ingredients
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectRecipe(recipe.id)}
                  className="shrink-0 touch-manipulation"
                >
                  View
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
