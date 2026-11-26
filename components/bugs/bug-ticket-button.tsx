"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, Ticket, Check, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { PushToJiraModal } from "./push-to-jira-modal";
import { cn } from "@/lib/utils";

interface TrackerOption {
  id: number;
  name: string;
  kind: string;
  enabled: boolean;
}

export interface BugTicketButtonProps {
  bugId: number | string;
  externalTicket?: unknown;
  defaultAssignee?: string;
  defaultModule?: string;
  defaultProject?: string;
  devOptions?: Array<{ label: string; value: string }>;
  size?: "sm" | "md";
  onTicketCreated?: (ticket: string) => void;
}

export function BugTicketButton({
  bugId,
  externalTicket,
  defaultAssignee = "",
  defaultModule = "",
  defaultProject = "",
  devOptions = [],
  size = "md",
  onTicketCreated,
}: BugTicketButtonProps) {
  const router = useRouter();
  const [linked, setLinked] = useState(String(externalTicket ?? "").trim());
  const [open, setOpen] = useState(false);
  const [trackers, setTrackers] = useState<TrackerOption[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setLinked(String(externalTicket ?? "").trim());
  }, [externalTicket]);

  const handleSyncStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSyncing(true);
    try {
      const res = await fetch(`/api/bugs/${bugId}/ticket/sync`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to sync status.");
      if (json.data?.changed) {
        toast(`Jira status: "${json.data.statusName}". Bug status updated to "${json.data.newStatus}".`, "success");
      } else {
        toast(`Jira status: "${json.data?.statusName || "up to date"}". Already in sync.`, "info");
      }
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to sync status.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const loadTrackers = async (): Promise<TrackerOption[]> => {
    if (trackers) return trackers;
    try {
      const res = await fetch("/api/issue-trackers");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load trackers.");
      const enabled = (json.data as TrackerOption[]).filter((t) => t.enabled);
      setTrackers(enabled);
      return enabled;
    } catch (err) {
      setTrackers([]);
      toast(err instanceof Error ? err.message : "Failed to load trackers.", "error");
      return [];
    }
  };

  const handleOpenClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const list = await loadTrackers();
    const jira = list.find((t) => t.kind === "jira");
    if (!jira) {
      toast("Jira is not connected. Configure your Jira API in Settings.", "warning", {
        actionLabel: "Setup Jira",
        duration: 6000,
        onAction: () => {
          router.push(`/settings/integrations?add=jira&returnUrl=/bugs/${bugId}`);
        },
      });
      // Also open PushToJiraModal so user gets the detailed setup card modal directly
      setOpen(true);
      return;
    }
    setOpen(true);
  };

  const handleConfirmPush = async (config: { assignee: string; environment: string; scope: string }) => {
    const list = await loadTrackers();
    const jira = list.find((t) => t.kind === "jira") || list[0];
    if (!jira) {
      toast("No issue tracker connected.", "error");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/bugs/${bugId}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackerId: jira.id,
          assignee: config.assignee,
          environment: config.environment,
          scope: config.scope,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create ticket.");
      const newTicket = json.data.externalTicket || json.data.key || "";
      setLinked(newTicket);
      setOpen(false);
      onTicketCreated?.(newTicket);
      toast(`Ticket ${json.data.key} created and pushed to Jira!`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create ticket.", "error");
    } finally {
      setCreating(false);
    }
  };

  const isUrl = /^https?:\/\//i.test(linked);
  const matchKey = linked.match(/([A-Z0-9]+-\d+)/i);
  const displayKey = matchKey ? matchKey[1].toUpperCase() : (isUrl ? linked.split("/").pop() : linked);

  return (
    <>
      {linked ? (
        <div className="flex items-center gap-1.5">
          {isUrl ? (
            <a
              href={linked}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-900 shadow-2xs whitespace-nowrap"
              title={`View ${displayKey} in Jira`}
            >
              <Check size={13} weight="bold" className="text-emerald-600" />
              <span>Pushed ({displayKey})</span>
              <ArrowSquareOut size={12} weight="bold" className="text-emerald-600/70" />
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xs whitespace-nowrap"
              title={`Jira Ticket: ${displayKey}`}
            >
              <Check size={13} weight="bold" className="text-emerald-600" />
              <span>Pushed ({displayKey})</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSyncStatus}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Sync status from Jira"
          >
            <ArrowsClockwise size={12} weight="bold" className={cn("text-slate-500", syncing && "animate-spin text-blue-600")} />
            <span>Sync</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenClick}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
          title="Create Jira ticket"
        >
          <Ticket size={14} weight="bold" className="text-gray-500" />
          <span>Create ticket</span>
        </button>
      )}

      <PushToJiraModal
        isOpen={open}
        onClose={() => setOpen(false)}
        devOptions={devOptions}
        defaultAssignee={defaultAssignee}
        defaultModule={defaultModule}
        defaultProject={defaultProject}
        submitting={creating}
        hideSaveWithoutPush={true}
        returnUrl={`/bugs/${bugId}`}
        onConfirmPush={handleConfirmPush}
      />
    </>
  );
}
