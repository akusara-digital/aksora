"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { FormFieldError } from "@/components/shared/form-field-error";
import { cn } from "@/lib/utils";
import type { FieldOption, FormField } from "@/components/module/module-workspace-form-field";
import { ProjectDropdownContent } from "@/components/projects/project-dropdown-content";

type Row = Record<string, unknown> & { id?: string | number };

type Props = {
 field: FormField;
 editingRow: Row | null;
 fieldError?: string;
 relatedOptions: Record<string, FieldOption[]>;
 selectValues: Record<string, string>;
 openSelectField: string | null;
 setOpenSelectField: (value: string | null) => void;
 setSelectValues: Dispatch<SetStateAction<Record<string, string>>>;
};

export function ModuleWorkspaceFormSelect({
  field,
  editingRow,
  fieldError,
  relatedOptions,
  selectValues,
  openSelectField,
  setOpenSelectField,
  setSelectValues,
}: Props) {
  const selectedValue = selectValues[field.name] !== undefined ? selectValues[field.name] : String(editingRow?.[field.name] ?? "");
  const isLocked = Boolean(field.readonly);
  const placeholderText = field.placeholder || `Select ${field.label}`;
  const options = relatedOptions[field.name] ?? field.options ?? [];

  if (isLocked) {
    return (
      <div className="flex min-h-10 w-full items-center rounded-lg border border-blue-200/80 bg-blue-50/60 px-4 py-2.5 text-sm font-medium text-blue-900 cursor-not-allowed select-none transition dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
        {(() => {
          const current = options.find((opt) => opt.value === selectedValue);
          return current?.label || String(editingRow?.[field.name] ?? "-") || "-";
        })()}
        <input type="hidden" name={field.name} value={selectedValue} readOnly />
      </div>
    );
  }

  return (
    <div className="space-y-0" data-custom-select>
      <div className="relative">
        <input type="hidden" name={field.name} value={selectedValue} readOnly />
        <button
          type="button"
          onClick={() => setOpenSelectField(openSelectField === field.name ? null : field.name)}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left text-sm text-gray-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10",
            fieldError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-500/10" : "border-gray-200",
          )}
        >
          <span className="whitespace-normal break-words">
            {(() => {
              const current = options.find((opt) => opt.value === selectedValue);
              return current?.label || (selectedValue ? selectedValue : placeholderText);
            })()}
          </span>
          <CaretDown size={14} weight="bold" className="shrink-0 text-gray-400" />
        </button>

        {openSelectField === field.name && (
          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg",
              field.name === "project" ? "overflow-hidden" : "max-h-56 overflow-y-auto overscroll-contain"
            )}
          >
            {field.name === "project" ? (
              <ProjectDropdownContent
                options={options.map((o) => ({ label: o.label, value: o.value }))}
                selectedValue={selectedValue}
                onSelect={(val) => {
                  setSelectValues((p) => ({ ...p, [field.name]: val }));
                  setOpenSelectField(null);
                }}
                onClose={() => setOpenSelectField(null)}
                title=""
                emptyTitle="No projects found"
                emptySubtitle="Create a project first."
              />
            ) : options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectValues((p) => ({ ...p, [field.name]: option.value }));
                    setOpenSelectField(null);
                  }}
                  className={cn(
                    "block w-full px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700",
                    selectedValue === option.value && "bg-emerald-50 text-emerald-700 font-semibold",
                  )}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                <p>No options available.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <FormFieldError message={fieldError} />
    </div>
  );
}

