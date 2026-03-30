import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { RemovablePill } from "@/components/RemovablePill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { RecipeDifficultyPicker } from "@/components/RecipeDifficultyDot";
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
  updateRecipe,
  type Recipe,
  type RecipeDifficulty,
  type Ingredient,
  type RecipeIngredient,
} from "@/lib/data";
import { getTescoSearchUrl } from "@/lib/utils";
import {
  ChevronsUpDown,
  ClipboardPaste,
  ExternalLink,
  Plus,
  Search,
  X,
} from "lucide-react";

function sortRecipeIngredientsForDisplay(
  items: RecipeIngredient[],
  nameById: Record<string, string>,
  pinnedIngredientId: string | null,
): RecipeIngredient[] {
  const label = (ingredientId: string) =>
    nameById[ingredientId] ?? "\uffff";

  const byName = (a: RecipeIngredient, b: RecipeIngredient) =>
    label(a.ingredientId).localeCompare(label(b.ingredientId), undefined, {
      sensitivity: "base",
    });

  if (
    !pinnedIngredientId ||
    !items.some((ri) => ri.ingredientId === pinnedIngredientId)
  ) {
    return [...items].sort(byName);
  }

  const pinned = items.find(
    (ri) => ri.ingredientId === pinnedIngredientId,
  )!;
  const rest = items.filter(
    (ri) => ri.ingredientId !== pinnedIngredientId,
  );
  return [pinned, ...rest.sort(byName)];
}

interface RecipeDetailProps {
  recipeId: string;
  onClose: () => void;
  onUpdated?: () => void;
  /** When true, render only the ingredients section (no card, no title). */
  inline?: boolean;
  /** Render popovers inside this node (e.g. dialog content) so nested lists scroll when a modal uses scroll lock. */
  popoverPortalContainer?: HTMLElement | null;
}

export function RecipeDetail({
  recipeId,
  onClose,
  onUpdated,
  inline = false,
  popoverPortalContainer,
}: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeIngredients, setRecipeIngredientsState] = useState<
    RecipeIngredient[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const [addIngredientSearch, setAddIngredientSearch] = useState("");
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [quantityDraft, setQuantityDraft] = useState<Record<string, string>>(
    {},
  );
  const [pastingId, setPastingId] = useState<string | null>(null);
  const [pinnedIngredientId, setPinnedIngredientId] = useState<string | null>(
    null,
  );
  const quantityInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const tescoSearchButtonRefs = useRef<Map<string, HTMLButtonElement>>(
    new Map(),
  );
  const [pendingFocusAfterAdd, setPendingFocusAfterAdd] = useState<{
    ingredientId: string;
    triggerTescoSearch: boolean;
  } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [difficultyError, setDifficultyError] = useState("");
  const nameEditRef = useRef<HTMLSpanElement>(null);

  const refreshIngredients = () =>
    getData().then((data) =>
      setRecipeIngredientsState(
        data.recipeIngredients.filter((ri) => ri.recipeId === recipeId),
      ),
    );

  useEffect(() => {
    setPinnedIngredientId(null);
    setEditingName(false);
    setNameError("");
    setDifficultyError("");
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

  useEffect(() => {
    if (!editingName || !nameEditRef.current) return;
    nameEditRef.current.focus();
    const sel = getSelection();
    const range = document.createRange();
    range.selectNodeContents(nameEditRef.current);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editingName]);

  useEffect(() => {
    if (
      pinnedIngredientId &&
      !recipeIngredients.some(
        (ri) => ri.ingredientId === pinnedIngredientId,
      )
    ) {
      setPinnedIngredientId(null);
    }
  }, [recipeIngredients, pinnedIngredientId]);

  useLayoutEffect(() => {
    if (!pendingFocusAfterAdd) return;
    const { ingredientId, triggerTescoSearch } = pendingFocusAfterAdd;
    if (!recipeIngredients.some((ri) => ri.ingredientId === ingredientId)) {
      return;
    }
    const input = quantityInputRefs.current.get(ingredientId);
    input?.focus();
    if (triggerTescoSearch) {
      tescoSearchButtonRefs.current.get(ingredientId)?.click();
    }
    setPendingFocusAfterAdd(null);
  }, [pendingFocusAfterAdd, recipeIngredients]);

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
    if (ingredientId === pinnedIngredientId) setPinnedIngredientId(null);
    const next = recipeIngredients
      .filter((ri) => ri.ingredientId !== ingredientId)
      .map((ri) => ({ ingredientId: ri.ingredientId, quantity: ri.quantity }));
    persistIngredients(next);
  };

  const addIngredientToRecipe = async (ingredientId: string) => {
    if (saving) return;
    const id = ingredientId.trim();
    if (!id) return;
    if (recipeIngredients.some((ri) => ri.ingredientId === id)) {
      setAddIngredientOpen(false);
      setAddIngredientSearch("");
      return;
    }
    const next = [
      ...recipeIngredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
      })),
      { ingredientId: id, quantity: "" },
    ];
    setAddIngredientOpen(false);
    setAddIngredientSearch("");
    await persistIngredients(next);
    setPinnedIngredientId(id);
    setPendingFocusAfterAdd({
      ingredientId: id,
      triggerTescoSearch: false,
    });
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
      if (recipeIngredients.some((ri) => ri.ingredientId === newIngredient.id)) {
        setAddIngredientSearch("");
        setAddIngredientOpen(false);
        return;
      }
      const next = [
        ...recipeIngredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
        })),
        { ingredientId: newIngredient.id, quantity: "" },
      ];
      await persistIngredients(next);
      setPinnedIngredientId(newIngredient.id);
      setAddIngredientSearch("");
      setAddIngredientOpen(false);
      setPendingFocusAfterAdd({
        ingredientId: newIngredient.id,
        triggerTescoSearch: true,
      });
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
  const ingredientNameById = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i.name])),
    [ingredients],
  );
  const displayedRecipeIngredients = useMemo(
    () =>
      sortRecipeIngredientsForDisplay(
        recipeIngredients,
        ingredientNameById,
        pinnedIngredientId,
      ),
    [recipeIngredients, ingredientNameById, pinnedIngredientId],
  );

  const ingredientsBlock = (
    <div className="flex flex-col gap-y-2">
      {!inline && <h4 className="text-sm font-medium">Ingredients</h4>}
      <div className="grid grid-cols-[2fr_1fr_auto] items-center gap-x-2 gap-y-2">
        <div className="col-span-full text-sm">
          <Popover
            open={addIngredientOpen}
            onOpenChange={(open) => {
              setAddIngredientOpen(open);
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
                <span className="truncate">Add ingredient…</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              container={popoverPortalContainer}
              className="z-100 w-(--radix-popover-trigger-width) p-0"
              align="start"
            >
              <Command
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
                      onSelect={() => addIngredientToRecipe(ing.id)}
                    >
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
                    disabled={creatingIngredient || saving}
                    onClick={() => handleCreateIngredient(addIngredientSearch)}
                  >
                    <Plus className="size-4 shrink-0" />
                    Add as new ingredient
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
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
            displayedRecipeIngredients.map((ri, index) => {
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
                    ref={(el) => {
                      const m = quantityInputRefs.current;
                      if (el) m.set(ri.ingredientId, el);
                      else m.delete(ri.ingredientId);
                    }}
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
                        ref={(el) => {
                          const m = tescoSearchButtonRefs.current;
                          if (el) m.set(ri.ingredientId, el);
                          else m.delete(ri.ingredientId);
                        }}
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
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-4 h-4 w-28" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    ) : (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-9 w-9 shrink-0" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-36" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inline) {
    return <div className="border-t pt-3">{ingredientsBlock}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <CardTitle className="min-w-0 text-xl leading-tight sm:text-lg">
                <span
                  ref={nameEditRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="block cursor-text truncate outline-none"
                  onBlur={() => {
                    const newName =
                      nameEditRef.current?.textContent?.trim() ?? recipe.name;
                    setEditingName(false);
                    if (newName && newName !== recipe.name) {
                      updateRecipe(recipe.id, { name: newName })
                        .then(() => {
                          setNameError("");
                          setRecipe((prev) =>
                            prev ? { ...prev, name: newName } : prev,
                          );
                          onUpdated?.();
                        })
                        .catch((err) =>
                          setNameError(
                            err instanceof Error
                              ? err.message
                              : "Failed to update recipe",
                          ),
                        );
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLElement).blur();
                  }}
                >
                  {recipe.name}
                </span>
              </CardTitle>
            ) : (
              <CardTitle className="min-w-0 text-xl leading-tight sm:text-lg">
                <span
                  role="button"
                  tabIndex={0}
                  className="block cursor-pointer truncate hover:opacity-80"
                  title="Click to edit"
                  onClick={() => {
                    setNameError("");
                    setEditingName(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setNameError("");
                      setEditingName(true);
                    }
                  }}
                >
                  {recipe.name}
                </span>
              </CardTitle>
            )}
          </div>
          <RecipeDifficultyPicker
            value={recipe.difficulty}
            disabled={saving}
            onChange={(next) => {
              if (next === recipe.difficulty) return;
              setDifficultyError("");
              updateRecipe(recipe.id, { difficulty: next })
                .then(() => {
                  setRecipe((prev) =>
                    prev ? { ...prev, difficulty: next } : prev,
                  );
                  onUpdated?.();
                })
                .catch((err) =>
                  setDifficultyError(
                    err instanceof Error
                      ? err.message
                      : "Failed to update difficulty",
                  ),
                );
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 shrink-0 touch-manipulation p-0"
            title="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
        {nameError || difficultyError ? (
          <div className="space-y-1">
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
            {difficultyError ? (
              <p className="text-xs text-destructive">{difficultyError}</p>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">{ingredientsBlock}</CardContent>
    </Card>
  );
}
