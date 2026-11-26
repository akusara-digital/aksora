"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  ArrowsClockwise,
  Plus,
  Briefcase,
  Tag,
  NotePencil,
  Sparkle,
  TrendUp,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface WorkLogFillGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  currentMinutes?: number;
}

const DEFAULT_PROJECTS = ["MOT - Asset", "AURA", "Oronamin C", "QA Ecosystem"];

const WORK_CATEGORIES = [
  { value: "development", label: "Development / Feature" },
  { value: "bugfix", label: "Bug Fixing & Slicing" },
  { value: "testing", label: "Testing & QA Verification" },
  { value: "meeting", label: "Sprint Meeting & Standup" },
  { value: "code_review", label: "Code Review & Refactor" },
];

export function WorkLogFillGapModal({
  isOpen,
  onClose,
  date,
  currentMinutes = 0,
}: WorkLogFillGapModalProps) {
  const router = useRouter();

  const [targetHours, setTargetHours] = useState(8);
  const [projectList, setProjectList] = useState<string[]>(DEFAULT_PROJECTS);
  const [project, setProject] = useState(DEFAULT_PROJECTS[0]);
  const [category, setCategory] = useState("development");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch actual workspace projects if available
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (!isMounted || !res) return;
        const items = Array.isArray(res) ? res : res.data;
        if (Array.isArray(items) && items.length > 0) {
          const names = items
            .map((p: { name?: string }) => p.name?.trim())
            .filter((n): n is string => Boolean(n));
          if (names.length > 0) {
            setProjectList(Array.from(new Set([...names, ...DEFAULT_PROJECTS])));
            setProject((prev) => (names.includes(prev) ? prev : names[0]));
          }
        }
      })
      .catch(() => {
        // Fallback to defaults
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const targetMinutes = Math.round(targetHours * 60);
  const missingMinutes = Math.max(0, targetMinutes - currentMinutes);
  const missingHoursFormatted = (missingMinutes / 60).toFixed(1);
  const currentHoursFormatted = (currentMinutes / 60).toFixed(1);
  const progressPercent = Math.min(100, Math.round((currentMinutes / targetMinutes) * 100));

  const handleFillGap = async () => {
    if (missingMinutes <= 0) {
      toast("Target daily hours for this date are already reached.", "info");
      onClose();
      return;
    }

    setLoading(true);
    try {
      const defaultDesc = `Completed and verified tasks for ${project}`;
      const res = await fetch("/api/work-logs/fill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          targetMinutes,
          project,
          category,
          description: description.trim() || defaultDesc,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to complete daily work hours");
      }

      toast(`Added ${missingHoursFormatted}h to timesheet and synced successfully!`, "success");
      onClose();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to fill work hours", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSuggestDesc = () => {
    const selectedCatLabel = WORK_CATEGORIES.find((c) => c.value === category)?.label || "Development";
    setDescription(`${selectedCatLabel} and quality verification on ${project}`);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Daily Work Hours"
      description={`Add an automatic gap-fill entry for ${date} to meet your daily timesheet target.`}
      maxWidth="md"
      icon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 shadow-xs">
          <Clock size={20} weight="bold" />
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Entry to create:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              +{missingHoursFormatted}h ({missingMinutes}m)
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFillGap}
              disabled={loading || missingMinutes <= 0}
              className="inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
                  <span>Logging & Syncing...</span>
                </>
              ) : (
                <>
                  <Plus size={14} weight="bold" />
                  <span>Fill +{missingHoursFormatted}h & Sync</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Progress & Hours Summary Card */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Logged So Far
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {currentHoursFormatted}h{" "}
                <span className="text-xs font-normal text-slate-500">({currentMinutes} mins)</span>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Remaining Gap
              </span>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                <TrendUp size={14} weight="bold" />
                <span>+{missingHoursFormatted}h</span>
                <span className="text-xs font-normal text-slate-500">({missingMinutes} mins)</span>
              </div>
            </div>
          </div>

          {/* Micro Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Progress toward {targetHours}h target</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  progressPercent >= 100
                    ? "bg-emerald-500"
                    : progressPercent >= 50
                    ? "bg-blue-600"
                    : "bg-amber-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Target Daily Hours Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Target Minimum Hours
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { h: 8, tag: "Standard" },
              { h: 8.5, tag: "Overtime" },
              { h: 9, tag: "Overtime" },
              { h: 10, tag: "Overtime" },
            ].map(({ h, tag }) => {
              const active = targetHours === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setTargetHours(h)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-bold transition",
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{h} Hours</span>
                  <span
                    className={cn(
                      "text-[10px] font-medium mt-0.5",
                      active ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                    )}
                  >
                    {tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Project & Category 2-Column Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Project Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase size={13} weight="bold" />
              <span>Project</span>
            </label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            >
              {projectList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Tag size={13} weight="bold" />
              <span>Work Category</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            >
              {WORK_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description / Task Details */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <NotePencil size={13} weight="bold" />
              <span>Work Details / Description</span>
            </label>
            <button
              type="button"
              onClick={handleAutoSuggestDesc}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition"
            >
              <Sparkle size={12} weight="bold" />
              <span>Suggest</span>
            </button>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`e.g. Implementation and verification of ${project} features`}
            className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>
      </div>
    </ModalShell>
  );
}
