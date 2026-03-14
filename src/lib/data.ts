import { supabase } from "@/lib/supabase";

export interface Recipe {
  id: string;
  name: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  tescoUrl: string;
}

export interface RecipeIngredient {
  recipeId: string;
  ingredientId: string;
  quantity: string;
}

export type MealType = "breakfast" | "lunch" | "dinner";
export type TargetType = "adults" | "kids";

export interface DayPlan {
  breakfast?: Partial<Record<TargetType, string[]>>;
  lunch?: Partial<Record<TargetType, string[]>>;
  dinner?: Partial<Record<TargetType, string[]>>;
}

export interface AppData {
  recipes: Recipe[];
  ingredients: Ingredient[];
  recipeIngredients: RecipeIngredient[];
  plan: Record<string, DayPlan>;
}

function ensureSupabase(): NonNullable<typeof supabase> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env",
    );
  }
  return supabase;
}

function mapRecipe(row: {
  id: string;
  name: string;
  created_at: string;
}): Recipe {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function mapIngredient(row: {
  id: string;
  name: string;
  tesco_url: string | null;
}): Ingredient {
  return { id: row.id, name: row.name, tescoUrl: row.tesco_url ?? "" };
}

function mapRecipeIngredient(row: {
  recipe_id: string;
  ingredient_id: string;
  quantity: string;
}): RecipeIngredient {
  return {
    recipeId: row.recipe_id,
    ingredientId: row.ingredient_id,
    quantity: row.quantity ?? "",
  };
}

interface PlanRow {
  happening_at: string;
  meal: MealType;
  target: TargetType;
  recipe_id: string;
}

function mapPlansToDayPlan(rows: PlanRow[]): Record<string, DayPlan> {
  const out: Record<string, DayPlan> = {};

  for (const row of rows) {
    const key = row.happening_at;
    const existing = out[key] ?? {};
    const meal = row.meal;
    const target = row.target;
    const mealEntry =
      (
        existing as Record<
          MealType,
          Partial<Record<TargetType, string[]>> | undefined
        >
      )[meal] ?? {};
    const list =
      (mealEntry as Partial<Record<TargetType, string[]>>)[target] ?? [];
    (mealEntry as Record<TargetType, string[]>)[target] = [
      ...list,
      row.recipe_id,
    ];
    (existing as Record<MealType, Partial<Record<TargetType, string[]>>>)[
      meal
    ] = mealEntry;
    out[key] = existing;
  }

  return out;
}

export async function getData(): Promise<AppData> {
  const client = ensureSupabase();

  const [recipesRes, ingredientsRes, recipeIngredientsRes, planRes] =
    await Promise.all([
      client
        .from("recipes")
        .select("id, name, created_at")
        .order("created_at", { ascending: true }),
      client.from("ingredients").select("id, name, tesco_url").order("name"),
      client
        .from("ingredients_recipes")
        .select("recipe_id, ingredient_id, quantity"),
      client.from("plans").select("happening_at, meal, target, recipe_id"),
    ]);

  if (recipesRes.error) throw new Error(recipesRes.error.message);
  if (ingredientsRes.error) throw new Error(ingredientsRes.error.message);
  if (recipeIngredientsRes.error)
    throw new Error(recipeIngredientsRes.error.message);
  if (planRes.error) throw new Error(planRes.error.message);

  const recipes = (recipesRes.data ?? []).map(mapRecipe);
  const ingredients = (ingredientsRes.data ?? []).map(mapIngredient);
  const recipeIngredients = (recipeIngredientsRes.data ?? []).map(
    mapRecipeIngredient,
  );
  const plan = mapPlansToDayPlan((planRes.data ?? []) as unknown as PlanRow[]);

  return { recipes, ingredients, recipeIngredients, plan };
}

export async function saveData(
  _data: AppData,
  _message?: string,
): Promise<unknown> {
  // No-op: mutations use direct table writes. Kept for API compatibility.
  return undefined;
}

export async function getRecipes(): Promise<{ recipes: Recipe[] }> {
  const data = await getData();
  return { recipes: data.recipes };
}

export async function addRecipe(name: string): Promise<Recipe> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("recipes")
    .insert({ id: crypto.randomUUID(), name })
    .select("id, name, created_at")
    .single();

  if (error) throw new Error(error.message);
  return mapRecipe(data);
}

export async function updateRecipe(
  id: string,
  updates: { name?: string },
): Promise<void> {
  if (updates.name === undefined) return;
  const client = ensureSupabase();
  const { error } = await client
    .from("recipes")
    .update({ name: updates.name })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRecipe(id: string): Promise<void> {
  const client = ensureSupabase();

  const { error: plansError } = await client
    .from("plans")
    .delete()
    .eq("recipe_id", id);
  if (plansError) throw new Error(plansError.message);

  const { error } = await client.from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addIngredient(
  name: string,
  tescoUrl: string,
): Promise<Ingredient> {
  const client = ensureSupabase();
  const url = tescoUrl.trim();
  const { data, error } = await client
    .from("ingredients")
    .insert({
      id: crypto.randomUUID(),
      name,
      tesco_url: url ? url : null,
    })
    .select("id, name, tesco_url")
    .single();

  if (error) throw new Error(error.message);
  return mapIngredient(data);
}

export async function updateIngredient(
  id: string,
  updates: { name?: string; tescoUrl?: string },
): Promise<void> {
  const client = ensureSupabase();
  const payload: { name?: string; tesco_url?: string | null } = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.tescoUrl !== undefined) {
    const url = updates.tescoUrl.trim();
    payload.tesco_url = url ? url : null;
  }
  if (Object.keys(payload).length === 0) return;
  const { error } = await client
    .from("ingredients")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteIngredient(id: string): Promise<void> {
  const client = ensureSupabase();
  const { error } = await client.from("ingredients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setRecipeIngredients(
  recipeId: string,
  items: { ingredientId: string; quantity: string }[],
): Promise<void> {
  const client = ensureSupabase();

  await client.from("ingredients_recipes").delete().eq("recipe_id", recipeId);

  if (items.length) {
    const rows = items
      .filter((i) => i.ingredientId.trim())
      .map(({ ingredientId, quantity }) => ({
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity: quantity.trim() || "",
      }));
    const { error } = await client.from("ingredients_recipes").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function getPlanForDateRange(
  startDate: Date,
  endDate: Date,
): Promise<Record<string, DayPlan>> {
  const client = ensureSupabase();
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  const { data, error } = await client
    .from("plans")
    .select("happening_at, meal, target, recipe_id")
    .gte("happening_at", start)
    .lte("happening_at", end);

  if (error) throw new Error(error.message);

  return mapPlansToDayPlan((data ?? []) as unknown as PlanRow[]);
}

export async function setSlotRecipes(
  dateKey: string,
  mealType: MealType,
  target: TargetType,
  recipeIds: string[],
): Promise<void> {
  const client = ensureSupabase();

  const { error: deleteError } = await client
    .from("plans")
    .delete()
    .eq("happening_at", dateKey)
    .eq("meal", mealType)
    .eq("target", target);
  if (deleteError) throw new Error(deleteError.message);

  if (!recipeIds.length) return;

  const rows = recipeIds.map((recipeId) => ({
    happening_at: dateKey,
    meal: mealType,
    target,
    recipe_id: recipeId,
  }));

  const { error } = await client.from("plans").insert(rows);
  if (error) throw new Error(error.message);
}

export async function setDayPlan(
  dateKey: string,
  dayPlan: DayPlan,
): Promise<void> {
  const client = ensureSupabase();

  const { error: deleteError } = await client
    .from("plans")
    .delete()
    .eq("happening_at", dateKey);
  if (deleteError) throw new Error(deleteError.message);

  const rows: {
    happening_at: string;
    meal: MealType;
    target: TargetType;
    recipe_id: string;
  }[] = [];

  for (const meal of ["breakfast", "lunch", "dinner"] as const) {
    const mealEntry = dayPlan[meal] ?? {};
    for (const target of ["adults", "kids"] as const) {
      const ids = mealEntry[target] ?? [];
      for (const recipeId of ids) {
        rows.push({
          happening_at: dateKey,
          meal,
          target,
          recipe_id: recipeId,
        });
      }
    }
  }

  if (!rows.length) return;

  const { error } = await client.from("plans").insert(rows);
  if (error) throw new Error(error.message);
}
