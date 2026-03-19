import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/Button";
import { useTheme, type ThemePreference } from "@/contexts/ThemeContext";

const THEME_ORDER: ThemePreference[] = ["system", "light", "dark"];

function getNextTheme(theme: ThemePreference): ThemePreference {
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}

function getThemeIcon(theme: ThemePreference) {
  if (theme === "light") return <Sun className="size-4" />;
  if (theme === "dark") return <Moon className="size-4" />;
  return <Monitor className="size-4" />;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-2"
      onClick={() => setTheme(getNextTheme(theme))}
      aria-label={`Theme: ${theme} (click to cycle)`}
      title={`Theme: ${theme}`}
    >
      {getThemeIcon(theme)}
    </Button>
  );
}
