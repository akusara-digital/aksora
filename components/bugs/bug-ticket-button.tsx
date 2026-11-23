"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, Ticket, Check } from "@phosphor-icons/react";
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
}

export function BugTicketButton({
  bugId,
  externalTicket,
  defaultAssignee = "",
  defaultModule = "",
  defaultProject = "",
  devOptions = [],
}: BugTicketButtonProps) {
  const router = useRouter();
  const [linked, setLinked] = useState(String(externalTicket ?? "").trim());
  const [open, setOpen] = useState(false);
  const [trackers, setTrackers] = useState<TrackerOption[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLinked(String(externalTicket ?? "").trim());
  }, [externalTicket]);

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

  const handleOpenClick = async () => {
    const list = await loadTrackers();
    const jira = list.find((t) => t.kind === "jira");
    if (!jira && list.length === 0) {
      toast("No issue tracker connected. Go to Settings > Integrations to connect Jira.", "warning");
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
      setLinked(json.data.externalTicket);
      setOpen(false);
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
        <div className="flex items-center gap-2">
          {isUrl ? (
            <a
              href={linked}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:text-emerald-900 shadow-2xs",
              )}
              title={`View ${displayKey} in Jira`}
            >
              <Check size={14} weight="bold" className="text-emerald-600" />
              <span>Pushed ({displayKey})</span>
              <ArrowSquareOut size={13} weight="bold" className="text-emerald-600/70" />
            </a>
          ) : (
            <span
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 shadow-2xs"
              title={`Jira Ticket: ${displayKey}`}
            >
              <Check size={14} weight="bold" className="text-emerald-600" />
              <span>Pushed ({displayKey})</span>
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenClick}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer shadow-2xs"
        >
          <Ticket size={14} weight="bold" className="text-slate-600" />
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
        onConfirmPush={handleConfirmPush}
      />
    </>
  );
}
