"use client";

import { cn, formatDisplayText, formatDuration, calculateDurationFromTime } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roles";
import { HighlightText } from "@/components/shared/highlight-text";
import { Badge } from "@/components/shared/badge";
import { renderNotes, renderEvidence } from "@/components/module/module-view-modal-parts";
import type { TableRow } from "@/components/module/module-workspace-table-row";

export type FieldConfig = {
  name: string;
  label: string;
  kind: string;
  options?: Array<{ label: string; value: string }>;
};

/** Fields that should render as badges */
export const BADGE_FIELDS = ["status", "priority", "severity", "bugType", "typeCase", "environment", "result"];

/** Fields considered "metadata" (short, shown in the Details sidebar) */
export const METADATA_FIELDS = ["project", "projectName", "sprint", "date", "startDate", "endDate", "startTime", "endTime", "durationMinutes", "assignee", "tester", "developer", "version", "tcId", "code", "caseName", "email", "role", "skills", "category", "module", "moduleName", "feature", "relatedFeature", "suggestedDev", "createdBy", "relatedItems", "traceability", "testPlanId", "testPlanTitle", "testSuiteId", "attendees", "whatTested"];

export function renderFieldValue(
  field: FieldConfig,
  row: TableRow,
  setLightboxSrc: (src: string) => void,
) {
  const rawVal = String(row[field.name] ?? "");
  const value = (rawVal === "undefined" || rawVal === "UNDEFINED" || rawVal === "null") ? "" : rawVal;
  const displayValue =
    field.kind === "select"
      ? field.options?.find(
          (opt) => opt.value === value || opt.label.toLowerCase() === value.toLowerCase(),
        )?.label ?? formatDisplayText(value)
      : value;

  // Badge fields (status, priority, etc.)
  if (BADGE_FIELDS.includes(field.name)) {
    return <Badge value={value} displayValue={displayValue} />;
  }

  // Evidence with image preview
  if (field.name === "evidence") {
    return renderEvidence(displayValue, setLightboxSrc);
  }

  // Role field
  if (field.name === "role") {
    return <HighlightText text={getRoleLabel(String(row[field.name] ?? ""))} query="" />;
  }

  // Duration field
  if (field.name === "durationMinutes") {
    const dur = (value as string | number) || (row.startTime && row.endTime ? calculateDurationFromTime(row.startTime, row.endTime) : 0);
    const text = formatDuration(dur);
    return (
      <p className="text-xs font-semibold text-gray-800">
        <HighlightText text={text} query="" />
      </p>
    );
  }

  // Notes with structured rendering
  if (field.name === "notes") {
    return renderNotes(displayValue || "-");
  }

  // Long text fields
  const isLong = field.kind === "textarea" || value.length > 120 || ["description", "notes", "content", "scope", "goal", "preconditions", "stepsToReproduce", "expectedResult", "actualResult", "actionItems", "testStep", "preCondition"].includes(field.name);

  return (
    <p className={cn("whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-800", !isLong && "font-semibold")}>
      <HighlightText text={displayValue || "-"} query="" />
    </p>
  );
}
