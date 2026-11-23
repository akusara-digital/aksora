"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Buildings,
  ChartBar,
  Globe,
  Key,
  Lifebuoy,
  Lightning,
  ListChecks,
  Moon,
  PlugsConnected,
  Robot,
  ShieldCheck,
  SidebarSimple,
  UserCircle,
  Users,
  UsersThree,
  WebhooksLogo,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SettingsIconKey, SettingsNavGroup } from "@/lib/settings-nav";

const ICONS: Record<
  SettingsIconKey,
  React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>
> = {
  "user-circle": UserCircle,
  moon: Moon,
  bell: Bell,
  key: Key,
  lifebuoy: Lifebuoy,
  "list-checks": ListChecks,
  globe: Globe,
  lightning: Lightning,
  buildings: Buildings,
  "users-three": UsersThree,
  "shield-check": ShieldCheck,
  users: Users,
  robot: Robot,
  "chart-bar": ChartBar,
  "plugs-connected": PlugsConnected,
  webhooks: WebhooksLogo,
};

function appendWs(href: string, ws: string | null): string {
  if (!ws) return href;
  return href.includes("?")
    ? `${href}&ws=${encodeURIComponent(ws)}`
    : `${href}?ws=${encodeURIComponent(ws)}`;
}

export function SettingsNav({ groups }: { groups: SettingsNavGroup[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ws = searchParams?.get("ws") ?? null;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aksora-settings-nav-collapsed");
      if (saved !== null) {
        setCollapsed(saved === "1");
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("aksora-settings-nav-collapsed", next ? "1" : "0");
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Keep /settings directory wide and uncluttered (avoid repeating all links beside itself)
  if (pathname === "/settings") {
    return null;
  }

  const allItems = groups.flatMap((g) => g.items);

  return (
    <>
      {/* Mobile / Tablet compact scrollable bar */}
      <nav
        aria-label="Settings navigation"
        className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:hidden"
      >
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 scrollbar-none">
          <Link
            href={appendWs("/settings", ws)}
            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>All</span>
          </Link>
          <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200" aria-hidden="true" />
          {allItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={appendWs(item.href, ws)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  active
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon
                  size={14}
                  weight="bold"
                  className={cn("shrink-0", active ? "text-blue-600" : "text-slate-400")}
                />
                <span>{item.shortTitle}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sticky left rail */}
      <aside
        aria-label="Settings navigation"
        className={cn(
          "hidden shrink-0 transition-[width] duration-150 lg:block",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className="sticky top-6 space-y-4 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2">
            {!collapsed ? (
              <Link
                href={appendWs("/settings", ws)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 truncate"
              >
                <ArrowLeft size={14} weight="bold" className="shrink-0" />
                <span className="truncate">All Settings</span>
              </Link>
            ) : (
              <Link
                href={appendWs("/settings", ws)}
                title="All Settings"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft size={14} weight="bold" />
              </Link>
            )}

            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand settings menu" : "Collapse settings menu"}
              aria-label={collapsed ? "Expand settings menu" : "Collapse settings menu"}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <SidebarSimple size={15} weight="bold" />
            </button>
          </div>

          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id}>
                {!collapsed && (
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {group.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = ICONS[item.icon];
                    return (
                      <Link
                        key={item.href}
                        href={appendWs(item.href, ws)}
                        title={collapsed ? item.shortTitle : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex cursor-pointer items-center rounded-md text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                          collapsed
                            ? "h-9 w-9 mx-auto justify-center px-0"
                            : "gap-2.5 px-2.5 py-1.5",
                          active
                            ? "bg-blue-50 font-semibold text-blue-700"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <Icon
                          size={15}
                          weight="bold"
                          className={cn(
                            "shrink-0 transition-colors",
                            active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.shortTitle}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
