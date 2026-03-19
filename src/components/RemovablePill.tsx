import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

interface RemovablePillProps {
  label: string;
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
        "w-full justify-between gap-1 px-2.5 py-1.5 text-xs font-normal",
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
          "truncate",
          fullWidth ? "min-w-0 flex-1" : "max-w-24 sm:max-w-32",
        )}
      >
        {label}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 shrink-0 cursor-pointer touch-manipulation rounded-full p-0 text-base leading-none text-muted-foreground hover:bg-muted hover:text-destructive sm:h-5 sm:w-5 sm:text-sm"
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
