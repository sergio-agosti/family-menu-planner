import { useRef, useState, useEffect } from "react";
import { RemovablePill } from "@/components/RemovablePill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addIngredient,
  getData,
  setRecipeIngredients,
  updateIngredient,
  type Recipe,
  type Ingredient,
  type RecipeIngredient,
} from "@/lib/data";
import { getTescoSearchUrl } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  ClipboardPaste,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface RecipeDetailProps {
  recipeId: string;
  onClose: () => void;
  onUpdated?: () => void;
  /** When true, render only the ingredients section (no card, no title). */
  inline?: boolean;
}

export function RecipeDetail({
  recipeId,
  onClose,
  onUpdated,
  inline = false,
}: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeIngredients, setRecipeIngredientsState] = useState<
    RecipeIngredient[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addIngredientId, setAddIngredientId] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const addIngredientOpenAt = useRef<number>(0);
  const [addIngredientSearch, setAddIngredientSearch] = useState("");
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [quantityDraft, setQuantityDraft] = useState<Record<string, string>>(
    {},
  );
  const [pastingId, setPastingId] = useState<string | null>(null);

  const refreshIngredients = () =>
    getData().then((data) =>
      setRecipeIngredientsState(
        data.recipeIngredients.filter((ri) => ri.recipeId === recipeId),
      ),
    );

  useEffect(() => {
    getData().then((data) => {
      const r = data.recipes.find((x) => x.id === recipeId) ?? null;
      setRecipe(r);
      setIngredients(data.ingredients);
      setRecipeIngredientsState(
        data.recipeIngredients.filter((ri) => ri.recipeId === recipeId),
      );
      setIsLoading(false);
    });
  }, [recipeId]);

  const persistIngredients = async (
    items: { ingredientId: string; quantity: string }[],
  ) => {
    if (!recipeId) return;
    setSaving(true);
    try {
      await setRecipeIngredients(recipeId, items);
      await refreshIngredients();
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (ingredientId: string) => {
    const next = recipeIngredients
      .filter((ri) => ri.ingredientId !== ingredientId)
      .map((ri) => ({ ingredientId: ri.ingredientId, quantity: ri.quantity }));
    persistIngredients(next);
  };

  const handleAdd = () => {
    const id = addIngredientId.trim();
    if (!id) return;
    const next = [
      ...recipeIngredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
      })),
      { ingredientId: id, quantity: addQuantity.trim() },
    ];
    setAddIngredientId("");
    setAddQuantity("");
    setAddIngredientOpen(false);
    persistIngredients(next);
  };

  const handleCreateIngredient = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creatingIngredient) return;
    setCreatingIngredient(true);
    try {
      const newIngredient = await addIngredient(trimmed, "");
      setIngredients((prev) =>
        [...prev, newIngredient].sort((a, b) => a.name.localeCompare(b.name)),
      );
      const next = [
        ...recipeIngredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
        })),
        { ingredientId: newIngredient.id, quantity: addQuantity.trim() },
      ];
      await persistIngredients(next);
      setAddIngredientId("");
      setAddQuantity("");
      setAddIngredientSearch("");
      setAddIngredientOpen(false);
    } finally {
      setCreatingIngredient(false);
    }
  };

  const handleQuantityBlur = (ingredientId: string) => {
    const value = (
      quantityDraft[ingredientId] ??
      recipeIngredients.find((ri) => ri.ingredientId === ingredientId)
        ?.quantity ??
      ""
    ).trim();
    setQuantityDraft((prev) => {
      const next = { ...prev };
      delete next[ingredientId];
      return next;
    });
    const current = recipeIngredients.find(
      (ri) => ri.ingredientId === ingredientId,
    );
    if (current?.quantity === value) return;
    const next = recipeIngredients.map((ri) =>
      ri.ingredientId === ingredientId
        ? { ingredientId: ri.ingredientId, quantity: value }
        : { ingredientId: ri.ingredientId, quantity: ri.quantity },
    );
    persistIngredients(next);
  };

  const handlePasteTescoUrl = async (ing: Ingredient) => {
    setPastingId(ing.id);
    try {
      const url = (await navigator.clipboard.readText()).trim();
      if (url) {
        await updateIngredient(ing.id, { tescoUrl: url });
        const data = await getData();
        setIngredients(data.ingredients);
        onUpdated?.();
      }
    } finally {
      setPastingId(null);
    }
  };

  const byId = Object.fromEntries(ingredients.map((i) => [i.id, i]));

  const ingredientsBlock = (
    <div className="flex flex-col gap-y-2">
      {!inline && <h4 className="text-sm font-medium">Ingredients</h4>}
      <div className="grid grid-cols-[2fr_1fr_auto] items-center gap-x-2 gap-y-2">
        <div className="col-span-full grid grid-cols-subgrid items-center gap-x-2 text-sm">
          <Popover
            open={addIngredientOpen}
            onOpenChange={(open) => {
              setAddIngredientOpen(open);
              if (open) addIngredientOpenAt.current = Date.now();
              if (!open) setAddIngredientSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={addIngredientOpen}
                className="h-9 w-full min-w-0 justify-between font-normal"
              >
                <span className="truncate">
                  {addIngredientId
                    ? (byId[addIngredientId]?.name ?? addIngredientId)
                    : "Add ingredient…"}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-(--radix-popover-trigger-width) p-0"
              align="start"
            >
              <Command
                value={addIngredientId}
                filter={(value, search, keywords) => {
                  if (value === "__create__") return 1;
                  const s = (search ?? "").trim().toLowerCase();
                  if (!s) return 1;
                  const text = [value, ...(keywords ?? [])]
                    .join(" ")
                    .toLowerCase();
                  return text.includes(s) ? 1 : 0;
                }}
              >
                <CommandInput
                  placeholder="Search ingredients…"
                  value={addIngredientSearch}
                  onValueChange={setAddIngredientSearch}
                />
                <CommandList>
                  <CommandEmpty>No ingredient found.</CommandEmpty>
                  {ingredients.map((ing) => (
                    <CommandItem
                      key={ing.id}
                      value={ing.id}
                      keywords={[ing.name]}
                      onSelect={() => {
                        if (Date.now() - addIngredientOpenAt.current < 150)
                          return;
                        setAddIngredientId(ing.id);
                        setAddIngredientOpen(false);
                      }}
                    >
                      <Check
                        className={
                          addIngredientId === ing.id
                            ? "mr-2 size-4 opacity-100"
                            : "mr-2 size-4 opacity-0"
                        }
                      />
                      {ing.name}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
              {addIngredientSearch.trim() && (
                <div className="border-t p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 font-normal"
                    disabled={creatingIngredient}
                    onClick={() => handleCreateIngredient(addIngredientSearch)}
                  >
                    <Plus className="size-4 shrink-0" />
                    Add &quot;{addIngredientSearch.trim()}&quot; as new
                    ingredient
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Input
            placeholder="Qty"
            value={addQuantity}
            onChange={(e) => setAddQuantity(e.target.value)}
            className="h-8 w-full justify-self-end text-right text-sm"
          />
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 touch-manipulation p-0 text-muted-foreground"
              title="Add ingredient"
              onClick={handleAdd}
              disabled={saving || !addIngredientId.trim() || creatingIngredient}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <ul className="col-span-full grid grid-cols-subgrid items-center gap-x-2 gap-y-2">
          {recipeIngredients.length === 0 ? (
            <li
              key="empty"
              className="col-span-full text-sm text-muted-foreground"
            >
              No ingredients yet.
            </li>
          ) : (
            recipeIngredients.map((ri, index) => {
              const ing = byId[ri.ingredientId];
              const label = ing ? ing.name : "(unknown)";
              return (
                <li
                  key={`${ri.ingredientId}-${index}`}
                  className="col-span-full grid grid-cols-subgrid items-center gap-x-2 text-sm"
                >
                  <div className="w-full min-w-0">
                    <RemovablePill
                      label={label}
                      onRemove={() => handleRemove(ri.ingredientId)}
                      disabled={saving}
                      removeTitle="Remove ingredient"
                      fullWidth
                    />
                  </div>
                  <Input
                    value={quantityDraft[ri.ingredientId] ?? ri.quantity}
                    onChange={(e) =>
                      setQuantityDraft((prev) => ({
                        ...prev,
                        [ri.ingredientId]: e.target.value,
                      }))
                    }
                    onBlur={() => handleQuantityBlur(ri.ingredientId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    disabled={saving}
                    className="h-8 w-full justify-self-end text-right text-sm"
                  />
                  <div className="flex items-center justify-end">
                    {ing?.tescoUrl ? (
                      <a
                        href={ing.tescoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Open Tesco product (new tab)"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : ing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 touch-manipulation p-0 text-muted-foreground"
                        title="Paste Tesco URL from clipboard"
                        onClick={() => handlePasteTescoUrl(ing)}
                        disabled={pastingId === ing.id}
                      >
                        <ClipboardPaste className="size-4" />
                      </Button>
                    ) : null}
                    {ing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 touch-manipulation p-0 text-muted-foreground"
                        title="Find on Tesco"
                        onClick={() =>
                          window.open(
                            getTescoSearchUrl(ing.name),
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <Search className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );

  if (isLoading || !recipe) {
    return inline ? (
      <p className="pt-2 text-sm text-muted-foreground">Loading...</p>
    ) : (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (inline) {
    return <div className="border-t pt-3">{ingredientsBlock}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 truncate text-lg sm:text-base">
          {recipe.name}
        </CardTitle>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 touch-manipulation p-0"
            title="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{ingredientsBlock}</CardContent>
    </Card>
  );
}
