"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { ModuleWorkspaceFormField, type FieldOption, type FormField } from "@/components/module/module-workspace-form-field";
import type { ModuleKey } from "@/lib/modules";
import { getRequiredFieldErrors } from "@/lib/form-validation";
import { AiEnhanceBugButton } from "@/components/bugs/ai-enhance-bug-button";
import { CaretRight, CheckCircle } from "@phosphor-icons/react";

type Row = Record<string, unknown> & { id?: string | number };
type DuplicateRow = { id: string | number; code: string; title: string; status: string };

type ModuleWorkspaceFormProps = {
 module: ModuleKey;
 shortTitle: string;
 fields: FormField[];
 editingRow: Row | null;
 hiddenFields: string[];
 fieldIcons: Record<string, ReactNode>;
 fieldErrors: Record<string, string>;
 setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
 canAdd: boolean;
 canEdit: boolean;
 pending: boolean;
 isViewer: boolean;
 relatedOptions: Record<string, FieldOption[]>;
 selectValues: Record<string, string>;
 openSelectField: string | null;
 setOpenSelectField: (value: string | null) => void;
 setSelectValues: Dispatch<SetStateAction<Record<string, string>>>;
 duplicates: DuplicateRow[];
 sprintDuplicate: boolean;
 lastSprint: string | null;
 dateWarnings: Record<string,"past" |"future">;
 setDateWarnings: Dispatch<SetStateAction<Record<string,"past" |"future">>>;
 onFormChange: () => void;
 onSubmit: (formData: FormData) => void;
 onCancel: () => void;
 checkDuplicates: (title: string) => void;
 checkSprintDuplicate: (sprint: string) => void;
 versionSequenceLabel?: string;
 versionSequenceDefaultValue?: string;
};

export function ModuleWorkspaceForm({
 module,
 shortTitle,
 fields,
 editingRow,
 hiddenFields,
 fieldIcons,
 fieldErrors,
  setFieldErrors,
  canAdd,
  canEdit,
  pending,
  relatedOptions,
  selectValues,
 openSelectField,
 setOpenSelectField,
 setSelectValues,
 duplicates,
 sprintDuplicate,
 lastSprint,
 dateWarnings,
 setDateWarnings,
 onFormChange,
 onSubmit,
 onCancel,
 checkDuplicates,
 checkSprintDuplicate,
 versionSequenceLabel,
 versionSequenceDefaultValue,
}: ModuleWorkspaceFormProps) {
  const isBugModule = module === "bugs";
  const isWorkLogModule = module === "work-logs";
  const isTaskModule = module === "tasks";

  const [showTaskDetails, setShowTaskDetails] = useState(() => {
    if (!editingRow) return false;
    return Boolean(
      editingRow.startDate ||
      editingRow.endDate ||
      editingRow.relatedFeature ||
      editingRow.durationMinutes ||
      editingRow.acceptanceCriteria ||
      editingRow.evidence,
    );
  });
  const fieldByName = new Map(fields.map((f) => [f.name, f]));

  const renderField = (name: string, customSpanClass?: string) => {
    const field = fieldByName.get(name);
    if (!field || hiddenFields.includes(name)) return null;
    const spanClass = customSpanClass ?? (
      field.span === 3 ? "col-span-full" :
      field.span === 2 ? "md:col-span-2" :
      "md:col-span-1"
    );

    return (
      <label key={field.name} className={cn("flex self-start flex-col gap-1.5 w-full", spanClass)}>
        <ModuleWorkspaceFormField
          module={module}
          field={field}
          editingRow={editingRow}
          fieldIcons={fieldIcons}
          fieldError={fieldErrors[field.name]}
          relatedOptions={relatedOptions}
          selectValues={selectValues}
          openSelectField={openSelectField}
          setOpenSelectField={setOpenSelectField}
          setSelectValues={setSelectValues}
          duplicates={duplicates}
          sprintDuplicate={sprintDuplicate}
          lastSprint={lastSprint}
          dateWarnings={dateWarnings}
          setDateWarnings={setDateWarnings}
          checkDuplicates={checkDuplicates}
          checkSprintDuplicate={checkSprintDuplicate}
          versionSequenceLabel={versionSequenceLabel}
          versionSequenceDefaultValue={versionSequenceDefaultValue}
        />
      </label>
    );
  };

  return (
    <div id="module-form-section">
      <form
        id={`${module}-form`}
        noValidate
        className="px-4 py-6 sm:px-6 md:px-10"
        onChange={onFormChange}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canAdd && !editingRow) return;
          if (!canEdit && editingRow) return;
          const formData = new FormData(event.currentTarget);
          const visibleFields = fields
            .filter((field) => !(module === "test-plans" && field.name === "assignee"))
            .filter((field) => !hiddenFields.includes(field.name));
          const requiredErrors = getRequiredFieldErrors(visibleFields, formData);
          if (Object.keys(requiredErrors).length > 0) {
            setFieldErrors(requiredErrors);
            return;
          }
          setFieldErrors({});
          onSubmit(formData);
        }}
      >
        {isBugModule ? (
          <div className="space-y-6">
            {/* Quick Triage Banner */}
            {!editingRow && (
              <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/70 p-3 sm:px-4 sm:py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-950 font-medium">
                      <strong className="font-bold text-emerald-900">Project Name</strong> is the only mandatory field. All other fields are optional.
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 hidden sm:inline">
                    Quick Defect Entry
                  </span>
                </div>
              </div>
            )}

            {/* Target & Scope */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Target & Scope
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
                {renderField("project")}
                {renderField("module")}
                {renderField("bugType")}
              </div>
            </div>

            {/* Issue Summary */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Issue Summary
              </div>
              <div className="w-full">
                {renderField("title", "w-full")}
              </div>
            </div>

            {/* Diagnostics & Reproduction */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Diagnostics & Reproduction
              </div>
              <div className="space-y-4">
                {renderField("preconditions", "w-full")}
                {renderField("stepsToReproduce", "w-full")}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                  {renderField("expectedResult", "w-full")}
                  {renderField("actualResult", "w-full")}
                </div>
              </div>
            </div>

            {/* Classification & Assignment */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Classification & Assignment
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
                {renderField("severity")}
                {renderField("priority")}
                {renderField("status")}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start pt-1">
                {renderField("suggestedDev")}
                {renderField("relatedItems")}
              </div>
            </div>

            {/* Evidence & Attachments */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Evidence & Attachments
              </div>
              <div className="w-full">
                {renderField("evidence", "w-full")}
              </div>
            </div>

            {/* Dynamic fallback for any extra custom fields */}
            {(() => {
              const handledNames = new Set([
                "project", "module", "bugType", "title",
                "preconditions", "stepsToReproduce", "expectedResult", "actualResult",
                "severity", "priority", "status", "suggestedDev", "relatedItems", "evidence",
              ]);
              const otherFields = fields.filter((f) => !handledNames.has(f.name) && !hiddenFields.includes(f.name));
              if (otherFields.length === 0) return null;
              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start pt-2">
                  {otherFields.map((f) => renderField(f.name))}
                </div>
              );
            })()}
          </div>
        ) : isWorkLogModule ? (
          <div className="space-y-6">
            {/* Context & Project */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Context & Classification
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
                {renderField("project")}
                {renderField("category")}
                {renderField("date")}
              </div>
            </div>

            {/* Time & Duration Tracking */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Time & Duration
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                  {/* Left: Time Range */}
                  <div className="space-y-3 lg:col-span-5">
                    <div className="grid grid-cols-2 gap-3">
                      {renderField("startTime", "w-full")}
                      {renderField("endTime", "w-full")}
                    </div>
                    <div className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-[11px] text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                      💡 <strong>Smart Sync:</strong> Setting start & end times calculates duration. Picking a preset calculates end time.
                    </div>
                  </div>

                  {/* Vertical Divider on Desktop */}
                  <div className="hidden lg:flex lg:col-span-1 lg:justify-center lg:self-stretch">
                    <div className="w-px h-full min-h-[120px] bg-slate-200 dark:bg-zinc-800" />
                  </div>

                  {/* Right: Duration Widget */}
                  <div className="lg:col-span-6">
                    {renderField("durationMinutes", "w-full")}
                  </div>
                </div>
              </div>
            </div>

            {/* Work Details & Deliverables */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Work Details & Deliverables
              </div>
              <div className="space-y-4">
                {renderField("description", "w-full")}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                  {renderField("output", "w-full")}
                  {renderField("notes", "w-full")}
                </div>
              </div>
            </div>

            {/* Dynamic fallback for any extra custom fields */}
            {(() => {
              const handledNames = new Set([
                "project", "category", "date",
                "startTime", "endTime", "durationMinutes",
                "description", "output", "notes",
              ]);
              const otherFields = fields.filter((f) => !handledNames.has(f.name) && !hiddenFields.includes(f.name));
              if (otherFields.length === 0) return null;
              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start pt-2">
                  {otherFields.map((f) => renderField(f.name))}
                </div>
              );
            })()}
          </div>
        ) : isTaskModule ? (
          <div className="space-y-5">
            {/* Core Task Info */}
            <div className="space-y-4">
              {/* Title */}
              <div className="w-full">
                {renderField("title", "w-full")}
              </div>

              {/* Attributes Grid: Project, Type, Priority, Status, Assignee */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:items-start">
                {renderField("project")}
                {renderField("category")}
                {renderField("priority")}
                {renderField("status")}
                {renderField("assignee")}
              </div>

              {/* Description */}
              <div className="w-full">
                {renderField("description", "w-full")}
              </div>
            </div>

            {/* Collapsible Additional Details */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTaskDetails((prev) => !prev)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition select-none"
              >
                <CaretRight
                  size={14}
                  weight="bold"
                  className={cn("transition-transform duration-150", showTaskDetails && "rotate-90")}
                />
                <span>
                  {showTaskDetails
                    ? "Hide additional details"
                    : "+ Additional Details (Dates, Duration, Feature, Acceptance Criteria, Evidence)"}
                </span>
              </button>

              <div className={cn("mt-4 space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all", !showTaskDetails && "hidden")}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                  {renderField("relatedFeature", "w-full")}
                  {renderField("evidence", "w-full")}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:items-start">
                  {renderField("startDate")}
                  {renderField("endDate")}
                  {renderField("durationMinutes")}
                </div>

                <div className="w-full">
                  {renderField("acceptanceCriteria", "w-full")}
                </div>
              </div>
            </div>

            {/* Dynamic fallback for any extra custom fields */}
            {(() => {
              const handledNames = new Set([
                "title", "project", "category", "priority", "status", "assignee", "description",
                "relatedFeature", "evidence", "startDate", "endDate", "durationMinutes", "acceptanceCriteria",
              ]);
              const otherFields = fields.filter((f) => !handledNames.has(f.name) && !hiddenFields.includes(f.name));
              if (otherFields.length === 0) return null;
              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start pt-2">
                  {otherFields.map((f) => renderField(f.name))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
            {fields
              .filter((field) => !(module === "test-plans" && field.name === "assignee"))
              .filter((field) => !hiddenFields.includes(field.name))
              .map((field) => {
                const spanClass =
                  field.span === 3 ? "md:col-span-3" :
                  field.span === 2 ? "md:col-span-2" :
                  "md:col-span-1";

                return (
                  <label key={field.name} className={cn("flex self-start flex-col gap-1.5", spanClass)}>
                    <ModuleWorkspaceFormField
                      module={module}
                      field={field}
                      editingRow={editingRow}
                      fieldIcons={fieldIcons}
                      fieldError={fieldErrors[field.name]}
                      relatedOptions={relatedOptions}
                      selectValues={selectValues}
                      openSelectField={openSelectField}
                      setOpenSelectField={setOpenSelectField}
                      setSelectValues={setSelectValues}
                      duplicates={duplicates}
                      sprintDuplicate={sprintDuplicate}
                      lastSprint={lastSprint}
                      dateWarnings={dateWarnings}
                      setDateWarnings={setDateWarnings}
                      checkDuplicates={checkDuplicates}
                      checkSprintDuplicate={checkSprintDuplicate}
                      versionSequenceLabel={versionSequenceLabel}
                      versionSequenceDefaultValue={versionSequenceDefaultValue}
                    />
                  </label>
                );
              })}
          </div>
        )}
  <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:pt-8 md:flex-row md:items-center md:justify-between">
 <div className="flex flex-wrap items-center gap-3">
 <button
 type="submit"
 disabled={pending}
 className={cn(
"h-10 rounded-lg px-8 text-sm font-bold text-white shadow-md transition-all duration-150 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50",
"bg-emerald-600 hover:bg-emerald-500",
 )}
 >
 {pending ?"Processing..." : editingRow ?`Save ${shortTitle.replace(/s$/i, "")}` :`Add ${shortTitle.replace(/s$/i, "")}`}
 </button>
 <button
 type="button"
 onClick={onCancel}
 className="h-10 rounded-lg bg-white border border-gray-200 px-5 text-sm font-bold text-gray-700 transition-all duration-150 hover:bg-gray-50"
 >
 Cancel
 </button>
 {module === "bugs" && <AiEnhanceBugButton onFormChange={onFormChange} />}
 </div>
 </div>
 </form>
 </div>
 );
}

