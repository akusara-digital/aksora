"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Buildings, LinkSimple, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

interface JoinOrCreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (workspace: { id?: number; name: string; uuid?: string }) => void;
  initialTab?: "create" | "join";
}

export function JoinOrCreateWorkspaceModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "create",
}: JoinOrCreateWorkspaceModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"create" | "join">(initialTab);
  const [name, setName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setName("");
      setInviteToken("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Workspace name is required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not create workspace. Please try again.");
      }

      toast("Workspace created", "success");
      const createdWs = data.workspace as { id?: number; name: string; uuid?: string };
      const targetUuid = createdWs?.uuid;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("qa:profile-updated"));
      }

      onSuccess?.(createdWs);
      onClose();

      const targetUrl = targetUuid ? `/dashboard?ws=${encodeURIComponent(targetUuid)}` : "/dashboard";
      router.push(targetUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = inviteToken.trim();
    if (!trimmed) {
      setError("Invite token or link is required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to join workspace.");
      }

      toast("Joined workspace successfully", "success");
      const joinedWs = data.workspace as { id?: number; name: string; uuid?: string };
      const targetUuid = joinedWs?.uuid;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("qa:profile-updated"));
      }

      onSuccess?.(joinedWs);
      onClose();

      const targetUrl = targetUuid ? `/dashboard?ws=${encodeURIComponent(targetUuid)}` : "/dashboard";
      router.push(targetUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!loading) onClose();
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-modal-title"
        aria-describedby="workspace-modal-desc"
        className="relative w-[min(28rem,calc(100vw-2rem))] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <button
          type="button"
          onClick={() => {
            if (!loading) onClose();
          }}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X size={16} weight="bold" />
        </button>

        {/* Centered Header (BugSnap style) */}
        <div className="text-center space-y-1.5 pt-1 px-4">
          <h2 id="workspace-modal-title" className="text-base font-bold text-slate-900 dark:text-white break-words">
            {activeTab === "create" ? "Create a workspace" : "Join a workspace"}
          </h2>
          <p id="workspace-modal-desc" className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed text-balance break-words">
            {activeTab === "create"
              ? "Set up a shared home for your team's projects, test plans, tasks, and bugs."
              : "Paste an invite link or enter the invite code shared by your workspace administrator."}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveTab("create")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "create"
                ? "bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            <Buildings size={14} weight="bold" />
            <span>Create workspace</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveTab("join")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "join"
                ? "bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            <LinkSimple size={14} weight="bold" />
            <span>Join with invite</span>
          </button>
        </div>

        {activeTab === "create" ? (
          <>
            <div>
              <label htmlFor="create-ws-name" className="block text-xs font-medium text-slate-800 dark:text-zinc-200 mb-1.5">
                Workspace name
              </label>
              <input
                id="create-ws-name"
                ref={inputRef}
                type="text"
                value={name}
                maxLength={50}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim() && !loading) {
                    e.preventDefault();
                    void handleCreate();
                  }
                }}
                placeholder="e.g. QA Team, Client Project"
                disabled={loading}
                className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 text-slate-900 placeholder:text-slate-400 transition-all disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
              />
              {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{error}</p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  You can rename this or invite members anytime in Settings.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="w-full inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer select-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!name.trim() || loading}
                className="w-full inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs select-none"
              >
                {loading ? "Creating..." : "Create workspace"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="join-ws-token" className="block text-xs font-medium text-slate-800 dark:text-zinc-200 mb-1.5">
                Invite link or token
              </label>
              <input
                id="join-ws-token"
                ref={inputRef}
                type="text"
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteToken.trim() && !loading) {
                    e.preventDefault();
                    void handleJoin();
                  }
                }}
                placeholder="Paste invite link or enter token..."
                disabled={loading}
                className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 text-slate-900 placeholder:text-slate-400 transition-all disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
              />
              {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{error}</p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  You will be switched to the workspace as soon as the invite is accepted.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="w-full inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer select-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleJoin()}
                disabled={!inviteToken.trim() || loading}
                className="w-full inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs select-none"
              >
                {loading ? "Joining..." : "Join workspace"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
