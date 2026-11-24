"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChartPieSlice,
  MagnifyingGlass,
  ShuffleAngular,
  ChartLineUp,
  Users,
} from "@phosphor-icons/react";

export function QualityViewSwitcher() {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/reports/test-coverage",
      label: "Coverage Overview",
      icon: ChartPieSlice,
      match: (p: string) => p === "/reports/test-coverage" || p === "/reports" || p === "/reports/quality",
    },
    {
      href: "/reports/test-gap",
      label: "Test Gap Analysis",
      icon: MagnifyingGlass,
      match: (p: string) => p === "/reports/test-gap",
    },
    {
      href: "/reports/flaky-tests",
      label: "Flaky Tests",
      icon: ShuffleAngular,
      match: (p: string) => p === "/reports/flaky-tests",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 w-fit mb-5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              isActive
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <Icon size={14} weight={isActive ? "bold" : "regular"} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function DeliveryViewSwitcher() {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/reports/sprint-burndown",
      label: "Sprint Burndown",
      icon: ChartLineUp,
      match: (p: string) => p === "/reports/sprint-burndown" || p === "/reports/delivery",
    },
    {
      href: "/reports/workload",
      label: "Workload Heatmap",
      icon: Users,
      match: (p: string) => p === "/reports/workload",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 w-fit mb-5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              isActive
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <Icon size={14} weight={isActive ? "bold" : "regular"} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
