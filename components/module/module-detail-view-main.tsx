"use client";

import { type ReactNode, type RefObject } from "react";
import { Paperclip } from "@phosphor-icons/react";
import { renderFieldValue, type FieldConfig } from "@/components/module/module-detail-field-renderer";
import { ActivityTab, renderEvidence } from "@/components/module/module-view-modal-parts";
import type { TableRow } from "@/components/module/module-workspace-table-row";

export function ModuleDetailViewMain({
  row,
  module,
  contentFields,
  fieldIcons,
  setLightboxSrc,
  activityRef,
}: {
  row: TableRow;
  module: string;
  contentFields: FieldConfig[];
  fieldIcons: Record<string, ReactNode>;
  setLightboxSrc: (src: string) => void;
  activityRef: RefObject<HTMLDivElement | null>;
}) {
  const evidenceField = contentFields.find((f) => f.name === "evidence");
  const evidenceValue = evidenceField ? String(row[evidenceField.name] ?? "").trim() : "";
  const otherFields = contentFields.filter((f) => f.name !== "evidence");

  return (
    <div className="min-w-0 flex-1 space-y-6">
      {otherFields.map((field) => (
        <section key={field.name}>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            {fieldIcons[field.name]}
            {field.label}
          </h3>
          {renderFieldValue(field, row, setLightboxSrc)}
        </section>
      ))}

      <section>
        <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <Paperclip size={16} className="text-gray-400" />
          Attachments
        </h3>
        {evidenceValue ? (
          renderEvidence(evidenceValue, setLightboxSrc)
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
            <p className="text-xs font-semibold text-gray-500">No attachments yet</p>
            <p className="text-[11px] text-gray-400">Screenshots or recordings can be added here</p>
          </div>
        )}
      </section>

      <section ref={activityRef} className="border-t border-gray-100 pt-4">
        <ActivityTab module={module} itemId={row.id} />
      </section>
    </div>
  );
}
