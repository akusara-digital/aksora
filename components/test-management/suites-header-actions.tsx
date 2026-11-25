"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MagnifyingGlass, Plus, FolderPlus } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ImportErrorsModal, type ImportRowError } from "@/components/shared/import-errors-modal";
import { useTranslation } from "@/hooks/use-translation";
import { ModuleMoreActionsMenu } from "@/components/module/module-more-actions-menu";

export function SuitesHeaderActions({
 initialSearch,
 placeholder,
 exportModule ="test-suites",
 importModule ="test-suites",
}: {
 initialSearch: string;
 placeholder?: string;
 exportModule?: string;
 importModule?: string;
}) {
 const { dict } = useTranslation();
 const t = dict.testManagement.suites;
 const inputPlaceholder = placeholder || t.searchPlaceholder;
 const router = useRouter();
 const pathname = usePathname();
 const [value, setValue] = useState(initialSearch);
 const [locationSearch, setLocationSearch] = useState(() =>
   typeof window !== "undefined" ? window.location.search : ""
 );
 const [, startTransition] = useTransition();
 const [importErrors, setImportErrors] = useState<ImportRowError[] | null>(null);

 useEffect(() => {
 const syncSearch = () => {
 setLocationSearch(window.location.search);
 };

 window.addEventListener("popstate", syncSearch);
 return () => window.removeEventListener("popstate", syncSearch);
 }, []);

 function updateQuery(nextValue: string) {
 const params = new URLSearchParams(locationSearch);
 if (nextValue.trim()) params.set("q", nextValue.trim());
 else params.delete("q");
 const query = params.toString();
 setLocationSearch(`?${query}`);
 startTransition(() => router.replace(query ?`${pathname}?${query}` : pathname));
 }

 async function handleUpload(file: File | undefined) {
 if (!file) return;
 const formData = new FormData();
 formData.append("file", file);
 const res = await fetch(`/api/import/${importModule}`, { method:"POST", body: formData });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) {
 if (Array.isArray(data.errors) && data.errors.length > 0) {
 setImportErrors(data.errors);
 } else {
 toast(data.error || t.importFailed,"error");
 }
 return;
 }
 toast(data.message || t.importSuccess,"success");
 router.refresh();
 }

 return (
 <>
 <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-2.5 lg:w-auto lg:flex-1 lg:justify-end">
        <div className="relative w-full min-w-0 md:w-56 lg:max-w-56">
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-gray-400">
            <MagnifyingGlass size={14} weight="bold" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              setValue(nextValue);
              updateQuery(nextValue);
            }}
            placeholder={inputPlaceholder}
            className="h-8 w-full border border-gray-200 bg-white pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-blue-500"
          />
        </div>

        {exportModule === "test-cases" && (
          <>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("qa:open-new-suite"))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-2xs shrink-0"
              title="Create a new Test Suite"
            >
              <FolderPlus size={14} weight="bold" className="text-gray-500 shrink-0" />
              <span>New Suite</span>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("qa:open-new-case"))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-[13px] font-bold text-white transition hover:bg-blue-700 shadow-xs shrink-0"
              title="Create a new Test Case"
            >
              <Plus size={14} weight="bold" className="shrink-0" />
              <span>New Test Case</span>
            </button>
          </>
        )}

        {exportModule === "test-plans" && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("qa:open-new-plan"))}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-[13px] font-bold text-white transition hover:bg-blue-700 shadow-xs shrink-0"
            title="Create a new Test Plan"
          >
            <Plus size={14} weight="bold" className="shrink-0" />
            <span>New Test Plan</span>
          </button>
        )}

        <ModuleMoreActionsMenu
          module={exportModule}
          canAdd={true}
          onImportFile={(file) => void handleUpload(file)}
        />
      </div>
 <ImportErrorsModal
 isOpen={importErrors !== null}
 errors={importErrors ?? []}
 onClose={() => setImportErrors(null)}
 />
 </>
 );
}
