import { useState, useEffect } from "react";
import { BookOpen, Carrot, CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeList } from "@/components/RecipeList";
import { RecipeDetail } from "@/components/RecipeDetail";
import { IngredientForm } from "@/components/IngredientForm";
import { IngredientList } from "@/components/IngredientList";
import { WeeklyPlan } from "@/components/WeeklyPlan";

const TAB_STORAGE_KEY = "family-menu-planner-tab";
const RECIPE_STORAGE_KEY = "family-menu-planner-selected-recipe";
const VALID_TABS = ["recipes", "ingredients", "plan"];

function getStoredTab(): string {
  if (typeof window === "undefined") return "recipes";
  const stored = localStorage.getItem(TAB_STORAGE_KEY);
  return stored && VALID_TABS.includes(stored) ? stored : "recipes";
}

function getStoredRecipeId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(RECIPE_STORAGE_KEY);
  return stored?.trim() ?? null;
}

function App() {
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    getStoredRecipeId,
  );

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedRecipeId) {
      localStorage.setItem(RECIPE_STORAGE_KEY, selectedRecipeId);
    } else {
      localStorage.removeItem(RECIPE_STORAGE_KEY);
    }
  }, [selectedRecipeId]);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl min-w-0 px-3 py-4 sm:px-4 sm:py-8">
        <header className="mb-4 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Family Menu Planner
          </h1>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="min-w-0 space-y-4"
        >
          <TabsList className="grid h-auto w-full min-w-0 grid-cols-3 gap-1 overflow-hidden p-1 sm:h-9">
            <TabsTrigger
              value="ingredients"
              className="flex min-w-0 items-center justify-center gap-1.5 overflow-hidden px-2 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm"
              title="Ingredients"
              aria-label="Ingredients"
            >
              <Carrot className="size-4 shrink-0" />
              <span className="hidden sm:inline">Ingredients</span>
            </TabsTrigger>
            <TabsTrigger
              value="recipes"
              className="flex min-w-0 items-center justify-center gap-1.5 overflow-hidden px-2 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm"
              title="Recipes"
              aria-label="Recipes"
            >
              <BookOpen className="size-4 shrink-0" />
              <span className="hidden sm:inline">Recipes</span>
            </TabsTrigger>
            <TabsTrigger
              value="plan"
              className="flex min-w-0 items-center justify-center gap-1.5 overflow-hidden px-2 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm"
              title="Weekly plan"
              aria-label="Weekly plan"
            >
              <CalendarDays className="size-4 shrink-0" />
              <span className="hidden sm:inline">Weekly plan</span>
            </TabsTrigger>
          </TabsList>

          <Dialog
            open={!!selectedRecipeId}
            onOpenChange={(open) => !open && setSelectedRecipeId(null)}
          >
            <DialogContent
              className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-none border-0 bg-transparent p-0 shadow-none"
              showCloseButton={false}
            >
              <DialogTitle className="sr-only">Recipe</DialogTitle>
              <DialogDescription className="sr-only">
                Recipe ingredients and details
              </DialogDescription>
              {selectedRecipeId && (
                <RecipeDetail
                  recipeId={selectedRecipeId}
                  onClose={() => setSelectedRecipeId(null)}
                  onUpdated={refresh}
                />
              )}
            </DialogContent>
          </Dialog>

          <TabsContent value="recipes" className="space-y-4 sm:space-y-6">
            <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-xl font-semibold sm:text-2xl">
                Add New Recipe
              </h2>
              <RecipeForm onRecipeAdded={refresh} />
            </div>
            <RecipeList
              refreshTrigger={refreshTrigger}
              onSelectRecipe={setSelectedRecipeId}
            />
          </TabsContent>

          <TabsContent
            value="ingredients"
            className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2"
          >
            <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-xl font-semibold sm:text-2xl">
                Add Ingredient
              </h2>
              <IngredientForm onIngredientAdded={refresh} />
            </div>
            <IngredientList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="plan" className="space-y-4 sm:space-y-6">
            <WeeklyPlan
              refreshTrigger={refreshTrigger}
              onOpenRecipe={setSelectedRecipeId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
