"use client";

import { Monitor, Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/hooks/use-theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme switcher"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-0.5 text-[11px] font-semibold backdrop-blur-xs shadow-2xs",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center justify-center rounded-md transition-all",
            compact ? "h-7 w-7 p-0" : "gap-1 px-2 py-1",
            theme === value
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-2xs font-bold"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60",
          )}
        >
          <Icon size={14} weight="bold" />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
