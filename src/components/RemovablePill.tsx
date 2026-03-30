import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/Button";
import { RecipeDifficultyDot } from "@/components/RecipeDifficultyDot";
import { cn } from "@/lib/utils";
import type { RecipeDifficulty } from "@/lib/data";

interface RemovablePillProps {
  label: string;
  /** When set (e.g. recipe pills), shows a semaphore dot before the label. */
  difficulty?: RecipeDifficulty;
  onRemove: () => void;
  /** Optional click on the label (e.g. open recipe). Remove button still calls onRemove. */
  onLabelClick?: () => void;
  disabled?: boolean;
  removeTitle?: string;
  /** When true, label expands to fill (e.g. in a grid column). When false, label has max-width. */
  fullWidth?: boolean;
  className?: string;
}

export function RemovablePill({
  label,
  difficulty,
  onRemove,
  onLabelClick,
  disabled = false,
  removeTitle = "Remove",
  fullWidth = false,
  className,
}: RemovablePillProps) {
  return (
    <Badge
      variant="secondary"
      role={onLabelClick ? "button" : undefined}
      tabIndex={onLabelClick ? 0 : undefined}
      className={cn(
        "w-full justify-between gap-0.5 pl-2 pr-1 py-1 text-xs font-normal",
        onLabelClick && "cursor-pointer",
        className,
      )}
      onClick={onLabelClick}
      onKeyDown={
        onLabelClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onLabelClick();
              }
            }
          : undefined
      }
    >
      <span
        className={cn(
          "flex min-w-0 items-center gap-1",
          fullWidth ? "min-w-0 flex-1" : "max-w-24 sm:max-w-32",
        )}
      >
        {difficulty !== undefined ? (
          <RecipeDifficultyDot difficulty={difficulty} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 cursor-pointer touch-manipulation gap-0 rounded-full p-0 text-xl leading-none text-muted-foreground hover:bg-muted hover:text-destructive"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        title={removeTitle}
      >
        ×
      </Button>
    </Badge>
  );
}
