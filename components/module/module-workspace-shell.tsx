"use client";

import dynamic from"next/dynamic";
import { useRouter } from "next/navigation";
import { type Attachment } from"@/components/shared/attachment-uploader";
import { ModuleWorkspaceHeader } from"@/components/module/module-workspace-header";
import { ModuleWorkspaceTable } from"@/components/module/module-workspace-table";
import { ModuleWorkspaceForm } from"@/components/module/module-workspace-form";
import type { FormField } from"@/components/module/module-workspace-form-field";
import { ModuleMobileCards } from"@/components/module/module-mobile-cards";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from"react";
import { getModuleWorkspaceIcon } from"@/components/module/module-workspace-utils";
import type { Column, TableRow } from"@/components/module/module-workspace-table-row";
import type { ModuleKey } from"@/lib/modules";
import { BugModalModeSelector, type BugCreateMode } from "@/components/bugs/bug-modal-mode-selector";
import { BugModalHeader } from "@/components/bugs/bug-modal-header";
import { toast } from "@/components/ui/toast";
import type { IssueAgentTicketDraft } from "@/lib/ai-issue-agent";

const KanbanBoard = dynamic(() => import("@/components/module/kanban-board").then((module) => module.KanbanBoard), {
 ssr: false,
 loading: () => <div className="h-40  border border-gray-200 bg-gray-50" />,
});

const ViewModal = dynamic(() => import("@/components/module/module-view-modal").then((module) => module.ViewModal), {
 ssr: false,
 loading: () => null,
});

const ModuleWorkspaceModals = dynamic(
 () => import("@/components/module/module-workspace-modals").then((module) => module.ModuleWorkspaceModals),
 {
  ssr: false,
  loading: () => null,
 },
);

const FormDrawer = dynamic(() => import("@/components/shared/form-drawer").then((module) => module.FormDrawer), {
 ssr: false,
 loading: () => <div className="fixed inset-y-0 right-0 w-full max-w-lg border-l border-gray-200 bg-white" />,
});

const AiIssueAgentContent = dynamic(
  () => import("@/components/bugs/ai-issue-agent-content").then((module) => module.AiIssueAgentContent),
  { ssr: false }
);

const StreamlinedBugForm = dynamic(
  () => import("@/components/bugs/streamlined-bug-form").then((module) => module.StreamlinedBugForm),
  { ssr: false }
);

type Row = TableRow;

type WorkspaceConfig = {
 title: string;
 shortTitle: string;
 description: string;
 fields: FormField[];
 columns: Column[];
};

type Props = {
 module: ModuleKey;
 config: WorkspaceConfig;
 topContent?: ReactNode;
 showForm: boolean;
 viewMode:"table" |"kanban";
 hasKanban: boolean;
 pending: boolean;
 refreshing: boolean;
  hiddenFields: string[];
  fieldIcons: Record<string, ReactNode>;
  fieldErrors: Record<string, string>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
  canAdd: boolean;
 canEdit: boolean;
 canDelete: boolean;
 isViewer: boolean;
 relatedOptions: Record<string, Array<{ label: string; value: string }>>;
 selectValues: Record<string, string>;
 openSelectField: string | null;
 attachments: Attachment[];
 duplicates: Array<{ id: number; code: string; title: string; status: string }>;
 sprintDuplicate: boolean;
 lastSprint: string | null;
 dateWarnings: Record<string,"past" |"future">;
  editingRow: Row | null;
	visibleRows: TableRow[];
	kanbanRows: TableRow[];
	visibleColumns: Column[];
 safePage: number;
 totalPages: number;
 totalItems: number;
 statusOptions: Array<{ label: string; value: string }>;
 assigneeOptions?: Array<{ label: string; value: string }>;
 pendingDeleteId: string | number | null;
 deleteOpen: boolean;
 reopenOpen: boolean;
 reopenReason: string;
 viewingRow: Row | null;
 onToggleForm: () => void;
 onSetViewMode: (value:"table" |"kanban") => void;
 onImportFile: (file: File) => void;
 onFormChange: () => void;
 onSubmit: (formData: FormData) => void;
 onCancelForm: () => void;
 checkDuplicates: (title: string) => void;
 checkSprintDuplicate: (sprint: string) => void;
 setOpenSelectField: Dispatch<SetStateAction<string | null>>;
 setSelectValues: Dispatch<SetStateAction<Record<string, string>>>;
 setAttachments: Dispatch<SetStateAction<Attachment[]>>;
 setDateWarnings: Dispatch<SetStateAction<Record<string,"past" |"future">>>;
 setSprintDuplicate: Dispatch<SetStateAction<boolean>>;
 versionSequenceLabel?: string;
 versionSequenceDefaultValue?: string;
 onAdd: () => void;
 onEditRow: (row: TableRow) => void;
 onViewRow: (row: TableRow) => void;
 onDeleteRow: (row: TableRow) => void;
 onReopenRow: (row: TableRow) => void;
 onPrevPage: () => void;
 onNextPage: () => void;
 onGoToPage?: (page: number) => void;
 selectedIds?: Set<string | number>;
 onToggleSelect?: (id: string | number) => void;
 onToggleSelectAll?: () => void;
 onBulkDelete?: () => void;
 onBulkStatusChange?: (status: string) => void;
 onBulkAssign?: (assignee: string) => void;
 onInlineUpdate?: (rowId: string | number, field: string, value: string) => void;
 onReorder?: (rowId: string | number, newIndex: number) => void;
 reorderable?: boolean;
 onUpdateStatus: (id: string | number, status: string, sortOrder?: number) => Promise<void>;
 onBatchReorder?: (items: { id: number | string; sortOrder: number; status?: string }[]) => Promise<void>;
 onDeleteConfirm: () => void;
 onDeleteCancel: () => void;
 onReopenReasonChange: (value: string) => void;
 onReopenCancel: () => void;
 onReopenConfirm: () => void;
 onCloseView: () => void;
 onEditView: () => void;
 search: string;
 onSearchChange: (value: string) => void;
 filterOptions?: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;
 activeFilters?: Array<{ key: string; value: string; label: string }>;
 onFilterChange?: (filters: Array<{ key: string; value: string; label: string }>) => void;
 allColumns?: Array<{ key: string; label: string }>;
 visibleColumnKeys?: string[];
 onToggleColumn?: (key: string) => void;
 onResetColumns?: () => void;
 initialTab?: string | null;
 onTabChange?: (tab: string) => void;
};

export function ModuleWorkspaceShell({
 module,
 config,
 topContent,
 showForm,
 viewMode,
 hasKanban,
 pending,
 refreshing,
  hiddenFields,
  fieldIcons,
  fieldErrors,
  setFieldErrors,
  canAdd,
 canEdit,
 canDelete,
 isViewer,
 relatedOptions,
 selectValues,
 openSelectField,
 attachments,
 duplicates,
 sprintDuplicate,
 lastSprint,
 dateWarnings,
 editingRow,
	visibleRows,
	kanbanRows,
	visibleColumns,
 safePage,
 totalPages,
 totalItems,
 statusOptions,
 assigneeOptions,
 pendingDeleteId,
 deleteOpen,
 reopenOpen,
 reopenReason,
 viewingRow,
 onToggleForm,
 onSetViewMode,
 onImportFile,
 onFormChange,
 onSubmit,
 onCancelForm,
 checkDuplicates,
 checkSprintDuplicate,
 setOpenSelectField,
 setSelectValues,
 setAttachments,
 setDateWarnings,
 setSprintDuplicate,
 versionSequenceLabel,
 versionSequenceDefaultValue,
 onAdd,
 onEditRow,
 onViewRow,
 onDeleteRow,
 onReopenRow,
 onPrevPage,
 onNextPage,
 onGoToPage,
 selectedIds,
 onToggleSelect,
 onToggleSelectAll,
 onBulkDelete,
 onBulkStatusChange,
 onBulkAssign,
 onInlineUpdate,
 onReorder,
 reorderable,
 onUpdateStatus,
 onBatchReorder,
 onDeleteConfirm,
 onDeleteCancel,
 onReopenReasonChange,
 onReopenCancel,
 onReopenConfirm,
 onCloseView,
 onEditView,
 search,
 onSearchChange,
 filterOptions,
 activeFilters,
 onFilterChange,
 allColumns,
 visibleColumnKeys,
 onToggleColumn,
 onResetColumns,
 initialTab,
 onTabChange,
}: Props) {
 void attachments;
 void setAttachments;
 void setSprintDuplicate;
 const router = useRouter();
 const [bugCreateMode, setBugCreateMode] = useState<BugCreateMode>("ai");
 const [manualBugDraft, setManualBugDraft] = useState<Record<string, unknown> | null>(null);
 const [selectedBugProject, setSelectedBugProject] = useState<string>(
   () => selectValues.project || relatedOptions.project?.[0]?.value || "",
 );

 const handleSwitchToManual = (draft: IssueAgentTicketDraft) => {
   setManualBugDraft({
     title: draft.title,
     project: draft.project,
     module: draft.module,
     bugType: draft.bugType,
     preconditions: draft.preconditions,
     stepsToReproduce: draft.stepsToReproduce,
     expectedResult: draft.expectedResult,
     actualResult: draft.actualResult,
     severity: draft.severity,
     priority: draft.priority,
     evidence: draft.evidence,
   });
   setBugCreateMode("manual");
 };

 const handleDirectBugSubmit = async (entry: Record<string, unknown>, createAnother?: boolean) => {
   const formData = new FormData();
   for (const [key, val] of Object.entries(entry)) {
     if (val !== undefined && val !== null) {
       formData.set(key, String(val));
     }
   }

   if (createAnother && !editingRow) {
     try {
       const res = await fetch(`/api/items/${module}`, {
         method: "POST",
         body: formData,
       });
       if (!res.ok) {
         const err = await res.json().catch(() => ({}));
         throw new Error(err.error || "Failed to create bug");
       }
       toast("Bug created successfully! Ready for next bug.", "success");
       router.refresh();
     } catch (err) {
       toast(err instanceof Error ? err.message : "Failed to create bug", "error");
     }
   } else {
     onSubmit(formData);
     setManualBugDraft(null);
   }
 };

 return (
 <>
 <section className="overflow-hidden bg-white border border-gray-200">
 <ModuleWorkspaceHeader
 module={module}
 title={config.title}
 shortTitle={config.shortTitle}
 description={config.description}
 icon={getModuleWorkspaceIcon(module)}
 canAdd={canAdd}
 topContent={topContent}
 showForm={showForm}
 viewMode={viewMode}
 hasKanban={hasKanban}
 pending={pending}
 refreshing={refreshing}
 onToggleForm={onToggleForm}
 onSetViewMode={onSetViewMode}
 onImportFile={onImportFile}
 search={search}
 onSearchChange={onSearchChange}
 filterOptions={filterOptions}
 activeFilters={activeFilters}
 onFilterChange={onFilterChange}
 allColumns={allColumns}
 visibleColumnKeys={visibleColumnKeys}
 onToggleColumn={onToggleColumn}
 onResetColumns={onResetColumns}
 />


 {viewMode ==="table" ? (
 <>
 {/* Desktop table */}
 <div className="hidden md:block">
 <ModuleWorkspaceTable
 module={module}
 shortTitle={config.shortTitle}
 visibleRows={visibleRows}
 visibleColumns={visibleColumns}
 safePage={safePage}
 totalPages={totalPages}
 totalItems={totalItems}
 canAdd={canAdd}
 canEdit={canEdit}
 canDelete={canDelete}
 pendingDeleteId={pendingDeleteId}
 onAdd={onAdd}
 onEditRow={onEditRow}
 onViewRow={onViewRow}
 onDeleteRow={onDeleteRow}
 onReopenRow={onReopenRow}
 onPrevPage={onPrevPage}
 onNextPage={onNextPage}
 onGoToPage={onGoToPage}
 selectedIds={selectedIds}
 onToggleSelect={onToggleSelect}
 onToggleSelectAll={onToggleSelectAll}
 onBulkDelete={onBulkDelete}
 onBulkStatusChange={onBulkStatusChange}
 onBulkAssign={onBulkAssign}
 onInlineUpdate={onInlineUpdate}
 statusOptions={statusOptions}
 assigneeOptions={assigneeOptions}
 onReorder={onReorder}
 reorderable={reorderable}
 />
 </div>
 {/* Mobile card view */}
 <div className="block md:hidden">
 <ModuleMobileCards
 module={module}
 shortTitle={config.shortTitle}
 rows={visibleRows}
 columns={visibleColumns}
 safePage={safePage}
 totalPages={totalPages}
 totalItems={totalItems}
 canEdit={canEdit}
 canDelete={canDelete}
 onViewRow={onViewRow}
 onEditRow={onEditRow}
 onDeleteRow={onDeleteRow}
 onPrevPage={onPrevPage}
 onNextPage={onNextPage}
 onGoToPage={onGoToPage}
 />
 </div>
 </>
 ) : (
 <div className="overflow-hidden bg-transparent border-t border-gray-200 p-4">
			<KanbanBoard rows={kanbanRows} statusOptions={statusOptions} onUpdateStatus={onUpdateStatus} onBatchReorder={onBatchReorder} onViewRow={onViewRow} />
			</div>
		)}
 </section>

 {/* Form Drawer */}
 <FormDrawer
 open={showForm}
 size={module === "tasks" ? "lg" : "xl"}
 title={editingRow ? `Edit ${config.shortTitle.replace(/s$/i, "")}` : `Create ${config.shortTitle.replace(/s$/i, "")}`}
 subtitle={
  editingRow
    ? "Update existing data."
    : module === "bugs" && bugCreateMode === "ai"
    ? "Describe the issue or paste a screenshot — AI structures the rest."
    : module === "bugs"
    ? "Fill in core defect details quickly."
    : module === "tasks"
    ? "Create a task with essential details."
    : "Fill in new data with a consistent format."
 }
 customHeader={
  module === "bugs" ? (
    <BugModalHeader
      title={editingRow ? "Edit Bug" : "New Bug"}
      project={selectedBugProject || selectValues.project || relatedOptions.project?.[0]?.value || ""}
      onProjectChange={(p) => {
        setSelectedBugProject(p);
        setSelectValues((prev) => ({ ...prev, project: p }));
      }}
      projectOptions={relatedOptions.project || []}
      mode={bugCreateMode}
      onModeChange={setBugCreateMode}
      onClose={() => {
        setManualBugDraft(null);
        onCancelForm();
      }}
      isEditing={Boolean(editingRow)}
    />
  ) : undefined
 }
 headerAccessory={
  module === "bugs" && !editingRow ? (
    <BugModalModeSelector mode={bugCreateMode} onChange={setBugCreateMode} />
  ) : undefined
 }
 onClose={() => {
   setManualBugDraft(null);
   onCancelForm();
 }}
 >
 {module === "bugs" && !editingRow && bugCreateMode === "ai" ? (
  <AiIssueAgentContent
    projectOptions={relatedOptions.project || []}
    defaultProject={selectValues.project || ""}
    selectedProject={selectedBugProject || selectValues.project || relatedOptions.project?.[0]?.value || ""}
    onCancel={() => {
      setManualBugDraft(null);
      onCancelForm();
    }}
    pending={pending}
    onDirectSubmit={handleDirectBugSubmit}
    onSwitchToManual={handleSwitchToManual}
  />
 ) : module === "bugs" ? (
  <StreamlinedBugForm
    projectOptions={relatedOptions.project || []}
    defaultProject={selectValues.project || ""}
    selectedProject={selectedBugProject || selectValues.project || relatedOptions.project?.[0]?.value || ""}
    devOptions={relatedOptions.suggestedDev || relatedOptions.assignee || []}
    initialData={editingRow || manualBugDraft}
    pending={pending}
    onCancel={() => {
      setManualBugDraft(null);
      onCancelForm();
    }}
    onSubmit={handleDirectBugSubmit}
  />
 ) : (
 <ModuleWorkspaceForm
 key={`${module}-${editingRow?.id ??"new"}`}
 module={module}
 shortTitle={config.shortTitle}
 fields={config.fields}
 editingRow={editingRow}
  hiddenFields={hiddenFields}
  fieldIcons={fieldIcons}
  fieldErrors={fieldErrors}
  setFieldErrors={setFieldErrors}
  canAdd={canAdd}
 canEdit={canEdit}
 pending={pending}
 isViewer={isViewer}
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
 onFormChange={onFormChange}
 onSubmit={onSubmit}
 onCancel={onCancelForm}
 checkDuplicates={checkDuplicates}
 checkSprintDuplicate={checkSprintDuplicate}
 versionSequenceLabel={versionSequenceLabel}
 versionSequenceDefaultValue={versionSequenceDefaultValue}
 />
 )}
 </FormDrawer>

 <ModuleWorkspaceModals
 deleteOpen={deleteOpen}
 onDeleteConfirm={onDeleteConfirm}
 onDeleteCancel={onDeleteCancel}
 reopenOpen={reopenOpen}
 reopenReason={reopenReason}
 onReopenReasonChange={onReopenReasonChange}
 onReopenCancel={onReopenCancel}
 onReopenConfirm={onReopenConfirm}
 />

 {viewingRow && (
 <ViewModal
 row={viewingRow}
 config={config}
 fieldIcons={fieldIcons}
 onClose={onCloseView}
 onEdit={onEditView}
 canEdit={canEdit}
 canDelete={canDelete}
 onDelete={() => {
   if (viewingRow) {
     onDeleteRow(viewingRow);
     onCloseView();
   }
 }}
 module={module}
 initialTab={initialTab}
 onTabChange={onTabChange}
 />
 )}
 </>
 );
}

