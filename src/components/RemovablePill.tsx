import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RemovablePillProps {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  removeTitle?: string;
  /** When true, label expands to fill (e.g. in a grid column). When false, label has max-width. */
  fullWidth?: boolean;
  className?: string;
}

export function RemovablePill({
  label,
  onRemove,
  disabled = false,
  removeTitle = "Remove",
  fullWidth = false,
  className,
}: RemovablePillProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "w-full justify-between gap-1 px-2.5 py-1.5 text-xs font-normal",
        className,
      )}
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
        className="h-5 w-5 shrink-0 cursor-pointer touch-manipulation rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-destructive sm:h-4 sm:w-4"
        onClick={onRemove}
        disabled={disabled}
        title={removeTitle}
      >
        ×
      </Button>
    </Badge>
  );
}
