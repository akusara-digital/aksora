"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Buildings, CaretDown, Gear, SignOut, UserCircle } from "@phosphor-icons/react";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roles";

export type WorkspaceMembership = {
  id: number;
  workspaceId: number;
  role: string;
  status: string;
  name: string;
  slug: string;
  uuid?: string;
};

export type AppUser = {
  role?: string;
  company?: string | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  activeWorkspaceId?: number | null;
  workspaceUuid?: string | null;
  memberships?: WorkspaceMembership[];
};

type AccountDropdownProps = {
  user: AppUser | null;
  accountLabel: string;
  avatarColor: string;
  refreshUser: () => Promise<void>;
  onLogoutClick: () => void;
};

export function AccountDropdown({
  user,
  accountLabel,
  avatarColor,
  refreshUser,
  onLogoutClick,
}: AccountDropdownProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const companyName = String(user?.company || "").trim();
  const wsParam = user?.workspaceUuid ? `?ws=${encodeURIComponent(user.workspaceUuid)}` : "";

  return (
    <div ref={accountRef} className="relative">
      <button
        type="button"
        onClick={() => setAccountOpen((v) => !v)}
        className="flex h-8 items-center gap-2 border border-gray-200 bg-white px-2 text-left transition hover:bg-gray-50"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" loading="lazy" decoding="async" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white", avatarColor)}>
            {String(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-28 flex-col leading-tight md:flex">
          <span className="truncate text-xs font-semibold text-gray-800">
            {user?.name || user?.email || "Account"}
          </span>
          <span className="truncate text-[10px] text-gray-500">
            {accountLabel}
          </span>
        </span>
        <CaretDown size={12} weight="bold" className="text-gray-400" />
      </button>

      {accountOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <label className="group relative cursor-pointer" title="Change avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" loading="lazy" decoding="async" className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-200" />
              ) : (
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white", avatarColor)}>
                  {String(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                <UserCircle size={20} weight="bold" className="text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // Compress to tiny avatar (64x64, quality 0.6)
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  const img = new Image();
                  img.onload = async () => {
                    canvas.width = 64;
                    canvas.height = 64;
                    ctx?.drawImage(img, 0, 0, 64, 64);
                    const dataUrl = canvas.toDataURL("image/webp", 0.6);
                    try {
                      const res = await fetch("/api/auth/avatar", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ avatar: dataUrl }),
                      });
                      if (res.ok) {
                        await refreshUser();
                      }
                    } catch {}
                  };
                  img.src = URL.createObjectURL(file);
                }}
              />
            </label>
            <p className="text-sm font-bold text-gray-900">{user?.name || user?.email || "Account"}</p>
          </div>

          <div className="mt-3 border border-gray-100 bg-gray-50 p-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-gray-500">Email</span>
              <span className="font-semibold text-gray-800">{user?.email || "-"}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-gray-500">Role</span>
              <span className="font-semibold text-gray-800">{getRoleLabel(user?.role || "")}</span>
            </div>
            {companyName && (
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Workspace</span>
                <span className="max-w-36 truncate font-semibold text-gray-800">{companyName}</span>
              </div>
            )}
          </div>

          {(user?.memberships?.length ?? 0) >= 1 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <WorkspaceSwitcher
                memberships={user?.memberships ?? []}
                activeWorkspaceId={user?.activeWorkspaceId}
                activeWorkspaceUuid={user?.workspaceUuid}
                compact
                onSwitched={() => setAccountOpen(false)}
              />
              <div className="mt-2 border-t border-gray-100 pt-2">
                <Link
                  href={`/settings/workspaces${wsParam}`}
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  <Buildings size={14} weight="bold" />
                  Manage Workspaces
                </Link>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-0.5 border-t border-gray-100 pt-3">
            <Link
              href={`/settings/profile${wsParam}`}
              onClick={() => setAccountOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <UserCircle size={15} weight="bold" />
              Profile
            </Link>
            {(String(user?.role || "").trim() === "admin" || String(user?.role || "").trim() === "superadmin") && (
              <Link
                href={`/settings/users${wsParam}`}
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Gear size={15} weight="bold" />
                Account settings
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                onLogoutClick();
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <SignOut size={15} weight="bold" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
