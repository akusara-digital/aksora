"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar";
import { GlobalSearch } from "@/components/shared/search/global-search";
import { NotificationPanel } from "./sidebar";
import { Bell, CaretUp, List, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roles";
import { TrialBanner } from "@/components/layout/trial-banner";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { useAssignmentNotifications } from "@/hooks/use-assignment-notifications";
import { AppSplashScreen } from "@/components/layout/app-splash-screen";
import { SectionSubNav } from "@/components/layout/section-sub-nav";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";
import { TopBreadcrumbs } from "@/components/layout/breadcrumb";
import { AccountDropdown, type AppUser } from "@/components/layout/account-dropdown";
import { isStandaloneRoute } from "@/lib/route-utils";
import { toast } from "@/components/ui/toast";

const ConfirmModal = dynamic(() => import("@/components/ui/confirm-modal").then((m) => m.ConfirmModal), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/shared/search/command-palette").then((m) => m.CommandPalette), { ssr: false });
const OnboardingTour = dynamic(() => import("@/components/layout/onboarding-tour").then((m) => m.OnboardingTour), { ssr: false });
const WorkspaceOnboardingModal = dynamic(() => import("@/components/layout/workspace-onboarding-modal").then((m) => m.WorkspaceOnboardingModal), { ssr: false });
const InstallPromptBanner = dynamic(() => import("@/components/layout/install-prompt-banner").then((m) => m.InstallPromptBanner), { ssr: false });
const GlobalCreateModal = dynamic(() => import("@/components/shared/global-create-modal").then((m) => m.GlobalCreateModal), { ssr: false });

type AppWrapperProps = {
  children: React.ReactNode;
};

export function AppWrapper({ children }: AppWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountLabel = user ? getRoleLabel(user?.role || "") : "User";

  const isStandalone = isStandaloneRoute(pathname);

  // Real-time assignment notifications via SSE (only when logged in)
  useAssignmentNotifications(!isStandalone && !!user);

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = (await response.json()) as { user?: AppUser | null };
      const fetchedUser = data.user || null;
      setUser(fetchedUser);
      // Redirect to onboarding if logged in but has no workspace membership
      if (fetchedUser && (fetchedUser.memberships?.length ?? 0) === 0 && !pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const switchingRef = useRef<string | null>(null);
  const unauthorizedToastRef = useRef<string | null>(null);

  // Sync workspace UUID in URL so user URLs are strictly scoped to their workspace (?ws=<uuid>)
  useEffect(() => {
    if (!user?.workspaceUuid || isStandalone) return;
    const currentWs = searchParams?.get("ws");

    if (!currentWs) {
      const currentParams = new URLSearchParams(searchParams?.toString() || "");
      currentParams.set("ws", user.workspaceUuid);
      window.history.replaceState(null, "", `${pathname}?${currentParams.toString()}`);
    } else if (currentWs !== user.workspaceUuid) {
      const matching = user.memberships?.find((m) => m.uuid === currentWs);
      if (matching) {
        if (switchingRef.current === currentWs) return;
        switchingRef.current = currentWs;
        fetch("/api/auth/workspace/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: matching.workspaceId, workspaceUuid: currentWs }),
        })
          .then(async (res) => {
            if (res.ok) {
              await refreshUser();
              router.refresh();
            } else {
              toast("Failed to switch workspace.", "error");
              router.replace(`${pathname}?ws=${encodeURIComponent(user.workspaceUuid!)}`);
            }
          })
          .catch(() => {
            toast("Failed to switch workspace.", "error");
            router.replace(`${pathname}?ws=${encodeURIComponent(user.workspaceUuid!)}`);
          })
          .finally(() => {
            switchingRef.current = null;
          });
      } else {
        // CRITICAL SECURITY GUARD: If user is NOT a member of the workspace in the URL
        if (unauthorizedToastRef.current !== currentWs) {
          unauthorizedToastRef.current = currentWs;
          toast("You do not have access to this workspace.", "error");
        }
        router.replace(`${pathname}?ws=${encodeURIComponent(user.workspaceUuid)}`);
      }
    } else {
      unauthorizedToastRef.current = null;
    }
  }, [user?.workspaceUuid, user?.memberships, searchParams, pathname, isStandalone, router]);

  useEffect(() => {
    const saved = window.localStorage.getItem("qa-sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "1");
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem("qa-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed, mounted]);

  useEffect(() => {
    if (isStandalone) return;
    if (!user) {
      void refreshUser();
    }
    const t = setTimeout(() => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setNotifCount((d.notifications || []).length))
        .catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [isStandalone, pathname, user]);

  useEffect(() => {
    const handler = () => {
      void refreshUser();
    };
    window.addEventListener("qa:profile-updated", handler);
    return () => window.removeEventListener("qa:profile-updated", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "k") return;
      if (e.key === "n") {
        e.preventDefault();
        window.dispatchEvent(new Event("qa:open-form"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Global shortcut: pressing 'c' or 'C' opens the Create Modal (Linear/Jira style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const tagName = target.tagName?.toLowerCase();
        const isEditable = target.isContentEditable || target.getAttribute("contenteditable") === "true";
        if (tagName === "input" || tagName === "textarea" || tagName === "select" || isEditable) {
          return;
        }
        e.preventDefault();
        setCreateModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const sidebarWidth = !mounted ? "240px" : collapsed ? "64px" : "240px";

  const avatarColors = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  const avatarColor =
    avatarColors[
      (String(user?.name || user?.email || "U").charCodeAt(0) +
        String(user?.name || user?.email || "U").length) %
        avatarColors.length
    ];

  if (isStandalone) {
    return <>{children}</>;
  }

  if (authLoading) {
    return <AppSplashScreen />;
  }

  return (
    <BreadcrumbProvider>
      <div suppressHydrationWarning className="flex min-h-screen bg-[var(--bg-app)] overflow-x-hidden">
      {mounted && user && !user.activeWorkspaceId && (user.memberships?.length ?? 0) === 0 && (
        <WorkspaceOnboardingModal />
      )}
      <CommandPalette />
      <OnboardingTour />
      <InstallPromptBanner />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-150 ease-in-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onLogout={() => setShowLogoutConfirm(true)}
          userRole={user?.role || ""}
        />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <div
          suppressHydrationWarning
          className="flex flex-1 flex-col transition-[margin-left] duration-150 ease-in-out md:ml-[var(--sidebar-w)]"
          style={{ "--sidebar-w": sidebarWidth } as React.CSSProperties}
        >
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-white px-4 md:px-6">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 md:hidden"
                aria-label="Open menu"
              >
                <List size={18} weight="bold" />
              </button>
              <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                <GlobalSearch />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                title="Create Task or Bug (C)"
                aria-label="Create Task or Bug"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus size={14} weight="bold" />
                <span>Create</span>
              </button>
              <div ref={notifRef} className="relative">
                {notifOpen && <NotificationPanel anchorRef={notifRef} onClose={() => setNotifOpen(false)} />}
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  title="Notifications"
                  aria-label="Notifications"
                  className="relative flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
                >
                  <Bell size={16} weight="bold" />
                  {notifCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-rose-500 px-0.5 text-[10px] font-bold text-white">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </button>
              </div>
              <AccountDropdown
                user={user}
                accountLabel={accountLabel}
                avatarColor={avatarColor}
                refreshUser={refreshUser}
                onLogoutClick={() => setShowLogoutConfirm(true)}
              />
            </div>
          </header>
          <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
            <TrialBanner />
            <AnnouncementBanner />
            <div key={pathname} className="mx-auto max-w-7xl animate-in fade-in duration-150">
              <TopBreadcrumbs />
              <SectionSubNav />
              {children}
            </div>
          </main>
          <footer className="border-t border-[var(--border-color)] bg-gray-50/50 px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-gray-400">
              © 2026 — Aksora by{" "}
              <a
                href="https://akusaradigital.com"
                className="text-gray-500 hover:text-blue-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                Akusara Digital
              </a>
            </p>
          </footer>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 z-50 flex h-9 w-9 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:bg-gray-900 hover:text-white hover:border-gray-900"
          aria-label="Scroll to top"
        >
          <CaretUp size={16} weight="bold" />
        </button>
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out from your session? All unsaved work might be lost."
        confirmText={loggingOut ? "Logging out..." : "Yes, Log Out"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => !loggingOut && setShowLogoutConfirm(false)}
      />

      <GlobalCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        user={user}
      />
    </div>
    </BreadcrumbProvider>
  );
}
