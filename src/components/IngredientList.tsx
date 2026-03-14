import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getData, type Ingredient } from "@/lib/data";
import { getTescoSearchUrl } from "@/lib/utils";
import { ExternalLink, Search } from "lucide-react";

interface IngredientListProps {
  refreshTrigger: number;
}

export function IngredientList({ refreshTrigger }: IngredientListProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        <CardTitle>Ingredients ({ingredients.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ingredients.map((ing) => (
            <li
              key={ing.id}
              className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            >
              <span className="min-w-0 truncate font-medium">{ing.name}</span>
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
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
