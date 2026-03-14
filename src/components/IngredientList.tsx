import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteIngredient,
  getData,
  updateIngredient,
  type Ingredient,
} from "@/lib/data";
import { getTescoSearchUrl } from "@/lib/utils";
import { ExternalLink, Search, X } from "lucide-react";

interface IngredientListProps {
  refreshTrigger: number;
}

export function IngredientList({ refreshTrigger }: IngredientListProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const editRef = useRef<HTMLSpanElement>(null);

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? ingredients.filter((ing) => ing.name.toLowerCase().includes(q))
    : ingredients;

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
    getData()
      .then((data) =>
        setIngredients(
          [...data.ingredients].sort((a, b) => a.name.localeCompare(b.name)),
        ),
      )
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load ingredients",
        ),
      )
      .finally(() => setIsLoading(false));
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading ingredients…</p>
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

  if (ingredients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No ingredients yet. Add one above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Ingredients ({filtered.length}
          {q ? ` of ${ingredients.length}` : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="search"
          placeholder="Search ingredients…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <ul className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No ingredients match.</p>
          ) : (
            filtered.map((ing) => (
              <li
                key={ing.id}
                className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
              >
                {editingId === ing.id ? (
                  <span
                    ref={editRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-w-0 flex-1 cursor-text truncate font-medium outline-none"
                    onBlur={() => {
                      const newName =
                        editRef.current?.textContent?.trim() ?? ing.name;
                      setEditingId(null);
                      if (newName && newName !== ing.name) {
                        updateIngredient(ing.id, { name: newName })
                          .then(() =>
                            setIngredients((prev) =>
                              [...prev]
                                .map((i) =>
                                  i.id === ing.id ? { ...i, name: newName } : i,
                                )
                                .sort((a, b) => a.name.localeCompare(b.name)),
                            ),
                          )
                          .catch((err) =>
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Failed to update ingredient",
                            ),
                          );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLElement).blur();
                    }}
                  >
                    {ing.name}
                  </span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    className="min-w-0 cursor-pointer truncate font-medium hover:opacity-80"
                    title="Click to edit"
                    onClick={() => setEditingId(ing.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setEditingId(ing.id);
                    }}
                  >
                    {ing.name}
                  </span>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {ing.tescoUrl ? (
                    <a
                      href={ing.tescoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      title="Open Tesco product (new tab)"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 touch-manipulation p-0 text-muted-foreground"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 touch-manipulation p-0 text-muted-foreground hover:bg-muted hover:text-destructive"
                    title="Delete ingredient"
                    onClick={async () => {
                      try {
                        await deleteIngredient(ing.id);
                        setIngredients((prev) =>
                          prev.filter((i) => i.id !== ing.id),
                        );
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to delete ingredient",
                        );
                      }
                    }}
                  >
                    <X className="size-4" />
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
