import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { addRecipe } from "@/lib/github";

interface RecipeFormProps {
  onRecipeAdded?: () => void;
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
      await addRecipe(recipeName.trim());
      setRecipeName("");
      if (onRecipeAdded) {
        onRecipeAdded();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add recipe";
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
