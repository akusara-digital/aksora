"use client";

import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/utils";
import { renderFieldValue, type FieldConfig } from "@/components/module/module-detail-field-renderer";
import type { TableRow } from "@/components/module/module-workspace-table-row";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function getAvatarColor(name: string) {
  const charCode = name.charCodeAt(0) + name.length;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
}

function SidebarRow({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
        {icon}
        {label}
      </span>
      <span className="text-right text-xs font-semibold text-gray-800">{children}</span>
    </div>
  );
}

export function ModuleDetailViewSidebar({
  row,
  metadataFields,
  fieldIcons,
  setLightboxSrc,
}: {
  row: TableRow;
  metadataFields: FieldConfig[];
  fieldIcons: Record<string, ReactNode>;
  setLightboxSrc: (src: string) => void;
}) {
  const createdBy = String(row.createdBy ?? row.assignee ?? "").trim();
  const createdAt = row.createdAt ? String(row.createdAt) : "";
  const updatedAt = row.updatedAt ? String(row.updatedAt) : "";

  return (
    <aside className="w-full shrink-0 border-gray-200 lg:w-72 lg:border-l lg:pl-5">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-900">Details</h3>
      <div className="divide-y divide-gray-100">
        {metadataFields.map((field) => (
          <SidebarRow key={field.name} label={field.label} icon={fieldIcons[field.name]}>
            {renderFieldValue(field, row, setLightboxSrc)}
          </SidebarRow>
        ))}
      </div>

      {(createdBy || createdAt || updatedAt) && (
        <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100 pt-1">
          {createdBy && (
            <SidebarRow label="Created by">
              <span className="inline-flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${getAvatarColor(createdBy)}`}>
                  {createdBy.slice(0, 1).toUpperCase()}
                </span>
                {createdBy}
              </span>
            </SidebarRow>
          )}
          {createdAt && <SidebarRow label="Created at">{formatDateTime(createdAt)}</SidebarRow>}
          {updatedAt && <SidebarRow label="Updated at">{formatDateTime(updatedAt)}</SidebarRow>}
        </div>
      )}
    </aside>
  );
}
