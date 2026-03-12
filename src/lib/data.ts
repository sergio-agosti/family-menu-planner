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

export interface DayPlan {
  breakfast?: string[];
  lunch?: string[];
  dinner?: string[];
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

function mapPlanRow(row: {
  date: string;
  breakfast: string[] | null;
  lunch: string[] | null;
  dinner: string[] | null;
}): [string, DayPlan] {
  const dateKey =
    typeof row.date === "string"
      ? row.date
      : ((row as { date: unknown }).date as string);
  return [
    dateKey,
    {
      breakfast: row.breakfast?.length ? row.breakfast : undefined,
      lunch: row.lunch?.length ? row.lunch : undefined,
      dinner: row.dinner?.length ? row.dinner : undefined,
    },
  ];
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
        .from("recipe_ingredients")
        .select("recipe_id, ingredient_id, quantity"),
      client.from("plan").select("date, breakfast, lunch, dinner"),
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
  const plan: Record<string, DayPlan> = {};
  for (const row of planRes.data ?? []) {
    const [key, day] = mapPlanRow(row as Parameters<typeof mapPlanRow>[0]);
    plan[key] = day;
  }

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

  const planRes = await client
    .from("plan")
    .select("date, breakfast, lunch, dinner");
  if (planRes.error) throw new Error(planRes.error.message);

  for (const row of planRes.data ?? []) {
    const r = row as {
      date: string;
      breakfast: string[];
      lunch: string[];
      dinner: string[];
    };
    const breakfast = (r.breakfast ?? []).filter((x) => x !== id);
    const lunch = (r.lunch ?? []).filter((x) => x !== id);
    const dinner = (r.dinner ?? []).filter((x) => x !== id);
    if (!breakfast.length && !lunch.length && !dinner.length) {
      await client.from("plan").delete().eq("date", r.date);
    } else {
      await client
        .from("plan")
        .update({ breakfast, lunch, dinner })
        .eq("date", r.date);
    }
  }

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

  await client.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

  if (items.length) {
    const rows = items
      .filter((i) => i.ingredientId.trim())
      .map(({ ingredientId, quantity }) => ({
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity: quantity.trim() || "",
      }));
    const { error } = await client.from("recipe_ingredients").insert(rows);
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
    .from("plan")
    .select("date, breakfast, lunch, dinner")
    .gte("date", start)
    .lte("date", end);

  if (error) throw new Error(error.message);

  const out: Record<string, DayPlan> = {};
  for (const row of data ?? []) {
    const [key, day] = mapPlanRow(row as Parameters<typeof mapPlanRow>[0]);
    out[key] = day;
  }
  return out;
}

export async function setSlotRecipes(
  dateKey: string,
  mealType: MealType,
  recipeIds: string[],
): Promise<void> {
  const client = ensureSupabase();

  const { data: existing } = await client
    .from("plan")
    .select("breakfast, lunch, dinner")
    .eq("date", dateKey)
    .maybeSingle();

  const row = existing as {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  } | null;
  const breakfast = row?.breakfast ?? [];
  const lunch = row?.lunch ?? [];
  const dinner = row?.dinner ?? [];

  const payload = {
    date: dateKey,
    breakfast: mealType === "breakfast" ? recipeIds : breakfast,
    lunch: mealType === "lunch" ? recipeIds : lunch,
    dinner: mealType === "dinner" ? recipeIds : dinner,
  };

  const hasAny =
    payload.breakfast.length || payload.lunch.length || payload.dinner.length;
  if (!hasAny) {
    await client.from("plan").delete().eq("date", dateKey);
    return;
  }

  const { error } = await client
    .from("plan")
    .upsert(payload, { onConflict: "date" });
  if (error) throw new Error(error.message);
}

export async function setDayPlan(
  dateKey: string,
  dayPlan: DayPlan,
): Promise<void> {
  const client = ensureSupabase();
  const hasAny =
    (dayPlan.breakfast?.length ?? 0) +
      (dayPlan.lunch?.length ?? 0) +
      (dayPlan.dinner?.length ?? 0) >
    0;

  if (!hasAny) {
    await client.from("plan").delete().eq("date", dateKey);
    return;
  }

  const { error } = await client.from("plan").upsert(
    {
      date: dateKey,
      breakfast: dayPlan.breakfast ?? [],
      lunch: dayPlan.lunch ?? [],
      dinner: dayPlan.dinner ?? [],
    },
    { onConflict: "date" },
  );
  if (error) throw new Error(error.message);
}
