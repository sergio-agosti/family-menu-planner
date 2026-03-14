import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { RemovablePill } from "@/components/RemovablePill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getData,
  getPlanForDateRange,
  setSlotRecipes,
  type DayPlan,
  type MealType,
  type Recipe,
  type TargetType,
} from "@/lib/data";

const MEAL_COLUMNS_STORAGE_KEY = "family-menu-planner:meal-columns-collapsed";

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

function loadCollapsedColumns(): Record<MealType, boolean> {
  try {
    const raw = localStorage.getItem(MEAL_COLUMNS_STORAGE_KEY);
    if (!raw) return { breakfast: false, lunch: false, dinner: false };
    const parsed = JSON.parse(raw) as Partial<Record<MealType, boolean>>;
    return {
      breakfast: Boolean(parsed.breakfast),
      lunch: Boolean(parsed.lunch),
      dinner: Boolean(parsed.dinner),
    };
  } catch {
    return { breakfast: false, lunch: false, dinner: false };
  }
}

const TARGETS: { key: TargetType; label: string }[] = [
  { key: "adults", label: "Adults" },
  { key: "kids", label: "Kids" },
];

function getMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

interface WeeklyPlanProps {
  refreshTrigger: number;
  onOpenRecipe?: (recipeId: string) => void;
}

export function WeeklyPlan({ refreshTrigger, onOpenRecipe }: WeeklyPlanProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<Record<string, DayPlan>>({});
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] =
    useState<Record<MealType, boolean>>(loadCollapsedColumns);

  const toggleColumn = useCallback((mealType: MealType) => {
    setCollapsedColumns((prev) => {
      const next = { ...prev, [mealType]: !prev[mealType] };
      try {
        localStorage.setItem(MEAL_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const days = useMemo(() => {
    const out: Date[] = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 13);
    Promise.all([getData(), getPlanForDateRange(start, end)])
      .then(([data, planData]) => {
        if (cancelled) return;
        setRecipes(data.recipes);
        setPlan(planData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart, refreshTrigger]);

  const addRecipeToSlot = async (
    dateKey: string,
    mealType: MealType,
    target: TargetType,
    recipeId: string,
  ) => {
    const current = plan[dateKey]?.[mealType]?.[target] ?? [];
    if (current.includes(recipeId)) return;
    setSaving(`${dateKey}-${mealType}-${target}`);
    try {
      await setSlotRecipes(dateKey, mealType, target, [...current, recipeId]);
      setPlan((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [mealType]: {
            ...(prev[dateKey]?.[mealType] ?? {}),
            [target]: [
              ...(prev[dateKey]?.[mealType]?.[target] ?? []),
              recipeId,
            ],
          },
        },
      }));
    } finally {
      setSaving(null);
    }
  };

  const removeRecipeFromSlot = async (
    dateKey: string,
    mealType: MealType,
    target: TargetType,
    recipeId: string,
  ) => {
    const current = plan[dateKey]?.[mealType]?.[target] ?? [];
    const next = current.filter((id) => id !== recipeId);
    setSaving(`${dateKey}-${mealType}-${target}`);
    try {
      await setSlotRecipes(dateKey, mealType, target, next);
      setPlan((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [mealType]: {
            ...(prev[dateKey]?.[mealType] ?? {}),
            [target]: next.length ? next : undefined,
          },
        },
      }));
    } finally {
      setSaving(null);
    }
  };

  const recipeById = useMemo(
    () => Object.fromEntries(recipes.map((r) => [r.id, r])),
    [recipes],
  );

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes],
  );

  const gridCols = useMemo(
    () =>
      `7rem ${MEAL_TYPES.map(({ key }) => (collapsedColumns[key] ? "2.5rem" : "1fr")).join(" ")}`,
    [collapsedColumns],
  );

  const goPrev = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 14);
    setWeekStart(d);
  };

  const goNext = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 14);
    setWeekStart(d);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading plan…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <CardTitle className="text-lg sm:text-base">2-week plan</CardTitle>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goPrev}
            className="text-xs sm:text-sm"
          >
            Previous 2 weeks
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goNext}
            className="text-xs sm:text-sm"
          >
            Next 2 weeks
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto rounded-b-xl p-0 !px-0 !pb-0">
        <div className="min-w-[28rem]">
          <div
            className="grid gap-0 border-t bg-muted/50 backdrop-blur-md"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="sticky left-0 z-10 border-r border-b bg-muted/70 p-1.5 text-xs font-medium backdrop-blur-md sm:p-2 sm:text-sm">
              Day
            </div>
            {MEAL_TYPES.map(({ key, label }) => {
              const collapsed = collapsedColumns[key];
              return (
                <div
                  key={key}
                  className={`flex min-w-0 items-center border-r border-b bg-muted/70 backdrop-blur-md last:border-r-0 ${collapsed ? "justify-center" : ""}`}
                >
                  {collapsed ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleColumn(key)}
                      title={`Show ${label}`}
                      aria-label={`Expand ${label} column`}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  ) : (
                    <div className="flex w-full items-center justify-between gap-1 p-1.5 sm:p-2">
                      <span className="truncate text-xs font-medium sm:text-sm">
                        {label}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => toggleColumn(key)}
                        title={`Hide ${label}`}
                        aria-label={`Collapse ${label} column`}
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {days.map((d) => {
            const dateKey = toDateKey(d);
            const dayPlan = plan[dateKey] ?? {};
            return (
              <div
                key={dateKey}
                className="grid gap-0 border-b last:border-b-0"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="sticky left-0 z-10 shrink-0 border-r bg-card/90 p-1.5 text-xs font-medium backdrop-blur-md sm:p-2 sm:text-sm">
                  {formatDay(d)}
                </div>
                {MEAL_TYPES.map(({ key, label }) => {
                  const collapsed = collapsedColumns[key];
                  if (collapsed) {
                    return (
                      <div
                        key={key}
                        className="flex min-w-0 items-center justify-center border-r bg-card/90 last:border-r-0"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => toggleColumn(key)}
                          title={`Show ${label}`}
                          aria-label={`Expand ${label} column`}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    );
                  }
                  const mealEntry = dayPlan[key] ?? {};
                  return (
                    <div
                      key={key}
                      className="flex min-w-24 flex-col gap-1.5 border-r p-1.5 last:border-r-0 sm:gap-2 sm:p-2"
                    >
                      {TARGETS.map(({ key: targetKey, label: targetLabel }) => {
                        const ids = mealEntry[targetKey] ?? [];
                        const isSaving =
                          saving === `${dateKey}-${key}-${targetKey}`;
                        return (
                          <div
                            key={targetKey}
                            className="flex min-w-0 flex-col"
                          >
                            <div className="mb-0.5 flex items-center justify-between gap-1">
                              <span className="font-semibold text-muted-foreground sm:text-xs">
                                {targetLabel}
                              </span>
                              <Select
                                key={`${dateKey}-${key}-${targetKey}-${ids.length}`}
                                value="__add__"
                                onValueChange={(v) => {
                                  if (v && v !== "__add__") {
                                    addRecipeToSlot(dateKey, key, targetKey, v);
                                  }
                                }}
                                disabled={isSaving || recipes.length === 0}
                              >
                                <SelectTrigger
                                  size="sm"
                                  className="h-6 w-6 shrink-0 justify-center gap-0 border-0 p-0 shadow-none [&>*:last-child]:w-0 [&>*:last-child]:min-w-0 [&>*:last-child]:overflow-hidden [&>svg]:size-3.5 [&>svg:last-of-type]:hidden"
                                  aria-label={`Add recipe to ${targetLabel}`}
                                >
                                  <Plus />
                                  <SelectValue
                                    className="sr-only"
                                    placeholder=""
                                  />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                >
                                  <SelectItem
                                    value="__add__"
                                    className="hidden"
                                  >
                                    {"\u200b"}
                                  </SelectItem>
                                  {sortedRecipes.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {[...ids]
                                .sort((a, b) =>
                                  (recipeById[a]?.name ?? "").localeCompare(
                                    recipeById[b]?.name ?? "",
                                  ),
                                )
                                .map((id) => {
                                  const r = recipeById[id];
                                  return (
                                    <RemovablePill
                                      key={id}
                                      label={r?.name ?? id}
                                      onRemove={() =>
                                        removeRecipeFromSlot(
                                          dateKey,
                                          key,
                                          targetKey,
                                          id,
                                        )
                                      }
                                      onLabelClick={
                                        onOpenRecipe
                                          ? () => onOpenRecipe(id)
                                          : undefined
                                      }
                                      disabled={isSaving}
                                      removeTitle="Remove recipe"
                                      className="max-w-full"
                                    />
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
