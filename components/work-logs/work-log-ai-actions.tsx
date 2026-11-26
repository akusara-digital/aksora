"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { WorkLogTimesheetAuditModal } from "./work-log-timesheet-audit-modal";
import { WorkLogFillGapModal } from "./work-log-fill-gap-modal";
import { WorkLogToolsMenu } from "./work-log-tools-menu";
import { getSicmundusAuthPayload } from "@/lib/sicmundus-client";

export interface WorkLogAiActionsProps {
  actionButtons?: React.ReactNode;
}

export function WorkLogAiActions({ actionButtons }: WorkLogAiActionsProps = {}) {
  const router = useRouter();

  // Modals state
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isFillGapOpen, setIsFillGapOpen] = useState(false);

  // Today's summary state
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null);
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
      <div className={cn(actionButtons ? "flex flex-col items-end gap-1.5" : "flex flex-wrap items-center gap-2")}>
        <div className="flex items-center gap-2 shrink-0">
          {/* Unified Tools Dropdown Menu */}
          <WorkLogToolsMenu
            onOpenAudit={() => setIsAuditOpen(true)}
            onSyncSicmundus={handleSyncSicmundus}
            syncingSicmundus={syncingSicmundus}
            activeModel={activeModel}
          />
          {actionButtons}
        </div>

        {/* Today's Daily 8h Target Indicator */}
        {todayMinutes !== null && (
          <div
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition shrink-0 shadow-2xs select-none",
              isTodayTargetMet
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            )}
            title={`Today: ${todayHoursFormatted}h recorded. Daily minimum target is 8 hours.`}
          >
            {isTodayTargetMet ? (
              <>
                <CheckCircle size={14} weight="bold" className="text-emerald-600 shrink-0" />
                <span>Today: <strong>{todayHoursFormatted}h</strong> / 8h (Goal met ✓)</span>
              </>
            ) : (
              <>
                <WarningCircle size={14} weight="bold" className="text-amber-600 shrink-0" />
                <span>Today: <strong>{todayHoursFormatted}h</strong> / 8h ({todayRemainingHours}h remaining)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Monthly Timesheet Audit */}
      <WorkLogTimesheetAuditModal
        isOpen={isAuditOpen}
        onClose={() => {
          setIsAuditOpen(false);
          fetchTodayStatus();
        }}
      />

      {/* Fill Today's Gap */}
      <WorkLogFillGapModal
        isOpen={isFillGapOpen}
        onClose={() => {
          setIsFillGapOpen(false);
          fetchTodayStatus();
        }}
        date={new Date().toISOString().slice(0, 10)}
        currentMinutes={todayMinutes ?? 0}
      />
    </>
  );
}
