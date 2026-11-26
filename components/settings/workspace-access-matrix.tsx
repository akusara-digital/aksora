"use client";

import { ShieldCheck } from "@phosphor-icons/react";

export function WorkspaceAccessMatrix() {
  return (
    <div className="border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Role-Based Module Access Matrix</h3>
          <p className="mt-0.5 text-xs text-slate-500">Default workspace permissions and operational scope across team roles</p>
        </div>
        <ShieldCheck size={20} className="text-blue-600" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500">
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Test Management</th>
              <th className="py-2.5 px-3">Bug Tracking</th>
              <th className="py-2.5 px-3">Tasks &amp; Sprints</th>
              <th className="py-2.5 px-3">Deployments</th>
              <th className="py-2.5 px-3">Settings &amp; Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            <tr>
              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Workspace Admin
              </td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Full Access</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Full Access</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Full Access</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Full Access</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Full Access</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> QA Engineer
              </td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Manage &amp; Execute</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Report &amp; Verify</td>
              <td className="py-2.5 px-3 text-slate-600">Read &amp; Link</td>
              <td className="py-2.5 px-3 text-slate-600">View Release Notes</td>
              <td className="py-2.5 px-3 text-slate-400">View Only</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Product Manager
              </td>
              <td className="py-2.5 px-3 text-slate-600">View &amp; Review</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Triage &amp; Prioritize</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Plan &amp; Manage</td>
              <td className="py-2.5 px-3 text-slate-600">Approve &amp; View</td>
              <td className="py-2.5 px-3 text-slate-400">View Only</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Engineer (FE / BE / Fullstack)
              </td>
              <td className="py-2.5 px-3 text-slate-600">View &amp; Reference</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Resolve &amp; Update</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Execute &amp; Log</td>
              <td className="py-2.5 px-3 text-emerald-600 font-semibold">Create &amp; Deploy</td>
              <td className="py-2.5 px-3 text-slate-400">No Access</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> AI Agent / Automation
              </td>
              <td className="py-2.5 px-3 text-slate-600">Run Automation</td>
              <td className="py-2.5 px-3 text-slate-600">Duplicate Check</td>
              <td className="py-2.5 px-3 text-slate-600">Git Link / PR Sync</td>
              <td className="py-2.5 px-3 text-slate-400">No Access</td>
              <td className="py-2.5 px-3 text-slate-400">API Key Scoped</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
