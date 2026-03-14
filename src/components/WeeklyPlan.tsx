import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

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
}

export function WeeklyPlan({ refreshTrigger }: WeeklyPlanProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<Record<string, DayPlan>>({});
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>2-week plan</CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goPrev}>
            Previous 2 weeks
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goNext}>
            Next 2 weeks
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div className="grid grid-cols-[8rem_1fr_1fr_1fr] gap-0 border-t bg-muted/50">
          <div className="p-2 text-sm font-medium border-b border-r">Day</div>
          {MEAL_TYPES.map(({ label }) => (
            <div
              key={label}
              className="p-2 text-sm font-medium border-b border-r last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const dateKey = toDateKey(d);
          const dayPlan = plan[dateKey] ?? {};
          return (
            <div
              key={dateKey}
              className="grid grid-cols-[8rem_1fr_1fr_1fr] gap-0 border-b last:border-b-0"
            >
              <div className="p-2 border-r text-sm font-medium">
                {formatDay(d)}
              </div>
              {MEAL_TYPES.map(({ key }) => {
                const mealEntry = dayPlan[key] ?? {};
                return (
                  <div
                    key={key}
                    className="p-2 border-r last:border-r-0 flex flex-col gap-2 min-w-0"
                  >
                    {TARGETS.map(({ key: targetKey, label: targetLabel }) => {
                      const ids = mealEntry[targetKey] ?? [];
                      const isSaving =
                        saving === `${dateKey}-${key}-${targetKey}`;
                      return (
                        <div key={targetKey} className="flex flex-col min-w-0">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {targetLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {[...ids]
                              .sort((a, b) =>
                                (recipeById[a]?.name ?? "").localeCompare(
                                  recipeById[b]?.name ?? "",
                                ),
                              )
                              .map((id) => {
                                const r = recipeById[id];
                                return (
                                  <Badge
                                    key={id}
                                    variant="secondary"
                                    className="pr-0.5 py-1 gap-1 font-normal"
                                  >
                                    <span className="truncate max-w-[8rem]">
                                      {r?.name ?? id}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 rounded-full cursor-pointer text-muted-foreground hover:text-destructive hover:bg-muted shrink-0"
                                      onClick={() =>
                                        removeRecipeFromSlot(
                                          dateKey,
                                          key,
                                          targetKey,
                                          id,
                                        )
                                      }
                                      disabled={isSaving}
                                    >
                                      ×
                                    </Button>
                                  </Badge>
                                );
                              })}
                          </div>
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
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="+ Add" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__add__">
                                + Add recipe
                              </SelectItem>
                              {sortedRecipes.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
