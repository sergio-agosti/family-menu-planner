import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RemovablePill } from "@/components/RemovablePill";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/Button";
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
import { RecipeDifficultyDot } from "@/components/RecipeDifficultyDot";
import {
  addRecipe,
  getData,
  getPlanForDateRange,
  setSlotRecipes,
  toLocalDateKey,
  type DayPlan,
  type MealType,
  type Recipe,
  type RecipeDifficulty,
  type TargetType,
} from "@/lib/data";

const MEAL_COLUMNS_STORAGE_KEY = "family-menu-planner:meal-columns-collapsed";
const PLAN_FIRST_DAY_STORAGE_KEY = "family-menu-planner:plan-first-day";

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return startOfDay(parsed);
}

function loadFirstDay(): Date {
  try {
    const raw = localStorage.getItem(PLAN_FIRST_DAY_STORAGE_KEY);
    if (!raw) return startOfDay(new Date());
    return parseDateKey(raw) ?? startOfDay(new Date());
  } catch {
    return startOfDay(new Date());
  }
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isCalendarToday(d: Date): boolean {
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function slotKey(
  dateKey: string,
  mealType: MealType,
  target: TargetType,
): string {
  return `${dateKey}-${mealType}-${target}`;
}

function planSlotDropId(
  dateKey: string,
  mealType: MealType,
  target: TargetType,
): string {
  return `plan-slot|${dateKey}|${mealType}|${target}`;
}

function isMealType(m: string): m is MealType {
  return m === "breakfast" || m === "lunch" || m === "dinner";
}

function isTargetType(t: string): t is TargetType {
  return t === "adults" || t === "kids";
}

function parsePlanSlotDropId(id: string | number): PlanSlotRef | null {
  const s = String(id);
  if (!s.startsWith("plan-slot|")) return null;
  const parts = s.split("|");
  if (parts.length !== 4) return null;
  const [, dateKey, meal, target] = parts;
  if (!isMealType(meal) || !isTargetType(target)) return null;
  return { dateKey, mealType: meal, target };
}

function isPlanSlotDroppableId(id: UniqueIdentifier): boolean {
  return String(id).startsWith("plan-slot|");
}

/** Only meal/target slots count as drop targets (never draggable pill ids). */
const planSlotCollisionDetection: CollisionDetection = (args) => {
  const slotOnly = (collisions: ReturnType<typeof pointerWithin>) =>
    collisions.filter((c) => isPlanSlotDroppableId(c.id));

  const within = slotOnly(pointerWithin(args));
  if (within.length > 0) return within;

  return slotOnly(rectIntersection(args));
};

interface PlanSlotRef {
  dateKey: string;
  mealType: MealType;
  target: TargetType;
}

interface PlanRecipeDragData {
  type: "plan-recipe";
  recipeId: string;
  from: PlanSlotRef;
  label: string;
  difficulty: RecipeDifficulty;
}

function patchPlanRemove(
  plan: Record<string, DayPlan>,
  dateKey: string,
  meal: MealType,
  target: TargetType,
  recipeId: string,
): Record<string, DayPlan> {
  const day = plan[dateKey];
  if (!day) return plan;
  const mealEntry = day[meal];
  if (!mealEntry) return plan;
  const list = mealEntry[target] ?? [];
  if (!list.includes(recipeId)) return plan;
  const nextList = list.filter((id) => id !== recipeId);
  const nextMeal: Partial<Record<TargetType, string[]>> = { ...mealEntry };
  if (nextList.length) nextMeal[target] = nextList;
  else delete nextMeal[target];
  const nextDay: DayPlan = { ...day };
  if (Object.keys(nextMeal).length) nextDay[meal] = nextMeal;
  else delete nextDay[meal];
  const result = { ...plan };
  if (!nextDay.breakfast && !nextDay.lunch && !nextDay.dinner)
    delete result[dateKey];
  else result[dateKey] = nextDay;
  return result;
}

function patchPlanAdd(
  plan: Record<string, DayPlan>,
  dateKey: string,
  meal: MealType,
  target: TargetType,
  recipeId: string,
): Record<string, DayPlan> {
  const day = plan[dateKey] ?? {};
  const mealEntry = { ...(day[meal] ?? {}) };
  const list = mealEntry[target] ?? [];
  if (list.includes(recipeId)) return plan;
  const nextMeal = { ...mealEntry, [target]: [...list, recipeId] };
  return {
    ...plan,
    [dateKey]: { ...day, [meal]: nextMeal },
  };
}

function patchPlanMoveRecipe(
  plan: Record<string, DayPlan>,
  from: PlanSlotRef,
  to: PlanSlotRef,
  recipeId: string,
): Record<string, DayPlan> {
  return patchPlanAdd(
    patchPlanRemove(plan, from.dateKey, from.mealType, from.target, recipeId),
    to.dateKey,
    to.mealType,
    to.target,
    recipeId,
  );
}

function PlanSlotDropZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "plan-slot" as const },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        "rounded-md transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary/25 ring-inset",
      )}
    >
      {children}
    </div>
  );
}

function DraggablePlanRecipe({
  recipeId,
  from,
  label,
  difficulty,
  disabled,
  onRemove,
  onLabelClick,
}: {
  recipeId: string;
  from: PlanSlotRef;
  label: string;
  difficulty: RecipeDifficulty;
  disabled: boolean;
  onRemove: () => void;
  onLabelClick?: () => void;
}) {
  const dragId = `plan-pill|${from.dateKey}|${from.mealType}|${from.target}|${recipeId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled,
    attributes: { role: "group", tabIndex: -1 },
    data: {
      type: "plan-recipe",
      recipeId,
      from,
      label,
      difficulty,
    } satisfies PlanRecipeDragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "w-full min-w-0 touch-manipulation",
        isDragging && "opacity-40",
        !disabled && "cursor-grab active:cursor-grabbing",
        disabled && "pointer-events-none opacity-50",
      )}
      title={disabled ? undefined : "Drag to move recipe"}
    >
      <RemovablePill
        label={label}
        difficulty={difficulty}
        onRemove={onRemove}
        onLabelClick={onLabelClick}
        disabled={disabled}
        removeTitle="Remove recipe"
        fullWidth
        className="w-full min-w-0"
      />
    </div>
  );
}

function AddRecipeSlotPicker({
  recipes,
  disabled,
  ariaLabel,
  onPick,
  onCreateNewRecipe,
}: {
  recipes: Recipe[];
  disabled: boolean;
  ariaLabel: string;
  onPick: (recipeId: string) => void;
  onCreateNewRecipe: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await onCreateNewRecipe(name);
      setOpen(false);
      setSearch("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={ariaLabel}
          disabled={disabled}
        >
          <Plus className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-100 w-72 p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command
          filter={(value, searchText, keywords) => {
            const s = (searchText ?? "").trim().toLowerCase();
            if (!s) return 1;
            const text = [value, ...(keywords ?? [])]
              .join(" ")
              .toLowerCase();
            return text.includes(s) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder="Search recipes…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No recipe found.</CommandEmpty>
            {recipes.map((r) => (
              <CommandItem
                key={r.id}
                value={r.id}
                keywords={[r.name]}
                onSelect={() => {
                  onPick(r.id);
                  setOpen(false);
                }}
              >
                {r.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {search.trim() && (
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 font-normal"
              disabled={creating || disabled}
              onClick={() => void handleCreate()}
            >
              <Plus className="size-4 shrink-0" />
              Add as new recipe
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface WeeklyPlanProps {
  refreshTrigger: number;
  onOpenRecipe?: (recipeId: string) => void;
  /** Bump global data (e.g. recipe list) after creating a recipe from the plan picker. */
  onRecipeAdded?: () => void;
}

export function WeeklyPlan({
  refreshTrigger,
  onOpenRecipe,
  onRecipeAdded,
}: WeeklyPlanProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<Record<string, DayPlan>>({});
  const [weekStart, setWeekStart] = useState<Date>(loadFirstDay);
  const [loading, setLoading] = useState(true);
  const [savingSlots, setSavingSlots] = useState<string[]>([]);
  const [collapsedColumns, setCollapsedColumns] =
    useState<Record<MealType, boolean>>(loadCollapsedColumns);
  const [dragOverlay, setDragOverlay] = useState<{
    label: string;
    difficulty: RecipeDifficulty;
  } | null>(null);

  const planRef = useRef(plan);
  planRef.current = plan;

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
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [weekStart]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_FIRST_DAY_STORAGE_KEY, toLocalDateKey(weekStart));
    } catch {
      /* ignore */
    }
  }, [weekStart]);

  const refetchPlanRange = useCallback(async () => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const planData = await getPlanForDateRange(start, end);
    setPlan(planData);
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
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

  const isSlotSaving = useCallback(
    (dateKey: string, mealType: MealType, target: TargetType) =>
      savingSlots.includes(slotKey(dateKey, mealType, target)),
    [savingSlots],
  );

  const addRecipeToSlot = async (
    dateKey: string,
    mealType: MealType,
    target: TargetType,
    recipeId: string,
  ) => {
    const current = planRef.current[dateKey]?.[mealType]?.[target] ?? [];
    if (current.includes(recipeId)) return;
    const k = slotKey(dateKey, mealType, target);
    setSavingSlots([k]);
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
      setSavingSlots([]);
    }
  };

  const removeRecipeFromSlot = async (
    dateKey: string,
    mealType: MealType,
    target: TargetType,
    recipeId: string,
  ) => {
    const current = planRef.current[dateKey]?.[mealType]?.[target] ?? [];
    const next = current.filter((id) => id !== recipeId);
    const k = slotKey(dateKey, mealType, target);
    setSavingSlots([k]);
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
      setSavingSlots([]);
    }
  };

  const moveRecipeBetweenSlots = useCallback(
    async (from: PlanSlotRef, to: PlanSlotRef, recipeId: string) => {
      if (
        from.dateKey === to.dateKey &&
        from.mealType === to.mealType &&
        from.target === to.target
      ) {
        return;
      }

      const prev = planRef.current;
      const sourceIds =
        prev[from.dateKey]?.[from.mealType]?.[from.target] ?? [];
      if (!sourceIds.includes(recipeId)) return;

      const destIds = prev[to.dateKey]?.[to.mealType]?.[to.target] ?? [];
      const srcK = slotKey(from.dateKey, from.mealType, from.target);
      const destK = slotKey(to.dateKey, to.mealType, to.target);

      setSavingSlots([srcK, destK]);
      try {
        if (destIds.includes(recipeId)) {
          const nextSource = sourceIds.filter((id) => id !== recipeId);
          await setSlotRecipes(
            from.dateKey,
            from.mealType,
            from.target,
            nextSource,
          );
          setPlan((p) =>
            patchPlanRemove(
              p,
              from.dateKey,
              from.mealType,
              from.target,
              recipeId,
            ),
          );
          return;
        }

        await setSlotRecipes(to.dateKey, to.mealType, to.target, [
          ...destIds,
          recipeId,
        ]);
        await setSlotRecipes(
          from.dateKey,
          from.mealType,
          from.target,
          sourceIds.filter((id) => id !== recipeId),
        );
        setPlan((p) => patchPlanMoveRecipe(p, from, to, recipeId));
      } catch {
        await refetchPlanRange();
      } finally {
        setSavingSlots([]);
      }
    },
    [refetchPlanRange],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as PlanRecipeDragData | undefined;
    if (data?.type === "plan-recipe")
      setDragOverlay({ label: data.label, difficulty: data.difficulty });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragOverlay(null);
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as PlanRecipeDragData | undefined;
    if (!data || data.type !== "plan-recipe") return;
    const dest = parsePlanSlotDropId(over.id);
    if (!dest) return;
    void moveRecipeBetweenSlots(data.from, dest, data.recipeId);
  };

  const handleDragCancel = () => {
    setDragOverlay(null);
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
    d.setDate(d.getDate() - 1);
    setWeekStart(d);
  };

  const goToday = () => {
    setWeekStart(startOfDay(new Date()));
  };

  const goNext = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 1);
    setWeekStart(d);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex px-3 sm:px-6 sm:justify-end">
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-8 w-36 sm:w-40" />
            <Skeleton className="h-8 w-32 sm:w-36" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-b-xl p-0 px-0! pb-0!">
          <div className="min-w-md border-t">
            <div
              className="grid gap-0 border-b bg-muted/50"
              style={{
                gridTemplateColumns: "7rem repeat(3, minmax(6rem, 1fr))",
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 rounded-none border-r border-b border-border/80 last:border-r-0"
                />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, row) => (
              <div
                key={row}
                className="grid gap-0 border-b bg-background last:border-b-0"
                style={{
                  gridTemplateColumns: "7rem repeat(3, minmax(6rem, 1fr))",
                }}
              >
                {Array.from({ length: 4 }).map((_, col) => (
                  <Skeleton
                    key={col}
                    className="min-h-14 rounded-none border-r border-border/40 last:border-r-0"
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex px-3 sm:px-6 sm:justify-end">
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goPrev}
            className="text-xs sm:text-sm"
          >
            Previous day
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goToday}
            className="text-xs sm:text-sm"
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goNext}
            className="text-xs sm:text-sm"
          >
            Next day
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto rounded-b-xl p-0 px-0! pb-0!">
        <DndContext
          sensors={sensors}
          collisionDetection={planSlotCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="min-w-md">
            <div
              className="grid gap-0 border-t bg-muted/50 backdrop-blur-md"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="sticky left-0 z-10 border-r border-b border-l-2 border-l-transparent bg-muted/70 p-1.5 text-xs font-medium backdrop-blur-md sm:p-2 sm:text-sm">
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
              const dateKey = toLocalDateKey(d);
              const dayPlan = plan[dateKey] ?? {};
              const isToday = isCalendarToday(d);
              return (
                <div
                  key={dateKey}
                  className="grid gap-0 border-b last:border-b-0"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div
                    className={cn(
                      "sticky left-0 z-10 shrink-0 border-r border-l-2 p-1.5 text-xs font-medium backdrop-blur-md sm:p-2 sm:text-sm",
                      isToday
                        ? "border-l-transparent bg-primary/15 font-semibold text-foreground"
                        : "border-l-transparent bg-card/90",
                    )}
                    aria-current={isToday ? "date" : undefined}
                  >
                    {formatDay(d)}
                  </div>
                  {MEAL_TYPES.map(({ key, label }) => {
                    const collapsed = collapsedColumns[key];
                    if (collapsed) {
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex min-w-0 items-center justify-center border-r last:border-r-0",
                            isToday ? "bg-primary/10" : "bg-card/90",
                          )}
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
                        className={cn(
                          "flex min-w-24 flex-col gap-1.5 border-r p-1.5 last:border-r-0 sm:gap-2 sm:p-2",
                          isToday && "bg-primary/10",
                        )}
                      >
                        {TARGETS.map(
                          ({ key: targetKey, label: targetLabel }) => {
                            const ids = mealEntry[targetKey] ?? [];
                            const isSaving = isSlotSaving(
                              dateKey,
                              key,
                              targetKey,
                            );
                            const dropId = planSlotDropId(
                              dateKey,
                              key,
                              targetKey,
                            );
                            return (
                              <PlanSlotDropZone
                                key={targetKey}
                                id={dropId}
                                className="flex min-h-20 min-w-0 flex-col gap-1.5"
                              >
                                <div className="flex shrink-0 items-center justify-between gap-1">
                                  <span className="font-semibold text-muted-foreground sm:text-xs">
                                    {targetLabel}
                                  </span>
                                  <AddRecipeSlotPicker
                                    recipes={sortedRecipes}
                                    disabled={isSaving}
                                    ariaLabel={`Add recipe to ${targetLabel}`}
                                    onPick={(recipeId) =>
                                      void addRecipeToSlot(
                                        dateKey,
                                        key,
                                        targetKey,
                                        recipeId,
                                      )
                                    }
                                    onCreateNewRecipe={async (name) => {
                                      const recipe = await addRecipe(
                                        name.trim(),
                                      );
                                      setRecipes((prev) =>
                                        [
                                          ...prev.filter(
                                            (r) => r.id !== recipe.id,
                                          ),
                                          recipe,
                                        ].sort((a, b) =>
                                          a.name.localeCompare(b.name),
                                        ),
                                      );
                                      await addRecipeToSlot(
                                        dateKey,
                                        key,
                                        targetKey,
                                        recipe.id,
                                      );
                                      onOpenRecipe?.(recipe.id);
                                      onRecipeAdded?.();
                                    }}
                                  />
                                </div>
                                <div className="flex w-full min-w-0 flex-col gap-1">
                                  {[...ids]
                                    .sort((a, b) =>
                                      (recipeById[a]?.name ?? "").localeCompare(
                                        recipeById[b]?.name ?? "",
                                      ),
                                    )
                                    .map((id) => {
                                      const r = recipeById[id];
                                      const from: PlanSlotRef = {
                                        dateKey,
                                        mealType: key,
                                        target: targetKey,
                                      };
                                      return (
                                        <DraggablePlanRecipe
                                          key={id}
                                          recipeId={id}
                                          from={from}
                                          label={r?.name ?? id}
                                          difficulty={
                                            r?.difficulty ?? "easy"
                                          }
                                          disabled={isSaving}
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
                                        />
                                      );
                                    })}
                                </div>
                              </PlanSlotDropZone>
                            );
                          },
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {dragOverlay ? (
              <Badge
                variant="secondary"
                className="max-w-48 cursor-grabbing gap-1 px-2.5 py-1.5 text-xs font-normal shadow-md"
              >
                <RecipeDifficultyDot difficulty={dragOverlay.difficulty} />
                <span className="min-w-0 flex-1 truncate">
                  {dragOverlay.label}
                </span>
              </Badge>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
