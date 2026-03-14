import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? recipes.filter((r) => r.name.toLowerCase().includes(q))
    : recipes;

  useEffect(() => {
    let cancelled = false;
    setError("");
    setRecipes([]);
    getData()
      .then((data) => {
        if (cancelled) return;
        setRecipes(
          [...data.recipes].sort((a, b) => a.name.localeCompare(b.name)),
        );
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
        <CardTitle>
          Recipes ({filtered.length}
          {q ? ` of ${recipes.length}` : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="search"
          placeholder="Search recipes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <ul className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No recipes match.</p>
          ) : (
            filtered.map((recipe) => (
              <li
                key={recipe.id}
                className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
              >
                <span className="min-w-0 truncate font-medium">
                  {recipe.name}
                </span>
                <div className="flex flex-wrap items-center gap-2">
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
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
