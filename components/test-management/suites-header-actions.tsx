"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
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
 <div className="flex flex-wrap items-center gap-3">
 <div className="relative w-full max-w-[360px] flex-1">
 <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={value}
 onChange={(event) => {
 const nextValue = event.target.value;
 setValue(nextValue);
 updateQuery(nextValue);
 }}
 placeholder={inputPlaceholder}
 className="h-11 w-full  border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
 />
 </div>
 <ModuleMoreActionsMenu
 module={exportModule}
 canAdd={true}
 onImportFile={(file) => void handleUpload(file)}
 buttonClassName="h-11 w-11"
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
