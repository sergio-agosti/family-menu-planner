import { useState, useEffect } from "react";
import { BookOpen, Carrot, CalendarDays, LogOut, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeList } from "@/components/RecipeList";
import { RecipeDetail } from "@/components/RecipeDetail";
import { IngredientForm } from "@/components/IngredientForm";
import { IngredientList } from "@/components/IngredientList";
import { WeeklyPlan } from "@/components/WeeklyPlan";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import {
  acceptPendingInvites,
  getCurrentHouseholdId,
  getHouseholds,
  inviteToHousehold,
  type Household,
} from "@/lib/data";

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

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    getStoredRecipeId,
  );
  const [household, setHousehold] = useState<Household | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    acceptPendingInvites().catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getCurrentHouseholdId()
      .then(() => getHouseholds())
      .then((list) => setHousehold(list[0] ?? null))
      .catch(() => setHousehold(null));
  }, [user, refreshTrigger]);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!household) return;
    setInviteError(null);
    setInviteLoading(true);
    try {
      await inviteToHousehold(household.id, inviteEmail);
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl min-w-0 px-3 py-4 sm:px-4 sm:py-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Family Menu Planner
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="max-w-[12rem] truncate text-right text-sm text-muted-foreground sm:max-w-xs"
              title={
                household
                  ? `${user.user_metadata?.full_name ?? user.email ?? ""} / ${household.name}`
                  : (user.user_metadata?.full_name ?? user.email ?? undefined)
              }
            >
              {user.user_metadata?.full_name ?? user.email}
              {household ? ` / ${household.name}` : ""}
            </span>
            <div className="flex items-center">
              {household && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInviteOpen(true)}
                  className="px-2"
                  aria-label="Invite to household"
                >
                  <UserPlus className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="px-2"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogTitle>Invite to household</DialogTitle>
            <DialogDescription>
              Send an invite to someone. They’ll need to sign in with this email
              to join {household?.name ?? "your household"}.
            </DialogDescription>
            <Form onSubmit={handleInviteSubmit} className="space-y-4">
              <FormField>
                <FormLabel htmlFor="invite-email">Email</FormLabel>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner@example.com"
                  required
                />
              </FormField>
              {inviteError && (
                <FormMessage role="alert">{inviteError}</FormMessage>
              )}
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? "Sending…" : "Send invite"}
              </Button>
            </Form>
          </DialogContent>
        </Dialog>

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

          <TabsContent
            value="recipes"
            className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2"
          >
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
