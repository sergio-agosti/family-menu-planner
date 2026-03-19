import { useState, FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { addRecipe, type Recipe } from "@/lib/data";

interface RecipeFormProps {
  onRecipeAdded?: (recipe: Recipe) => void;
}

export function RecipeForm({ onRecipeAdded }: RecipeFormProps) {
  const [recipeName, setRecipeName] = useState("");
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
      const recipe = await addRecipe(recipeName.trim());
      setRecipeName("");
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
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Adding..." : "Add Recipe"}
      </Button>
    </Form>
  );
}
