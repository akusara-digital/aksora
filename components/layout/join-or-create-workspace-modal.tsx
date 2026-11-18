"use client";

import { useEffect, useRef, useState } from "react";
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
    setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeTab]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
        throw new Error(data.error || "Failed to create workspace.");
      }

      toast("Workspace created successfully", "success");
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
              activeTab === "create"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <Buildings size={16} weight="bold" />
            <span>Create workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("join")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
              activeTab === "join"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <LinkSimple size={16} weight="bold" />
            <span>Join with invite</span>
          </button>
        </div>

        {activeTab === "create" ? (
          <div>
            <h2 id="workspace-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Create a new workspace
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Set up a dedicated environment for your team to collaborate on projects, test plans, and tracking.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Workspace name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreate();
                    }
                  }}
                  placeholder="e.g. Acme Engineering"
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading || !name.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? "Creating..." : "Create workspace"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 id="workspace-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Join an existing workspace
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter an invite code or paste the full invite link provided by your workspace admin.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invite token or link
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={inviteToken}
                  onChange={(e) => {
                    setInviteToken(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleJoin();
                    }
                  }}
                  placeholder="Paste invite link or enter token..."
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={loading || !inviteToken.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? "Joining..." : "Join workspace"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
