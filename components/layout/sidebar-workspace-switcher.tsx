"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretUpDown, Check, Plus, Gear } from "@phosphor-icons/react";
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

const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-emerald-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-600 text-white",
  "bg-indigo-600 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-600 text-white",
  "bg-teal-600 text-white",
];

function getWorkspaceColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function SidebarWorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [activeWorkspaceUuid, setActiveWorkspaceUuid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const urlWs = searchParams?.get("ws") || "";

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.user) {
        const memberships = (data.user.memberships || []) as WorkspaceItem[];
        setWorkspaces(memberships);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Determine current active workspace
  const activeWorkspace =
    workspaces.find((w) => (urlWs && w.uuid === urlWs) || (activeWorkspaceUuid && w.uuid === activeWorkspaceUuid)) ||
    workspaces.find((w) => activeWorkspaceId && Number(w.workspaceId) === Number(activeWorkspaceId)) ||
    workspaces[0] ||
    null;

  const activeName = activeWorkspace?.name || "Workspace";
  const activeInitial = activeName.charAt(0).toUpperCase();
  const activeAvatarColor = getWorkspaceColor(activeName);

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

      setOpen(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("qa:profile-updated"));
      }

      // If on an item detail route that might not exist in the new workspace, route to dashboard
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

  if (collapsed) {
    return (
      <div ref={containerRef} className="relative flex justify-center border-b border-slate-200 py-2.5 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          title={`${activeName} (Click to switch workspace)`}
          aria-label="Switch workspace"
          className="flex h-8 w-8 items-center justify-center rounded-lg shadow-2xs transition hover:scale-105 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold shadow-xs",
              activeAvatarColor,
            )}
          >
            {activeInitial}
          </span>
        </button>

        {open && (
          <div className="fixed left-[72px] top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in duration-100 dark:border-slate-800 dark:bg-slate-900">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none dark:text-slate-500">
              Workspaces ({workspaces.length})
            </div>

            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {workspaces.map((ws) => {
                const isActive = activeWorkspace?.workspaceId === ws.workspaceId;
                const wsInitial = (ws.name || "W").charAt(0).toUpperCase();
                const color = getWorkspaceColor(ws.name || "");

                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => switchWorkspace(ws.workspaceId, ws.uuid)}
                    disabled={pendingId === ws.workspaceId}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition text-left",
                      isActive
                        ? "bg-blue-50/80 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold", color)}>
                        {wsInitial}
                      </span>
                      <span className="truncate">{ws.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
                        Free
                      </span>
                      {isActive && <Check size={13} weight="bold" className="text-blue-600 dark:text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              <Plus size={14} weight="bold" className="text-blue-600 dark:text-blue-400" />
              <span>Join or create workspace</span>
            </button>
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
    <div ref={containerRef} className="relative border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Switch workspace"
        aria-expanded={open}
        className="group flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 shadow-2xs transition hover:bg-slate-50/80 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 dark:hover:border-slate-700"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold shadow-xs",
              activeAvatarColor,
            )}
          >
            {activeInitial}
          </span>
          <div className="flex flex-col text-left min-w-0 leading-tight">
            <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {activeName}
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Free plan
            </span>
          </div>
        </div>

        <CaretUpDown size={14} weight="bold" className="text-slate-400 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-14 z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in duration-100 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none dark:text-slate-500">
            <span>Workspaces</span>
            <span>{workspaces.length}</span>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {workspaces.map((ws) => {
              const isActive = activeWorkspace?.workspaceId === ws.workspaceId;
              const wsInitial = (ws.name || "W").charAt(0).toUpperCase();
              const color = getWorkspaceColor(ws.name || "");

              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => switchWorkspace(ws.workspaceId, ws.uuid)}
                  disabled={pendingId === ws.workspaceId}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition text-left",
                    isActive
                      ? "bg-blue-50/80 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold", color)}>
                      {wsInitial}
                    </span>
                    <span className="truncate">{ws.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
                      Free
                    </span>
                    {isActive && <Check size={13} weight="bold" className="text-blue-600 dark:text-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setModalOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400"
          >
            <Plus size={14} weight="bold" className="text-blue-600 dark:text-blue-400" />
            <span>Join or create workspace</span>
          </button>

          <Link
            href={activeWorkspace?.uuid ? `/settings/workspaces?ws=${encodeURIComponent(activeWorkspace.uuid)}` : "/settings/workspaces"}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Gear size={13} weight="bold" className="text-slate-400" />
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
