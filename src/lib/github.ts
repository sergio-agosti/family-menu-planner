const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = import.meta.env.VITE_GITHUB_OWNER || "";
const REPO_NAME = import.meta.env.VITE_GITHUB_REPO || "";
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "";
const RECIPES_FILE_PATH = "src/data/recipes.json";

const LOCAL_STORAGE_KEY = "family-menu-planner-data";

function useLocalStorage(): boolean {
  return !REPO_OWNER || !REPO_NAME || !GITHUB_TOKEN;
}

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

const EMPTY_DATA: AppData = {
  recipes: [],
  ingredients: [],
  recipeIngredients: [],
  plan: {},
};

interface GitHubFileResponse {
  content: string;
  sha: string;
}

function normalizeData(parsed: Partial<AppData>): AppData {
  return {
    recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    recipeIngredients: Array.isArray(parsed.recipeIngredients) ? parsed.recipeIngredients : [],
    plan: parsed.plan && typeof parsed.plan === "object" ? parsed.plan : {},
  };
}

export async function getData(): Promise<AppData> {
  if (useLocalStorage()) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return EMPTY_DATA;
      const parsed = JSON.parse(raw) as Partial<AppData>;
      return normalizeData(parsed);
    } catch {
      return EMPTY_DATA;
    }
  }

  try {
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${RECIPES_FILE_PATH}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) return EMPTY_DATA;
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = (await response.json()) as GitHubFileResponse;
    const content = atob(data.content.replace(/\s/g, ""));
    const parsed = JSON.parse(content) as Partial<AppData>;
    return normalizeData(parsed);
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function saveData(data: AppData, message = "Update menu data"): Promise<unknown> {
  if (useLocalStorage()) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data, null, 2));
    return undefined;
  }

  const getUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${RECIPES_FILE_PATH}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });

  let sha: string | null = null;
  if (getResponse.ok) {
    const fileData = (await getResponse.json()) as GitHubFileResponse;
    sha = fileData.sha;
  }

  const content = JSON.stringify(data, null, 2);
  const encodedContent = btoa(unescape(encodeURIComponent(content)));

  const commitResponse = await fetch(getUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: encodedContent,
      ...(sha && { sha }),
    }),
  });

  if (!commitResponse.ok) {
    const errorData = (await commitResponse.json()) as { message?: string };
    throw new Error(errorData.message || commitResponse.statusText);
  }

  return commitResponse.json();
}

export async function getRecipes(): Promise<{ recipes: Recipe[] }> {
  const data = await getData();
  return { recipes: data.recipes };
}

export async function addRecipe(name: string): Promise<Recipe> {
  const data = await getData();
  const recipe: Recipe = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  data.recipes.push(recipe);
  await saveData(data, `Add recipe: ${name}`);
  return recipe;
}

export async function updateRecipe(id: string, updates: { name?: string }): Promise<void> {
  const data = await getData();
  const recipe = data.recipes.find((r) => r.id === id);
  if (!recipe) return;
  if (updates.name !== undefined) recipe.name = updates.name;
  await saveData(data, `Update recipe: ${recipe.name}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  const data = await getData();
  data.recipes = data.recipes.filter((r) => r.id !== id);
  data.recipeIngredients = data.recipeIngredients.filter((ri) => ri.recipeId !== id);
  for (const dateKey of Object.keys(data.plan)) {
    const day = data.plan[dateKey];
    for (const key of ["breakfast", "lunch", "dinner"] as const) {
      const arr = day[key];
      if (arr) day[key] = arr.filter((rid) => rid !== id);
    }
    if (!day.breakfast?.length && !day.lunch?.length && !day.dinner?.length) {
      delete data.plan[dateKey];
    }
  }
  await saveData(data, "Delete recipe");
}

export async function addIngredient(name: string, tescoUrl: string): Promise<Ingredient> {
  const data = await getData();
  const ingredient: Ingredient = {
    id: crypto.randomUUID(),
    name,
    tescoUrl: tescoUrl.trim() || "",
  };
  data.ingredients.push(ingredient);
  await saveData(data, `Add ingredient: ${name}`);
  return ingredient;
}

export async function updateIngredient(id: string, updates: { name?: string; tescoUrl?: string }): Promise<void> {
  const data = await getData();
  const ing = data.ingredients.find((i) => i.id === id);
  if (!ing) return;
  if (updates.name !== undefined) ing.name = updates.name;
  if (updates.tescoUrl !== undefined) ing.tescoUrl = updates.tescoUrl;
  await saveData(data, `Update ingredient: ${ing.name}`);
}

export async function deleteIngredient(id: string): Promise<void> {
  const data = await getData();
  data.ingredients = data.ingredients.filter((i) => i.id !== id);
  data.recipeIngredients = data.recipeIngredients.filter((ri) => ri.ingredientId !== id);
  await saveData(data, "Delete ingredient");
}

export async function setRecipeIngredients(
  recipeId: string,
  items: { ingredientId: string; quantity: string }[]
): Promise<void> {
  const data = await getData();
  data.recipeIngredients = data.recipeIngredients.filter((ri) => ri.recipeId !== recipeId);
  for (const { ingredientId, quantity } of items) {
    if (!ingredientId.trim()) continue;
    data.recipeIngredients.push({ recipeId, ingredientId, quantity: quantity.trim() });
  }
  await saveData(data, "Update recipe ingredients");
}

export async function getPlanForDateRange(startDate: Date, endDate: Date): Promise<Record<string, DayPlan>> {
  const data = await getData();
  const out: Record<string, DayPlan> = {};
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  for (const [key, day] of Object.entries(data.plan)) {
    const d = new Date(key);
    if (d >= start && d <= end) out[key] = { ...day };
  }
  return out;
}

export async function setSlotRecipes(
  dateKey: string,
  mealType: MealType,
  recipeIds: string[]
): Promise<void> {
  const data = await getData();
  if (!data.plan[dateKey]) data.plan[dateKey] = {};
  const day = data.plan[dateKey];
  day[mealType] = recipeIds.length ? recipeIds : undefined;
  if (!day.breakfast?.length && !day.lunch?.length && !day.dinner?.length) {
    delete data.plan[dateKey];
  }
  await saveData(data, "Update weekly plan");
}

export async function setDayPlan(dateKey: string, dayPlan: DayPlan): Promise<void> {
  const data = await getData();
  const hasAny = (dayPlan.breakfast?.length ?? 0) + (dayPlan.lunch?.length ?? 0) + (dayPlan.dinner?.length ?? 0) > 0;
  if (hasAny) data.plan[dateKey] = { ...dayPlan };
  else delete data.plan[dateKey];
  await saveData(data, "Update weekly plan");
}
