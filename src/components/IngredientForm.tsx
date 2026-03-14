import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { addIngredient } from "@/lib/data";
import { getTescoSearchUrl, getGoogleSearchUrl } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface IngredientFormProps {
  onIngredientAdded?: () => void;
}

export function IngredientForm({ onIngredientAdded }: IngredientFormProps) {
  const [name, setName] = useState("");
  const [tescoUrl, setTescoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setIsLoading(true);
    try {
      await addIngredient(name.trim(), tescoUrl.trim());
      setName("");
      setTescoUrl("");
      onIngredientAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ingredient");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <FormField>
          <FormLabel htmlFor="ingredient-name">Name</FormLabel>
          <Input
            id="ingredient-name"
            type="text"
            placeholder="e.g. Olive oil"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </FormField>
        <FormField>
          <FormLabel htmlFor="ingredient-tesco">Tesco URL (optional)</FormLabel>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="ingredient-tesco"
              type="url"
              placeholder="https://www.tesco.com/groceries/..."
              value={tescoUrl}
              onChange={(e) => setTescoUrl(e.target.value)}
              disabled={isLoading}
              className="h-9 min-w-0 flex-1"
            />
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 shrink-0 touch-manipulation"
                title="Find on Tesco (opens search)"
                onClick={() =>
                  window.open(
                    getTescoSearchUrl(name),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                disabled={isLoading}
              >
                <ExternalLink className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 touch-manipulation"
                title="Search on Google for Tesco link"
                onClick={() =>
                  window.open(
                    getGoogleSearchUrl(name),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                disabled={isLoading}
              >
                Google
              </Button>
            </div>
          </div>
        </FormField>
        {error && <FormMessage>{error}</FormMessage>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding…" : "Add ingredient"}
        </Button>
      </div>
    </Form>
  );
}
