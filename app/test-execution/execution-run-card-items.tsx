"use client";

import Link from "next/link";
import {
  Play,
  ArrowRight,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  User,
  Lightning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SuiteWithRun } from "./execution-suite-cards";

export function InProgressCard({ suite }: { suite: SuiteWithRun }) {
  const run = suite.lastRun!;
  const total = run.totalCases || suite.caseCount;
  const completed = run.passed + run.failed + run.blocked;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      href={`/test-execution/${suite.publicToken}/run/${run.id}`}
      className="group relative flex flex-col rounded-xl border border-blue-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
    >
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-bold text-blue-700">
          <Lightning size={11} weight="fill" /> Run #{run.runNumber}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{suite.project}</p>
        <h3 className="text-base font-bold text-slate-900 pr-20 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {suite.title}
        </h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <ProgressRing progress={progress} size={48} />
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-emerald-600">{run.passed}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Pass</p>
          </div>
          <div>
            <p className="text-sm font-bold text-rose-500">{run.failed}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Fail</p>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-500">{run.blocked}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Block</p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <User size={13} weight="bold" />
          <span className="font-semibold">{run.tester || "Unassigned"}</span>
        </div>
        <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
          Continue <ArrowRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

export function ReadyCard({
  suite,
  onStartRun,
  creating,
}: {
  suite: SuiteWithRun;
  onStartRun: (s: SuiteWithRun) => void;
  creating: boolean;
}) {
  const lastRun = suite.lastRun;
  const hasHistory = lastRun && lastRun.status === "completed";
  const passRate =
    hasHistory && lastRun.totalCases > 0
      ? Math.round((lastRun.passed / lastRun.totalCases) * 100)
      : null;

  return (
    <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{suite.project}</p>
        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{suite.title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{suite.planName}</p>
      </div>

      <div className="flex items-center gap-2.5 mb-3 text-xs text-slate-500">
        <span className="font-semibold">{suite.caseCount} cases</span>
        {suite.assignee && (
          <>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <User size={12} weight="bold" /> {suite.assignee}
            </span>
          </>
        )}
        {hasHistory && passRate !== null && (
          <>
            <span className="text-slate-300">·</span>
            <span
              className={cn(
                "font-bold",
                passRate >= 80 ? "text-emerald-600" : passRate >= 50 ? "text-amber-600" : "text-rose-500",
              )}
            >
              Last: {passRate}%
            </span>
          </>
        )}
      </div>

      {hasHistory && (
        <div className="flex items-center gap-3 mb-4 rounded-lg bg-slate-50 p-2 text-xs">
          <span className="flex items-center gap-1 font-semibold text-emerald-600">
            <CheckCircle size={13} weight="bold" /> {lastRun.passed}
          </span>
          <span className="flex items-center gap-1 font-semibold text-rose-500">
            <XCircle size={13} weight="bold" /> {lastRun.failed}
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-500">
            <Warning size={13} weight="bold" /> {lastRun.blocked}
          </span>
          <span className="ml-auto text-[11px] font-medium text-slate-400">Run #{lastRun.runNumber}</span>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onStartRun(suite)}
          disabled={creating || suite.caseCount === 0}
          className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
        >
          <Play size={13} weight="fill" />
          {creating ? "Starting..." : "New Run"}
        </button>
        <Link
          href={`/test-execution/${suite.publicToken}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
        >
          <Clock size={13} weight="bold" /> History
        </Link>
      </div>
    </div>
  );
}

export function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress >= 100 ? "#10b981" : "#3b82f6"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-800">{progress}%</span>
      </div>
    </div>
  );
}
