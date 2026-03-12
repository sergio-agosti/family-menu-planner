import { useState, useEffect, useMemo } from "react";
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
} from "@/lib/data";

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
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
    recipeId: string,
  ) => {
    const current = plan[dateKey]?.[mealType] ?? [];
    if (current.includes(recipeId)) return;
    setSaving(`${dateKey}-${mealType}`);
    try {
      await setSlotRecipes(dateKey, mealType, [...current, recipeId]);
      setPlan((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [mealType]: [...(prev[dateKey]?.[mealType] ?? []), recipeId],
        },
      }));
    } finally {
      setSaving(null);
    }
  };

  const removeRecipeFromSlot = async (
    dateKey: string,
    mealType: MealType,
    recipeId: string,
  ) => {
    const current = plan[dateKey]?.[mealType] ?? [];
    const next = current.filter((id) => id !== recipeId);
    setSaving(`${dateKey}-${mealType}`);
    try {
      await setSlotRecipes(dateKey, mealType, next);
      setPlan((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [mealType]: next.length ? next : undefined,
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
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[8rem_1fr_1fr_1fr] gap-0 bg-muted/50">
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
                {MEAL_TYPES.map(({ key, label }) => {
                  const ids = dayPlan[key] ?? [];
                  const isSaving = saving === `${dateKey}-${key}`;
                  return (
                    <div
                      key={key}
                      className="p-2 border-r last:border-r-0 flex flex-col min-w-0"
                    >
                      <ul className="text-sm space-y-0.5 mb-1">
                        {ids.map((id) => {
                          const r = recipeById[id];
                          return (
                            <li
                              key={id}
                              className="flex items-center justify-between gap-1"
                            >
                              <span className="truncate">{r?.name ?? id}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() =>
                                  removeRecipeFromSlot(dateKey, key, id)
                                }
                                disabled={isSaving}
                              >
                                ×
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                      <Select
                        key={`${dateKey}-${key}-${(dayPlan[key] ?? []).length}`}
                        value="__add__"
                        onValueChange={(v) => {
                          if (v && v !== "__add__")
                            addRecipeToSlot(dateKey, key, v);
                        }}
                        disabled={isSaving || recipes.length === 0}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="+ Add" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__add__">+ Add recipe</SelectItem>
                          {recipes.map((r) => (
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
      </CardContent>
    </Card>
  );
}
