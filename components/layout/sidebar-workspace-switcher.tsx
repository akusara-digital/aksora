"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Buildings, CaretDown, CaretRight, Check, Gear, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { JoinOrCreateWorkspaceModal } from "@/components/layout/join-or-create-workspace-modal";

export type WorkspaceItem = {
  id: number;
  workspaceId: number;
  role: string;
  status: string;
  name: string;
  slug: string;
  uuid?: string;
  accentColor?: string;
};

const WS_PALETTES = [
  { bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-400" },
  { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-400" },
  { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-400" },
  { bg: "bg-sky-100 dark:bg-sky-950/60", text: "text-sky-700 dark:text-sky-400" },
  { bg: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-400" },
];

export function SidebarWorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [activeWorkspaceUuid, setActiveWorkspaceUuid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlWs = searchParams?.get("ws") || "";

  const handlePickerEnter = () => {
    if (pickerTimerRef.current) {
      clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }
    setPickerOpen(true);
  };

  const handlePickerLeave = () => {
    if (pickerTimerRef.current) {
      clearTimeout(pickerTimerRef.current);
    }
    pickerTimerRef.current = setTimeout(() => {
      setPickerOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current);
    };
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.user) {
        const memberships = (data.user.memberships || []) as WorkspaceItem[];
        setWorkspaces(memberships);
        setUserEmail(String(data.user.email || ""));
        setActiveWorkspaceId(data.user.activeWorkspaceId ?? null);
        setActiveWorkspaceUuid(data.user.workspaceUuid ?? null);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void fetchWorkspaces();

    const handler = () => {
      void fetchWorkspaces();
    };
    window.addEventListener("qa:profile-updated", handler);
    return () => window.removeEventListener("qa:profile-updated", handler);
  }, []);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setPickerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeWorkspace =
    workspaces.find((w) => (urlWs && w.uuid === urlWs) || (activeWorkspaceUuid && w.uuid === activeWorkspaceUuid)) ||
    workspaces.find((w) => activeWorkspaceId && Number(w.workspaceId) === Number(activeWorkspaceId)) ||
    workspaces[0] ||
    null;

  const activeName = activeWorkspace?.name || "Workspace";
  const activeInitial = activeName.charAt(0).toUpperCase();
  const activeRole = activeWorkspace?.role || "member";
  const settingsHref = activeWorkspace?.uuid
    ? `/settings/workspaces?ws=${encodeURIComponent(activeWorkspace.uuid)}`
    : "/settings/workspaces";

  const switchWorkspace = async (workspaceId: number, workspaceUuid?: string) => {
    if (pendingId) return;
    setPendingId(workspaceId);
    try {
      const res = await fetch("/api/auth/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workspaceUuid }),
      });
      if (!res.ok) throw new Error("Failed to switch workspace.");
      const data = (await res.json().catch(() => null)) as { workspaceUuid?: string } | null;
      const targetUuid = workspaceUuid || data?.workspaceUuid;

      setPickerOpen(false);
      setOpen(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("qa:profile-updated"));
      }

      const isDetailRoute = /^\/(test-cases|test-plans|test-suites|bugs|tasks|sprints|projects)\/[^/?#]+/.test(pathname);
      const basePath = isDetailRoute ? "/dashboard" : pathname;
      const targetUrl = targetUuid ? `${basePath}?ws=${encodeURIComponent(targetUuid)}` : basePath;

      router.push(targetUrl);
      router.refresh();
    } catch {
      toast("Failed to switch workspace.", "error");
    } finally {
      setPendingId(null);
    }
  };

  const renderWorkspaceListContent = () => (
    <>
      {/* User Email Header */}
      <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-slate-500 dark:text-zinc-400 truncate border-b border-slate-100 dark:border-zinc-800">
        {userEmail || activeName}
      </div>

      {/* Workspaces List */}
      <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
        {workspaces.map((ws, idx) => {
          const isSelected = activeWorkspace?.workspaceId === ws.workspaceId;
          const palette = WS_PALETTES[idx % WS_PALETTES.length];
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => void switchWorkspace(ws.workspaceId, ws.uuid)}
              disabled={pendingId === ws.workspaceId}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-left rounded-xl transition-colors cursor-pointer disabled:opacity-50",
                isSelected
                  ? "bg-blue-50/80 dark:bg-blue-950/40 text-[#2563EB] dark:text-[#3B82F6] font-semibold"
                  : "text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900",
              )}
              role="menuitem"
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 uppercase",
                  palette.bg,
                  palette.text,
                )}
              >
                {(ws.name || "W").charAt(0)}
              </span>
              <span className="truncate flex-1 font-medium">{ws.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 shrink-0 font-medium">
                FREE
              </span>
              {isSelected && (
                <Check size={14} weight="bold" className="text-[#2563EB] dark:text-[#3B82F6] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Join or create workspace */}
      <div className="p-1 border-t border-slate-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setPickerOpen(false);
            setOpen(false);
            setModalOpen(true);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl transition-colors text-left font-medium cursor-pointer"
          role="menuitem"
        >
          <Plus size={15} weight="bold" className="text-slate-400 shrink-0" />
          <span>Join or create workspace</span>
        </button>
      </div>
    </>
  );

  if (collapsed) {
    return (
      <div ref={containerRef} className="relative flex justify-center border-b border-slate-200 py-2.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          title={`${activeName} (Click to switch workspace)`}
          aria-label="Switch workspace"
          aria-expanded={open}
          aria-haspopup="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold text-xs uppercase shadow-xs transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
        >
          {activeInitial}
        </button>

        {open && (
          <div
            className="absolute left-[calc(100%+8px)] top-1.5 z-[60] w-72 rounded-2xl border border-slate-200/80 bg-white shadow-xl overflow-hidden dark:border-zinc-800 dark:bg-zinc-950"
            role="menu"
          >
            {renderWorkspaceListContent()}
            <div className="p-1 border-t border-slate-100 dark:border-zinc-800">
              <Link
                href={settingsHref}
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left dark:text-zinc-300 dark:hover:bg-zinc-900"
                role="menuitem"
              >
                <Gear size={15} weight="bold" className="text-slate-400 shrink-0" />
                <span>Workspace settings</span>
              </Link>
            </div>
          </div>
        )}

        <JoinOrCreateWorkspaceModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => void fetchWorkspaces()}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative border-b border-slate-200 px-3 py-2.5 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => {
            if (prev) setPickerOpen(false);
            return !prev;
          });
        }}
        aria-label="Switch workspace"
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30",
          open
            ? "bg-white border-slate-200 shadow-xs dark:bg-zinc-900 dark:border-zinc-700"
            : "hover:bg-white/80 border-transparent hover:border-slate-200/80 dark:hover:bg-zinc-900/60 dark:hover:border-zinc-800",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 shadow-xs">
            {activeInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
              {activeName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
              FREE · <span className="capitalize">{activeRole}</span>
            </p>
          </div>
        </div>
        <CaretDown
          size={14}
          weight="bold"
          className={cn(
            "text-slate-400 shrink-0 transition-transform duration-200",
            open && "rotate-180 text-slate-800 dark:text-white",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Workspace Popover Dropdown (BugSnap / Loom Style with Hover Flyout) */}
      {open && (
        <div
          className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-xl p-1.5 space-y-0.5"
          role="menu"
        >
          {/* Switch workspace item with hover flyout */}
          <div
            className="relative"
            onMouseEnter={handlePickerEnter}
            onMouseLeave={handlePickerLeave}
          >
            <button
              type="button"
              onClick={() => {
                if (pickerTimerRef.current) {
                  clearTimeout(pickerTimerRef.current);
                  pickerTimerRef.current = null;
                }
                setPickerOpen((prev) => !prev);
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer",
                pickerOpen
                  ? "bg-blue-50/80 dark:bg-blue-950/40 text-[#2563EB] dark:text-[#3B82F6]"
                  : "text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900",
              )}
              role="menuitem"
              aria-expanded={pickerOpen}
              aria-haspopup="true"
            >
              <span className="flex items-center gap-2.5">
                <Buildings size={15} weight="bold" className="text-slate-400 shrink-0" />
                <span>Switch workspace</span>
              </span>
              <CaretRight size={13} weight="bold" className="text-slate-400 shrink-0" aria-hidden="true" />
            </button>

            {/* Flyout Submenu showing workspaces list */}
            {pickerOpen && (
              <>
                {/* Invisible hover bridge over the margin gap to prevent premature closure */}
                <div
                  className="hidden lg:block absolute left-full top-0 w-3 h-full z-[55]"
                  onMouseEnter={handlePickerEnter}
                  onMouseLeave={handlePickerLeave}
                  aria-hidden="true"
                />
                <div
                  onMouseEnter={handlePickerEnter}
                  onMouseLeave={handlePickerLeave}
                  className="mt-1.5 w-full rounded-xl border border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-md overflow-hidden lg:absolute lg:left-[calc(100%+8px)] lg:top-0 lg:mt-0 lg:w-72 lg:rounded-2xl lg:shadow-xl z-[60]"
                >
                  {renderWorkspaceListContent()}
                </div>
              </>
            )}
          </div>

          {/* Workspace Settings link */}
          <Link
            href={settingsHref}
            onClick={() => {
              setPickerOpen(false);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl transition-colors text-left"
            role="menuitem"
          >
            <Gear size={15} weight="bold" className="text-slate-400 shrink-0" />
            <span>Workspace settings</span>
          </Link>
        </div>
      )}

      <JoinOrCreateWorkspaceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void fetchWorkspaces()}
      />
    </div>
  );
}
