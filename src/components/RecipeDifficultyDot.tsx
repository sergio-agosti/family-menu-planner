import { cn } from "@/lib/utils";
import {
  recipeDifficultyLabel,
  type RecipeDifficulty,
} from "@/lib/data";

const DOT_CLASS: Record<RecipeDifficulty, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  difficult: "bg-red-500",
};

const LEVELS: RecipeDifficulty[] = ["easy", "medium", "difficult"];

/** Three semaphore dot buttons in a row (no text label). */
export function RecipeDifficultyPicker({
  value,
  onChange,
  disabled,
}: {
  value: RecipeDifficulty;
  onChange: (d: RecipeDifficulty) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Recipe difficulty"
      className="flex shrink-0 items-center gap-1.5"
    >
      {LEVELS.map((d) => {
        const selected = value === d;
        const label = recipeDifficultyLabel(d);
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            disabled={disabled}
            title={label}
            onClick={() => onChange(d)}
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full outline-none transition",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              selected && "ring-1 ring-ring/70 ring-offset-0",
            )}
          >
            <span
              className={cn("size-2.5 rounded-full", DOT_CLASS[d])}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

export function RecipeDifficultyDot({
  difficulty,
  className,
}: {
  difficulty: RecipeDifficulty;
  className?: string;
}) {
  const label = recipeDifficultyLabel(difficulty);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      title={label}
    >
      <span
        className={cn("size-1.5 rounded-full", DOT_CLASS[difficulty])}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
