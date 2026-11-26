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
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface WorkLogGapFillFormContentProps {
  onSuccess: () => void;
  onCancel: () => void;
  defaultProject?: string;
  projectOptions?: Array<{ value: string; label: string }>;
}

const DEFAULT_PROJECTS = ["MOT - Asset", "AURA", "Oronamin C", "QA Ecosystem"];

const WORK_CATEGORIES = [
  { value: "development", label: "Development / Feature" },
  { value: "bugfix", label: "Bug Fixing & Slicing" },
  { value: "testing", label: "Testing & QA Verification" },
  { value: "meeting", label: "Sprint Meeting & Standup" },
  { value: "code_review", label: "Code Review & Refactor" },
];

export function WorkLogGapFillFormContent({
  onSuccess,
  onCancel,
  defaultProject = "",
  projectOptions = [],
}: WorkLogGapFillFormContentProps) {
  const router = useRouter();

  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const [currentMinutes, setCurrentMinutes] = useState<number>(0);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [targetHours, setTargetHours] = useState(8);

  const fallbackProjects = projectOptions.length > 0
    ? projectOptions.map((p) => p.value || p.label)
    : DEFAULT_PROJECTS;

  const [projectList, setProjectList] = useState<string[]>(fallbackProjects);
  const [project, setProject] = useState(defaultProject || fallbackProjects[0]);
  const [category, setCategory] = useState("development");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/dashboard/timesheet-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json?.data) return;
        setCurrentMinutes(json.data.todayMinutes ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingStatus(false);
      });

    if (projectOptions.length === 0) {
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
              setProject((prev) => (prev ? prev : names[0]));
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [projectOptions]);

  const targetMinutes = Math.round(targetHours * 60);
  const missingMinutes = Math.max(0, targetMinutes - currentMinutes);
  const missingHoursFormatted = (missingMinutes / 60).toFixed(1);
  const currentHoursFormatted = (currentMinutes / 60).toFixed(1);
  const progressPercent = Math.min(100, Math.round((currentMinutes / targetMinutes) * 100));

  const handleFillGap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missingMinutes <= 0) {
      toast("Target daily hours for today are already reached.", "info");
      onSuccess();
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

      toast(`Added +${missingHoursFormatted}h to timesheet and synced successfully!`, "success");
      onSuccess();
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
    <form onSubmit={handleFillGap} className="space-y-6 p-6">
      {/* Progress & Summary Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Today&apos;s Time Logged
            </span>
            <div className="text-xl font-black text-slate-900">
              {loadingStatus ? "..." : `${currentHoursFormatted}h`}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                ({currentMinutes} mins recorded)
              </span>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Auto-Fill Deficit
            </span>
            <div className="text-xl font-black text-amber-600 flex items-center justify-end gap-1">
              <TrendUp size={16} weight="bold" />
              <span>+{missingHoursFormatted}h</span>
              <span className="text-xs font-normal text-slate-500 ml-1">({missingMinutes} mins)</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Daily progress towards {targetHours}h minimum</span>
            <span className="font-bold text-slate-800">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
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

      {/* Target Hours Choice */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Target Minimum Hours
        </label>
        <div className="grid grid-cols-4 gap-2.5">
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
                  "flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition",
                  active
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <span>{h} Hours</span>
                <span className={cn("text-[10px] font-medium mt-0.5", active ? "text-blue-600" : "text-slate-400")}>
                  {tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Briefcase size={14} weight="bold" />
            <span>Target Project</span>
          </label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          >
            {projectList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Tag size={14} weight="bold" />
            <span>Work Category</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          >
            {WORK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Work Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <NotePencil size={14} weight="bold" />
            <span>Work Details / Description</span>
          </label>
          <button
            type="button"
            onClick={handleAutoSuggestDesc}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            <Sparkle size={13} weight="bold" />
            <span>Auto-fill details</span>
          </button>
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`e.g. Implementation and verification of ${project} features`}
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || missingMinutes <= 0}
          className="inline-flex h-10 items-center gap-2 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
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
    </form>
  );
}
