import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getData, type Ingredient } from "@/lib/data";
import { getTescoSearchUrl, getGoogleSearchUrl } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

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
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-h-9 shrink-0 touch-manipulation px-2 text-muted-foreground"
                  title="Find on Tesco"
                  onClick={() =>
                    window.open(
                      getTescoSearchUrl(ing.name),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <ExternalLink className="mr-1 size-3.5" />
                  Find link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-h-9 shrink-0 touch-manipulation px-2 text-muted-foreground"
                  title="Search Google for Tesco"
                  onClick={() =>
                    window.open(
                      getGoogleSearchUrl(ing.name),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  Google
                </Button>
                {ing.tescoUrl ? (
                  <a
                    href={ing.tescoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 text-sm text-primary hover:underline"
                  >
                    Tesco
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
