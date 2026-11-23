"use client";

import Link from "next/link";
import {
  ClipboardText,
  Play,
  ArrowSquareOut,
  FolderSimple,
  Clock,
  Plus,
} from "@phosphor-icons/react";
import { formatDate, codeFromId } from "@/lib/utils";
import { ProjectData, TestPlanItem, TestSuiteItem } from "./project-hub-types";

interface ProjectHubTestsTabProps {
  project: ProjectData;
  testPlans: TestPlanItem[];
  testSuites: TestSuiteItem[];
}

export function ProjectHubTestsTab({
  project,
  testPlans,
  testSuites,
}: ProjectHubTestsTabProps) {
  return (
    <div className="space-y-6">
      {/* ── Test Plans Section ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ClipboardText size={18} weight="bold" className="text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Test Plans</h3>
              <p className="text-[11px] text-slate-500">
                Organized test plans and scope for releases and sprints
              </p>
            </div>
          </div>
          <Link
            href={`/test-plans?project=${encodeURIComponent(project.name)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition"
          >
            <Plus size={13} weight="bold" />
            New Test Plan
          </Link>
        </div>

        {testPlans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">No test plans found for this project.</p>
            <Link
              href={`/test-plans?project=${encodeURIComponent(project.name)}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus size={13} weight="bold" />
              Create First Plan
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {testPlans.map((plan) => (
              <div
                key={plan.id}
                className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {codeFromId("PLAN", plan.id)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700">
                      {plan.status}
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                    {plan.title}
                  </h4>

                  {plan.sprint && (
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Sprint: <strong className="text-slate-700">{plan.sprint}</strong>
                    </p>
                  )}

                  {plan.scope && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                      {plan.scope}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={11} weight="bold" />
                    {formatDate(plan.updatedAt)}
                  </span>
                  <Link
                    href={`/test-plans/${plan.publicToken || plan.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    View Plan
                    <ArrowSquareOut size={12} weight="bold" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Test Suites Section ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <FolderSimple size={18} weight="bold" className="text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Test Suites</h3>
              <p className="text-[11px] text-slate-500">
                Executable suites containing test cases ready for execution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/test-cases?project=${encodeURIComponent(project.name)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Test Cases Library
            </Link>
            <Link
              href={`/test-suites?project=${encodeURIComponent(project.name)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition"
            >
              <Plus size={13} weight="bold" />
              New Suite
            </Link>
          </div>
        </div>

        {testSuites.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">No test suites created for this project yet.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {testSuites.map((suite) => (
              <div
                key={suite.id}
                className="group flex flex-col gap-2 py-3.5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between px-2 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {codeFromId("SUITE", suite.id)}
                    </span>
                    <Link
                      href={`/test-suites/${suite.publicToken || suite.id}`}
                      className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition"
                    >
                      {suite.title}
                    </Link>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    {suite.assignee && (
                      <span>
                        Assignee: <strong className="text-slate-600">{suite.assignee}</strong>
                      </span>
                    )}
                    <span>Updated {formatDate(suite.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700">
                    {suite.status || "draft"}
                  </span>
                  <Link
                    href={`/test-suites/${suite.publicToken || suite.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Details
                  </Link>
                  <Link
                    href={`/test-execution/${suite.publicToken || suite.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    <Play size={12} weight="bold" />
                    Run
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
