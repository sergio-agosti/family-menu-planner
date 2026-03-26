import { useState, useEffect, useRef } from "react";
import { ListCardSkeleton } from "@/components/ListCardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { getData, updateRecipe, type Recipe } from "@/lib/data";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const editRef = useRef<HTMLSpanElement>(null);

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? recipes.filter((r) => r.name.toLowerCase().includes(q))
    : recipes;

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      const sel = getSelection();
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingId]);

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
    return <ListCardSkeleton />;
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
                {editingId === recipe.id ? (
                  <span
                    ref={editRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-w-0 flex-1 cursor-text truncate font-medium outline-none"
                    onBlur={() => {
                      const newName =
                        editRef.current?.textContent?.trim() ?? recipe.name;
                      setEditingId(null);
                      if (newName && newName !== recipe.name) {
                        updateRecipe(recipe.id, { name: newName })
                          .then(() =>
                            setRecipes((prev) =>
                              [...prev]
                                .map((r) =>
                                  r.id === recipe.id
                                    ? { ...r, name: newName }
                                    : r,
                                )
                                .sort((a, b) => a.name.localeCompare(b.name)),
                            ),
                          )
                          .catch((err) =>
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Failed to update recipe",
                            ),
                          );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLElement).blur();
                    }}
                  >
                    {recipe.name}
                  </span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    className="min-w-0 cursor-pointer truncate font-medium hover:opacity-80"
                    title="Click to edit"
                    onClick={() => setEditingId(recipe.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setEditingId(recipe.id);
                    }}
                  >
                    {recipe.name}
                  </span>
                )}
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
