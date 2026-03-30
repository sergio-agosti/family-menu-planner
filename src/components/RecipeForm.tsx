import { useState, FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addRecipe,
  recipeDifficultyLabel,
  type Recipe,
  type RecipeDifficulty,
} from "@/lib/data";

interface RecipeFormProps {
  onRecipeAdded?: (recipe: Recipe) => void;
}

export function RecipeForm({ onRecipeAdded }: RecipeFormProps) {
  const [recipeName, setRecipeName] = useState("");
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>("easy");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!recipeName.trim()) {
      setError("Recipe name is required");
      return;
    }

    setIsLoading(true);
    try {
      const recipe = await addRecipe(recipeName.trim(), difficulty);
      setRecipeName("");
      setDifficulty("easy");
      onRecipeAdded?.(recipe);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add recipe";
      setError(errorMessage);
      console.error("Error adding recipe:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormField>
        <FormLabel htmlFor="recipe-name">Recipe Name</FormLabel>
        <Input
          id="recipe-name"
          type="text"
          placeholder="Enter recipe name"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          disabled={isLoading}
        />
        {error && <FormMessage>{error}</FormMessage>}
      </FormField>
      <FormField>
        <FormLabel htmlFor="recipe-difficulty">Difficulty</FormLabel>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as RecipeDifficulty)}
          disabled={isLoading}
        >
          <SelectTrigger id="recipe-difficulty" className="w-full sm:w-48">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {(["easy", "medium", "difficult"] as const).map((d) => (
              <SelectItem key={d} value={d}>
                {recipeDifficultyLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Adding..." : "Add Recipe"}
      </Button>
    </Form>
  );
}
