"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, PencilSimple, Trash, PaperPlaneTilt } from "@phosphor-icons/react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { CopyLinkButton } from "@/components/shared/copy-link-button";
import { CollaborationIndicator } from "@/components/shared/collaboration-indicator";
import { useCollaborationPresence } from "@/hooks/use-collaboration-presence";
import { ImageLightbox } from "@/components/module/module-view-modal-parts";
import { BADGE_FIELDS, METADATA_FIELDS, renderFieldValue, type FieldConfig } from "@/components/module/module-detail-field-renderer";
import { ModuleDetailViewMain } from "@/components/module/module-detail-view-main";
import { ModuleDetailViewSidebar } from "@/components/module/module-detail-view-sidebar";
import { getDetailViewCrumbs, getModuleWorkspaceIcon } from "@/components/module/module-workspace-utils";
import { SicmundusSyncModal } from "@/components/tasks/sicmundus-sync-modal";
import { workLogToSicmundusProp } from "@/components/tasks/sicmundus-sync-parts";
import { AiBugToCaseButton } from "@/components/bugs/ai-bug-to-case-button";
import { AiRootCauseButton } from "@/components/bugs/ai-root-cause-button";
import { BugTriageButton } from "@/components/bugs/bug-triage-button";
import { BugTicketButton } from "@/components/bugs/bug-ticket-button";
import { AiTaskToCasesButton } from "@/components/tasks/ai-task-to-cases-button";
import { AiExportAutomationButton } from "@/components/test-management/ai-export-automation-button";
import { AiSessionSummaryButton } from "@/components/test-sessions/ai-session-summary-button";
import type { TableRow } from "@/components/module/module-workspace-table-row";
import type { ModuleKey } from "@/lib/modules";

type ViewTab = "details" | "activity";
const VALID_TABS: readonly ViewTab[] = ["details", "activity"];

function isValidTab(tab: string | null | undefined): tab is ViewTab {
  if (!tab) return false;
  return (VALID_TABS as readonly string[]).includes(tab);
}

type ModuleDetailViewProps = {
  row: TableRow;
  config: {
    shortTitle: string;
    fields: FieldConfig[];
  };
  fieldIcons: Record<string, ReactNode>;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
  module: string;
  initialTab?: string | null;
  onTabChange?: (tab: string) => void;
};

export function ModuleDetailView({
  row,
  config,
  fieldIcons,
  onClose,
  onEdit,
  canEdit,
  canDelete,
  onDelete,
  module,
  initialTab,
  onTabChange,
}: ModuleDetailViewProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showSicmundusModal, setShowSicmundusModal] = useState(false);
  const activityRef = useRef<HTMLDivElement | null>(null);
  const didScrollToActivity = useRef(false);

  const { editors } = useCollaborationPresence(module, row.id);

  useEffect(() => {
    if (isValidTab(initialTab) && initialTab === "activity" && !didScrollToActivity.current) {
      didScrollToActivity.current = true;
      activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      onTabChange?.("activity");
    }
  }, [initialTab, onTabChange]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxSrc) { setLightboxSrc(null); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [onClose, lightboxSrc]);

  const displayFields = config.fields.filter((field) => {
    const raw = row[field.name];
    if (raw === undefined || raw === null) return false;
    const str = String(raw).trim();
    return str !== "" && str !== "undefined" && str !== "UNDEFINED" && str !== "null";
  });

  const metadataFields = displayFields.filter(
    (f) => METADATA_FIELDS.includes(f.name) && !BADGE_FIELDS.includes(f.name),
  );
  const badgeFields = displayFields.filter((f) => BADGE_FIELDS.includes(f.name));
  const contentFields = displayFields.filter(
    (f) => !METADATA_FIELDS.includes(f.name) && !BADGE_FIELDS.includes(f.name),
  );

  const rowCode = String(row.code ?? "").trim();
  const title = String(row.title || row.caseName || row.name || "Detail");
  const crumbs = getDetailViewCrumbs(module as ModuleKey, config.shortTitle, row);

  return (
    <div className="space-y-4">
      <Breadcrumb crumbs={crumbs} />

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-800"
        >
          <ArrowLeft size={14} weight="bold" />
          Back
        </button>

        <div className="flex items-center gap-1.5">
          <CollaborationIndicator editors={editors} className="mr-2" />
          <CopyLinkButton module={module} itemId={row.id} publicToken={row.publicToken as string} activeTab="details" />
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-700"
            >
              <Trash size={12} weight="bold" />
              Delete
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-8 items-center gap-1.5 rounded bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500"
            >
              <PencilSimple size={12} weight="bold" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            {getModuleWorkspaceIcon(module as ModuleKey)}
          </div>
          <div className="min-w-0 flex-1">
            {rowCode && <p className="text-[11px] font-semibold text-gray-400">{rowCode}</p>}
            <h1 className="text-xl font-bold leading-snug text-gray-900">{title}</h1>
          </div>
        </div>

        {badgeFields.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
            {badgeFields.map((field) => (
              <span key={field.name} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5">
                {renderFieldValue(field, row, setLightboxSrc)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-12">
        {module === "bugs" && (
          <>
            <AiRootCauseButton
              title={String(row.title || "")}
              steps={String(row.stepsToReproduce || row.preconditions || "")}
              actualResult={String(row.actualResult || "")}
              project={String(row.project || "")}
            />
            <AiBugToCaseButton bug={row} />
            <BugTriageButton bugId={row.id} />
            <BugTicketButton bugId={row.id} externalTicket={row.externalTicket} />
          </>
        )}
        {module === "test-cases" && (
          <AiExportAutomationButton
            caseName={String(row.caseName || row.title || "Test Case")}
            preCondition={String(row.preCondition || "")}
            testStep={String(row.testStep || "")}
            expectedResult={String(row.expectedResult || "")}
          />
        )}
        {module === "tasks" && <AiTaskToCasesButton task={row} />}
        {module === "test-sessions" && (
          <AiSessionSummaryButton
            sessionTitle={String(row.scope || row.project || row.title || "Test Session")}
            totalCases={Number(row.totalCases || 0)}
            passed={Number(row.passed || 0)}
            failed={Number(row.failed || 0)}
            blocked={Number(row.blocked || 0)}
            failedSummary={String(row.notes || "")}
          />
        )}
        {module === "work-logs" && (
          <button
            type="button"
            onClick={() => setShowSicmundusModal(true)}
            className="inline-flex h-8 items-center gap-1.5 border border-sky-300 bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
          >
            <PaperPlaneTilt size={13} weight="bold" />
            Sync to Sicmundus
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <ModuleDetailViewMain
          row={row}
          module={module}
          contentFields={contentFields}
          fieldIcons={fieldIcons}
          setLightboxSrc={setLightboxSrc}
          activityRef={activityRef}
        />
        <ModuleDetailViewSidebar
          row={row}
          metadataFields={metadataFields}
          fieldIcons={fieldIcons}
          setLightboxSrc={setLightboxSrc}
        />
      </div>

      {showSicmundusModal && (
        <SicmundusSyncModal
          isOpen={showSicmundusModal}
          onClose={() => setShowSicmundusModal(false)}
          task={workLogToSicmundusProp(row)}
        />
      )}
    </div>
  );
}
