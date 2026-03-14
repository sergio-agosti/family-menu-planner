import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeList } from "@/components/RecipeList";
import { RecipeDetail } from "@/components/RecipeDetail";
import { IngredientForm } from "@/components/IngredientForm";
import { IngredientList } from "@/components/IngredientList";
import { WeeklyPlan } from "@/components/WeeklyPlan";

const TAB_STORAGE_KEY = "family-menu-planner-tab";
const VALID_TABS = ["recipes", "ingredients", "plan"];

function getStoredTab(): string {
  if (typeof window === "undefined") return "recipes";
  const stored = localStorage.getItem(TAB_STORAGE_KEY);
  return stored && VALID_TABS.includes(stored) ? stored : "recipes";
}

function App() {
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Family Menu Planner
          </h1>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="plan">Weekly plan</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="space-y-6">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4">Add New Recipe</h2>
              <RecipeForm onRecipeAdded={refresh} />
            </div>
            {selectedRecipeId ? (
              <RecipeDetail
                recipeId={selectedRecipeId}
                onClose={() => setSelectedRecipeId(null)}
                onUpdated={refresh}
              />
            ) : (
              <RecipeList
                refreshTrigger={refreshTrigger}
                onSelectRecipe={setSelectedRecipeId}
              />
            )}
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-6">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4">Add Ingredient</h2>
              <IngredientForm onIngredientAdded={refresh} />
            </div>
            <IngredientList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            <WeeklyPlan refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
