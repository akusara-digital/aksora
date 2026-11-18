import Link from "next/link";
import { Briefcase, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type DashboardViewToggleProps = {
  activeView: "overview" | "my-work";
  ws?: string | null;
};

export function DashboardViewToggle({ activeView, ws }: DashboardViewToggleProps) {
  const qs = ws ? `?ws=${encodeURIComponent(ws)}` : "";

  return (
    <nav
      aria-label="Dashboard view"
      className="inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-50 p-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
    >
      <Link
        href={`/dashboard${qs}`}
        aria-current={activeView === "overview" ? "page" : undefined}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
          activeView === "overview"
            ? "bg-white font-bold text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
        )}
      >
        <SquaresFour size={14} weight="bold" />
        <span>Team Overview</span>
      </Link>
      <Link
        href={`/my-work${qs}`}
        aria-current={activeView === "my-work" ? "page" : undefined}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
          activeView === "my-work"
            ? "bg-white font-bold text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
        )}
      >
        <Briefcase size={14} weight="bold" />
        <span>My Work</span>
      </Link>
    </nav>
  );
}
