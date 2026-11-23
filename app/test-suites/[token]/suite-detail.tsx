"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatDate, formatDisplayText } from "@/lib/utils";
import { Badge } from "@/components/shared/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ModalShell } from "@/components/ui/modal-shell";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "@/components/ui/toast";
import { TestCaseImportButton } from "@/components/test-management/test-case-import";
import { TestmoImportButton } from "@/components/test-management/testmo-import-modal";
import { CopyCasesButton } from "@/components/test-management/copy-cases-modal";
import {
  Play,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  ArrowLeft,
  ArrowSquareOut,
  User,
  ClipboardText,
  CalendarBlank,
  FunnelSimple,
  MagnifyingGlass,
  Checks,
  TrendUp,
  TrendDown,
  Minus,
  Tag,
  FilePdf,
  PencilSimple,
  Trash,
  Check,
} from "@phosphor-icons/react";

type TestCase = {
 id: number;
 tcId: string;
 caseName: string;
 assignee?: string;
 typeCase: string;
 status: string;
 priority: string;
 actualResult: string;
 preCondition: string;
 testStep: string;
 expectedResult: string;
};

type Session = {
 id: number;
 date: string;
 tester: string;
 sprint: string;
 project: string;
 totalCases: number;
 passed: number;
 failed: number;
 blocked: number;
 result: string;
 notes: string;
};

type Plan = {
 id: string;
 title: string;
 project: string;
 sprint: string;
 publicToken: string;
};

type Suite = {
 id: string;
 title: string;
 status: string;
 assignee: string;
 notes: string;
 publicToken: string;
 testPlanId: string;
};

const STATUS_PILL: Record<string, string> = {
 Passed:"text-emerald-600 bg-emerald-50 border-emerald-200",
 Failed:"text-rose-600 bg-rose-50 border-rose-200",
 Blocked:"text-amber-600 bg-amber-50 border-amber-200",
 Pending:"text-slate-500 bg-slate-50 border-slate-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
 Passed: <CheckCircle size={12} weight="fill" className="text-emerald-500" />,
 Failed: <XCircle size={12} weight="fill" className="text-rose-500" />,
 Blocked: <Warning size={12} weight="fill" className="text-amber-500" />,
 Pending: <Clock size={12} weight="fill" className="text-slate-400" />,
};

const PRIORITY_DOT: Record<string, string> = {
 High:"bg-rose-500",
 Medium:"bg-amber-400",
 Low:"bg-slate-300",
};

const RESULT_STYLE: Record<string, string> = {
 pass:"text-emerald-600 bg-emerald-50 border-emerald-200",
 fail:"text-rose-600 bg-rose-50 border-rose-200",
 blocked:"text-amber-600 bg-amber-50 border-amber-200",
};

export function SuiteDetail({
 suite,
 cases,
 sessions,
 plan,
}: {
 suite: Suite;
 cases: TestCase[];
 sessions: Session[];
 plan: Plan | null;
}) {
 const router = useRouter();
 const [currentSuite, setCurrentSuite] = useState<Suite>(suite);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [deleting, setDeleting] = useState(false);

 const [editTitle, setEditTitle] = useState(suite.title || "");
 const [editAssignee, setEditAssignee] = useState(suite.assignee || "");
 const [editStatus, setEditStatus] = useState(suite.status || "Active");
 const [editNotes, setEditNotes] = useState(suite.notes || "");
 const [submittingEdit, setSubmittingEdit] = useState(false);
 const [editError, setEditError] = useState<string | null>(null);

 useEffect(() => {
   setCurrentSuite(suite);
   setEditTitle(suite.title || "");
   setEditAssignee(suite.assignee || "");
   setEditStatus(suite.status || "Active");
   setEditNotes(suite.notes || "");
 }, [suite]);

 const resetEditForm = (s: Suite) => {
   setEditTitle(s.title || "");
   setEditAssignee(s.assignee || "");
   setEditStatus(s.status || "Active");
   setEditNotes(s.notes || "");
   setEditError(null);
 };

 const handleEditSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!editTitle.trim()) {
     setEditError("Suite title is required.");
     return;
   }
   setSubmittingEdit(true);
   setEditError(null);

   const updates = {
     title: editTitle.trim(),
     assignee: editAssignee.trim(),
     status: editStatus,
     notes: editNotes.trim(),
   };

   try {
     const res = await fetch("/api/items/test-suites", {
       method: "PATCH",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         id: currentSuite.id,
         entry: updates,
         ...updates,
       }),
     });

     if (!res.ok) {
       const data = await res.json().catch(() => ({}));
       throw new Error(data.error || "Failed to update test suite");
     }

     toast("Test suite updated successfully", "success");
     setCurrentSuite((prev) => ({ ...prev, ...updates }));
     setShowEditModal(false);
     router.refresh();
   } catch (err) {
     setEditError(err instanceof Error ? err.message : "Failed to update test suite.");
   } finally {
     setSubmittingEdit(false);
   }
 };

 const handleDeleteSuite = async () => {
   setDeleting(true);
   try {
     const res = await fetch(`/api/items/test-suites?id=${currentSuite.id}`, {
       method: "DELETE",
     });
     if (!res.ok) {
       const data = await res.json().catch(() => ({}));
       throw new Error(data.error || "Failed to delete test suite");
     }
     toast("Test suite deleted", "success");
     router.push("/test-cases");
   } catch (err) {
     toast(err instanceof Error ? err.message : "Failed to delete test suite", "error");
     setDeleting(false);
     setShowDeleteModal(false);
   }
 };

 const [filterStatus, setFilterStatus] = useState("All");
 const [search, setSearch] = useState("");
 const [activeTab, setActiveTab] = useState<"cases" |"history">("cases");

 const total = cases.length;
 const passed = cases.filter((c) => c.status ==="Passed").length;
 const failed = cases.filter((c) => c.status ==="Failed").length;
 const blocked = cases.filter((c) => c.status ==="Blocked").length;
 const pending = cases.filter((c) => c.status ==="Pending" || !c.status).length;
 const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
 const passW = total > 0 ? (passed / total) * 100 : 0;
 const failW = total > 0 ? (failed / total) * 100 : 0;
 const blockW = total > 0 ? (blocked / total) * 100 : 0;

 const trend = useMemo(() => {
 if (sessions.length < 2) return null;
 const last = Number(sessions[0].passed) / Math.max(Number(sessions[0].totalCases), 1);
 const prev = Number(sessions[1].passed) / Math.max(Number(sessions[1].totalCases), 1);
 if (last > prev) return"up";
 if (last < prev) return"down";
 return"flat";
 }, [sessions]);

 const filteredCases = useMemo(() => {
 return cases.filter((c) => {
 if (filterStatus !=="All" && c.status !== filterStatus) return false;
 if (search) {
 const q = search.toLowerCase();
 return c.caseName?.toLowerCase().includes(q) || c.tcId?.toLowerCase().includes(q);
 }
 return true;
 });
 }, [cases, filterStatus, search]);

 return (
 <div className="space-y-6">

 <Breadcrumb crumbs={[
 { label:"Test Management", href:"/test-cases" },
 { label:"Test Suites", href:"/test-suites" },
 { label: currentSuite.title },
 ]} />

 {/* ── Hero ── */}
 <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
 <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400" />
 <div className="p-6 md:p-8">
 <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

 {/* Left */}
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-3">
 <Link href="/test-suites" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition">
 <ArrowLeft size={15} weight="bold" />
 </Link>
 <Badge value={currentSuite.status} />
 <button
  type="button"
  onClick={() => {
    resetEditForm(currentSuite);
    setShowEditModal(true);
  }}
  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 h-8 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs cursor-pointer"
  title="Edit / Rename Suite"
 >
  <PencilSimple size={13} weight="bold" />
  Edit Suite
 </button>
 <button
  type="button"
  onClick={() => setShowDeleteModal(true)}
  className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 h-8 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition shadow-2xs cursor-pointer"
  title="Delete Suite"
 >
  <Trash size={13} weight="bold" />
  Delete Suite
 </button>
 {trend ==="up" && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><TrendUp size={14} weight="bold" />Improving</span>}
 {trend ==="down" && <span className="flex items-center gap-1 text-xs font-bold text-rose-500"><TrendDown size={14} weight="bold" />Declining</span>}
 {trend ==="flat" && <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Minus size={14} weight="bold" />Stable</span>}
 </div>

 <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight mb-4">
 {currentSuite.title}
 </h1>

 <div className="flex flex-wrap gap-4 text-sm">
 {plan && (
 <Link href={`/test-plans/${plan.publicToken}`} className="flex items-center gap-1.5 text-blue-600 hover:underline font-semibold">
 <ClipboardText size={13} weight="bold" />
 {plan.title}
 </Link>
 )}
 {plan?.project && (
 <Link href={`/test-plans/projects/${encodeURIComponent(plan.project)}`} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition">
 <Tag size={13} weight="bold" className="text-blue-500" />
 <span className="font-semibold text-slate-700">{plan.project}</span>
 </Link>
 )}
 {currentSuite.assignee && (
 <span className="flex items-center gap-1.5 text-slate-500">
 <User size={13} weight="bold" className="text-slate-400" />
 <span className="font-semibold text-slate-700">{currentSuite.assignee}</span>
 </span>
 )}
 {sessions.length > 0 && (
 <span className="flex items-center gap-1.5 text-slate-500">
 <CalendarBlank size={13} weight="bold" className="text-slate-400" />
 <span className="font-semibold text-slate-700">
 Last run {formatDate(sessions[0].date)}
 </span>
 </span>
 )}
 </div>

 {currentSuite.notes && (
 <p className="mt-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4 max-w-xl">
 {currentSuite.notes}
 </p>
 )}
 </div>

 {/* Right: ring */}
 <div className="shrink-0">
 <div className="relative flex h-28 w-28 items-center justify-center">
 <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100" />
 {total > 0 && <>
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${passW} ${100 - passW}`} strokeLinecap="round" />
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f43f5e" strokeWidth="3" strokeDasharray={`${failW} ${100 - failW}`} strokeDashoffset={`${-passW}`} strokeLinecap="round" />
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${blockW} ${100 - blockW}`} strokeDashoffset={`${-(passW + failW)}`} strokeLinecap="round" />
 </>}
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-2xl font-black text-slate-900">{successRate}%</span>
 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pass</span>
 </div>
 </div>
 </div>
 </div>

 {/* Progress bar + legend */}
 {total > 0 && (
 <div className="mt-6">
 <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${passW}%` }} className="bg-emerald-500 transition-all" />
 <div style={{ width:`${failW}%` }} className="bg-rose-500 transition-all" />
 <div style={{ width:`${blockW}%` }} className="bg-amber-400 transition-all" />
 </div>
 <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-400">
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{passed} Passed</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{failed} Failed</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{blocked} Blocked</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />{pending} Pending</span>
 <span className="ml-auto font-bold text-slate-500">{total} cases · {sessions.length} sessions</span>
 </div>
 </div>
 )}

 {/* Action buttons */}
 <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
 <Link
 href={`/test-execution/${suite.publicToken}`}
 className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-black text-white hover:bg-blue-600 transition"
 >
 <Play size={15} weight="fill" />
 Execute Suite
 </Link>
 <Link
 href={`/test-cases/detail/${suite.publicToken}`}
 className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 title="Edit test cases"
 >
 <ArrowSquareOut size={15} weight="bold" />
 Manage Cases
 </Link>
 <TestCaseImportButton suiteId={String(suite.id)} />
 <TestmoImportButton suiteId={String(suite.id)} />
 <CopyCasesButton suiteId={String(suite.id)} />
 <a
 href={`/api/test-suites/${suite.id}/export/pdf`}
 download
 className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 >
 <FilePdf size={15} weight="bold" />
 Export PDF
 </a>
 {plan && (
 <Link
 href={`/test-plans/${plan.publicToken}`}
 className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 >
 <ClipboardText size={15} weight="bold" />
 View Plan
 </Link>
 )}
 <button
   type="button"
   onClick={() => {
     resetEditForm(currentSuite);
     setShowEditModal(true);
   }}
   className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer"
 >
   <PencilSimple size={15} weight="bold" />
   Edit Suite
 </button>
 <button
   type="button"
   onClick={() => setShowDeleteModal(true)}
   className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer"
 >
   <Trash size={15} weight="bold" />
   Delete Suite
 </button>
 </div>
 </div>
 </div>

 {/* ── Tabs ── */}
 <div className="flex items-center gap-1 border-b border-slate-200">
 {([
 { key:"cases", label:`Test Cases (${total})` },
 { key:"history", label:`Session History (${sessions.length})` },
 ] as const).map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
"h-10 px-4 text-sm font-semibold border-b-2 transition",
 activeTab === tab.key
 ?"border-blue-600 text-blue-600"
 :"border-transparent text-slate-500 hover:text-slate-900"
 )}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* ── Test Cases tab ── */}
 {activeTab ==="cases" && (
 <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
 {/* Filter bar */}
 <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
 <div className="relative">
 <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search cases…"
 className="h-8 rounded-md border border-slate-200 bg-white pl-7 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
 />
 </div>
 <div className="flex items-center gap-1.5">
 <FunnelSimple size={12} className="text-slate-400" />
 {["All","Passed","Failed","Blocked","Pending"].map((s) => (
 <button
 key={s}
 onClick={() => setFilterStatus(s)}
 className={cn(
"h-7 rounded px-2.5 text-[11px] font-semibold transition",
 filterStatus === s
 ?"bg-slate-900 text-white"
 :"text-slate-500 hover:bg-slate-200"
 )}
 >{s}</button>
 ))}
 </div>
 <span className="ml-auto text-[11px] font-semibold text-slate-400">{filteredCases.length} cases</span>
 </div>

 {filteredCases.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
 <Checks size={32} weight="bold" />
 <p className="text-sm font-semibold">No cases found</p>
 </div>
 ) : (
 <div className="max-h-[480px] overflow-auto">
 <table className="w-full text-sm border-collapse">
 <thead className="sticky top-0 bg-slate-100 z-10">
 <tr className="border-b border-slate-200">
 <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-[80px]">ID</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Test Case Name</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden md:table-cell w-[160px]">Assignee</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden md:table-cell w-[110px]">Type</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden lg:table-cell w-[90px]">Priority</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-[120px]">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredCases.map((tc) => (
 <tr key={tc.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-5 py-3.5 whitespace-nowrap">
 <span className="font-mono text-xs font-bold text-slate-400">{tc.tcId}</span>
 </td>
 <td className="px-3 py-3.5 max-w-xs">
 <p className="truncate font-semibold text-slate-800">{tc.caseName}</p>
 {tc.actualResult && (
 <p className="truncate text-[11px] text-slate-400 mt-0.5">{tc.actualResult}</p>
 )}
 </td>
 <td className="px-3 py-3.5 hidden md:table-cell">
 <span className="text-xs text-slate-500">{tc.assignee || suite.assignee ||"Unassigned"}</span>
 </td>
 <td className="px-3 py-3.5 hidden md:table-cell">
 <span className="text-xs text-slate-500">{formatDisplayText(tc.typeCase)}</span>
 </td>
 <td className="px-3 py-3.5 hidden lg:table-cell">
 <div className="flex items-center gap-1.5">
 <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[tc.priority] ??"bg-slate-300")} />
 <span className="text-xs font-semibold text-slate-500">{formatDisplayText(tc.priority)}</span>
 </div>
 </td>
 <td className="px-3 py-3.5">
 <span className={cn(
"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold",
 STATUS_PILL[tc.status] ?? STATUS_PILL.Pending
 )}>
 {STATUS_ICON[tc.status] ?? STATUS_ICON.Pending}
 {formatDisplayText(tc.status ||"Pending")}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* ── Session History tab ── */}
 {activeTab ==="history" && (
 <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
 {sessions.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
 <CalendarBlank size={32} weight="bold" />
 <p className="text-sm font-semibold">No sessions recorded yet</p>
 <p className="text-xs">Execute this suite to start tracking history.</p>
 </div>
 ) : (
 <div className="max-h-[480px] overflow-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-slate-200 z-10">
 <tr className="border-b border-slate-100 bg-slate-50/60">
 <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Tester</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Sprint</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Stats</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[100px]">Result</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {sessions.map((s) => {
 const total = Number(s.totalCases) || 0;
 const sp = Number(s.passed) || 0;
 const sf = Number(s.failed) || 0;
 const sb = Number(s.blocked) || 0;
 const rate = total > 0 ? Math.round((sp / total) * 100) : 0;
 return (
 <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-5 py-3.5">
 <p className="font-semibold text-slate-800">{formatDate(s.date)}</p>
 </td>
 <td className="px-3 py-3.5">
 <div className="flex items-center gap-1.5">
 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs font-black">
 {s.tester?.[0]?.toUpperCase() ||"?"}
 </div>
 <span className="font-semibold text-slate-700">{s.tester ||"-"}</span>
 </div>
 </td>
 <td className="px-3 py-3.5 hidden sm:table-cell">
 <span className="text-xs text-slate-500">{s.sprint ||"-"}</span>
 </td>
 <td className="px-3 py-3.5">
 <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
 <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" />{sp}</span>
 <span className="flex items-center gap-1"><XCircle size={12} className="text-rose-500" />{sf}</span>
 <span className="flex items-center gap-1"><Warning size={12} className="text-amber-500" />{sb}</span>
 <span className="text-slate-300">·</span>
 <span>{rate}%</span>
 </div>
 {total > 0 && (
 <div className="mt-1.5 flex h-1 w-24 overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${(sp / total) * 100}%` }} className="bg-emerald-500" />
 <div style={{ width:`${(sf / total) * 100}%` }} className="bg-rose-500" />
 <div style={{ width:`${(sb / total) * 100}%` }} className="bg-amber-400" />
 </div>
 )}
 </td>
 <td className="px-3 py-3.5">
 <span className={cn(
"inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold capitalize",
 RESULT_STYLE[s.result] ?? RESULT_STYLE.blocked
 )}>
 {s.result ||"-"}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* ── Edit / Rename Suite Modal ── */}
 <ModalShell
   isOpen={showEditModal}
   onClose={() => setShowEditModal(false)}
   title="Edit / Rename Suite"
   description="Update suite title, assignee, status, and notes."
   icon={<PencilSimple size={20} weight="bold" className="text-blue-600" />}
   maxWidth="md"
 >
   <form onSubmit={handleEditSubmit} className="space-y-4">
     {editError && (
       <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
         {editError}
       </div>
     )}

     <div className="space-y-1.5">
       <label className="text-xs font-bold text-slate-700">
         Suite Title <span className="text-rose-500">*</span>
       </label>
       <input
         type="text"
         required
         value={editTitle}
         onChange={(e) => {
           setEditTitle(e.target.value);
           if (editError) setEditError(null);
         }}
         placeholder="e.g. Authentication & Authorization"
         className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
         autoFocus
       />
     </div>

     <div className="space-y-1.5">
       <label className="text-xs font-bold text-slate-700">Assignee</label>
       <input
         type="text"
         value={editAssignee}
         onChange={(e) => setEditAssignee(e.target.value)}
         placeholder="e.g. QA Engineer Name"
         className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
       />
     </div>

     <div className="space-y-1.5">
       <label className="text-xs font-bold text-slate-700">Status</label>
       <CustomSelect
         value={editStatus}
         onChange={setEditStatus}
         options={[
           { value: "Active", label: "Active", dot: "bg-emerald-500" },
           { value: "Draft", label: "Draft", dot: "bg-slate-400" },
           { value: "Completed", label: "Completed", dot: "bg-blue-500" },
           { value: "Archived", label: "Archived", dot: "bg-amber-500" },
         ]}
         className="h-10 rounded-xl"
       />
     </div>

     <div className="space-y-1.5">
       <label className="text-xs font-bold text-slate-700">Notes</label>
       <AutoResizeTextarea
         value={editNotes}
         onChange={(e) => setEditNotes(e.target.value)}
         rows={3}
         maxHeight={200}
         placeholder="Additional test suite guidelines, environment requirements, or notes..."
         className="p-3 text-xs rounded-xl"
       />
     </div>

     <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
       <button
         type="button"
         onClick={() => setShowEditModal(false)}
         disabled={submittingEdit}
         className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
       >
         Cancel
       </button>
       <button
         type="submit"
         disabled={submittingEdit || !editTitle.trim()}
         className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
       >
         <Check size={14} weight="bold" />
         {submittingEdit ? "Saving..." : "Save Changes"}
       </button>
     </div>
   </form>
 </ModalShell>

 {/* ── Delete Suite Confirmation ── */}
 <ConfirmModal
   isOpen={showDeleteModal}
   title={`Delete Test Suite: ${currentSuite.title || "Untitled"}`}
   message="Are you sure you want to delete this test suite? Associated test cases will also be removed. This action cannot be undone."
   type="danger"
   confirmText={deleting ? "Deleting..." : "Delete Suite"}
   cancelText="Cancel"
   onConfirm={handleDeleteSuite}
   onCancel={() => setShowDeleteModal(false)}
 />
 </div>
 );
}

