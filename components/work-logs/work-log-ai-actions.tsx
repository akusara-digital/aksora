"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { WorkLogTimesheetAuditModal } from "./work-log-timesheet-audit-modal";
import { WorkLogFillGapModal } from "./work-log-fill-gap-modal";
import { WorkLogPullActivityModal } from "./work-log-pull-activity-modal";
import { WorkLogToolsMenu } from "./work-log-tools-menu";
import { getSicmundusAuthPayload } from "@/lib/sicmundus-client";

interface WorkLogSuggestion {
  date: string;
  project: string;
  category: string;
  description: string;
  output: string;
  durationMinutes: number;
}

interface TodayWorkLog {
  id: number | string;
  project: string;
  category: string;
  description: string;
  output: string;
  durationMinutes: number | string;
}

function formatDurationLabel(mins: number | string | undefined | null): string {
  const num = typeof mins === "number" ? mins : parseInt(String(mins || "").replace(/\D+/g, ""), 10);
  if (!num || isNaN(num) || num <= 0) return "1h";
  const h = Math.floor(num / 60);
  const m = num % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDateLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function WorkLogAiActions() {
  const router = useRouter();

  // Modals state
  const [isPullOpen, setIsPullOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isFillGapOpen, setIsFillGapOpen] = useState(false);

  // Today's summary state
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [syncingSicmundus, setSyncingSicmundus] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("");

  const fetchTodayStatus = async () => {
    try {
      const res = await fetch("/api/dashboard/timesheet-status");
      if (res.ok) {
        const json = await res.json();
        setTodayMinutes(json.data?.todayMinutes ?? 0);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    if (isAiConfigured()) {
      const creds = getActiveAiCredentials();
      setActiveModel(creds.model || "Active AI");
    }
  }, []);

  // Copy Standup Format
  const handleCopyStandup = async () => {
    if (copying) return;
    setCopying(true);

    try {
      const res = await fetch("/api/work-logs/today-activity");
      const json = await res.json();
      const todayLogs: TodayWorkLog[] = json.data?.todayLogs || [];
      const fallbackSuggestions: WorkLogSuggestion[] = json.data?.suggestions || [];

      const items = todayLogs.length > 0 ? todayLogs : fallbackSuggestions;
      const todayDate = formatDateLabel();

      const lines: string[] = [];
      if (items.length > 0) {
        for (const item of items) {
          const proj = item.project || "QA";
          const desc = item.description || "QA verification";
          const dur = formatDurationLabel(item.durationMinutes);
          const out = item.output ? ` : ${item.output}` : "";
          lines.push(`• ${proj}: ${desc} (${dur})${out}`);
        }
      } else {
        lines.push("• QA Ecosystem: Daily test execution and defect verification (4h) : Test passes completed");
      }
      lines.push("• Blockers: None");

      const standupReport = `*Daily Standup : ${todayDate}*\n${lines.join("\n")}`;

      try {
        await navigator.clipboard.writeText(standupReport);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = standupReport;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      toast("Standup report copied to clipboard!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to copy standup format", "error");
    } finally {
      setCopying(false);
    }
  };

  const handleSyncSicmundus = async () => {
    setSyncingSicmundus(true);
    try {
      const authPayload = getSicmundusAuthPayload();
      const res = await fetch("/api/work-logs/sync-sicmundus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authPayload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to sync with Sicmundus");
      }
      toast(json.message || "Sicmundus sync completed successfully!", "success");
      fetchTodayStatus();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to sync with Sicmundus", "error");
    } finally {
      setSyncingSicmundus(false);
    }
  };

  const todayHoursFormatted = todayMinutes !== null ? (todayMinutes / 60).toFixed(1) : "0.0";
  const isTodayTargetMet = todayMinutes !== null && todayMinutes >= 480;
  const todayRemainingMinutes = todayMinutes !== null ? Math.max(0, 480 - todayMinutes) : 480;
  const todayRemainingHours = (todayRemainingMinutes / 60).toFixed(1);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Today's Daily 8h Target Indicator */}
        {todayMinutes !== null && (
          <div
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition shrink-0 shadow-xs",
              isTodayTargetMet
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            )}
            title={`Today: ${todayHoursFormatted}h recorded. Daily minimum target is 8 hours.`}
          >
            {isTodayTargetMet ? (
              <>
                <CheckCircle size={14} weight="bold" className="text-emerald-600 shrink-0" />
                <span>Today: <strong>{todayHoursFormatted}h</strong> (Min 8h ✓)</span>
              </>
            ) : (
              <>
                <WarningCircle size={14} weight="bold" className="text-amber-600 shrink-0" />
                <span>Today: <strong>{todayHoursFormatted}h</strong> / 8h</span>
                <button
                  type="button"
                  onClick={() => setIsFillGapOpen(true)}
                  className="ml-1 rounded bg-amber-600 hover:bg-amber-700 text-white px-1.5 py-0.5 text-[10px] font-bold transition cursor-pointer"
                  title="Fill remaining work hours to meet 8h minimum"
                >
                  +{todayRemainingHours}h
                </button>
              </>
            )}
          </div>
        )}

        {/* Unified Tools Dropdown Menu */}
        <WorkLogToolsMenu
          onOpenPull={() => setIsPullOpen(true)}
          onCopyStandup={handleCopyStandup}
          onOpenAudit={() => setIsAuditOpen(true)}
          onSyncSicmundus={handleSyncSicmundus}
          copying={copying}
          syncingSicmundus={syncingSicmundus}
          activeModel={activeModel}
        />
      </div>

      {/* Submodal 2: Monthly Timesheet Audit */}
      <WorkLogTimesheetAuditModal
        isOpen={isAuditOpen}
        onClose={() => {
          setIsAuditOpen(false);
          fetchTodayStatus();
        }}
      />

      {/* Submodal 3: Fill Today's Gap */}
      <WorkLogFillGapModal
        isOpen={isFillGapOpen}
        onClose={() => {
          setIsFillGapOpen(false);
          fetchTodayStatus();
        }}
        date={new Date().toISOString().slice(0, 10)}
        currentMinutes={todayMinutes ?? 0}
      />

      {/* Submodal 4: Pull Today's Work Modal */}
      <WorkLogPullActivityModal
        isOpen={isPullOpen}
        onClose={() => setIsPullOpen(false)}
        onSuccess={() => {
          fetchTodayStatus();
          router.refresh();
        }}
      />
    </>
  );
}