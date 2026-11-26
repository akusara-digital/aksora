"use client";

export interface FormDraftRecord<T = Record<string, unknown>> {
  formKey: string;
  menuKey: string;
  data: T;
  updatedAt: number;
}

const DRAFT_PREFIX = "aksora_form_draft_";
const AI_SESSION_PREFIX = "aksora_ai_session_";

/**
 * Resolves the canonical menu key from a pathname.
 * E.g. /bugs/123 -> /bugs, /test-cases/suite -> /test-cases, /tasks -> /tasks
 */
export function getMenuKey(pathname?: string): string {
  if (typeof window === "undefined" && !pathname) return "/";
  const path = (pathname || (typeof window !== "undefined" ? window.location.pathname : "/"))
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();

  if (path.startsWith("/bugs")) return "/bugs";
  if (path.startsWith("/tasks") || path.startsWith("/gantt")) return "/tasks";
  if (
    path.startsWith("/test-cases") ||
    path.startsWith("/test-suites") ||
    path.startsWith("/test-plans") ||
    path.startsWith("/test-execution")
  ) {
    return "/test-cases";
  }
  if (path.startsWith("/projects")) return "/projects";
  if (path.startsWith("/dashboard")) return "/dashboard";
  if (path.startsWith("/my-work")) return "/my-work";
  if (path.startsWith("/daily-work") || path.startsWith("/work-logs")) return "/daily-work";
  if (path.startsWith("/weekly-report") || path.startsWith("/reports")) return "/reports";
  if (path.startsWith("/settings") || path.startsWith("/assignees")) return "/settings";

  const firstSeg = path.split("/").filter(Boolean)[0];
  return firstSeg ? `/${firstSeg}` : "/";
}

function getStorageKey(formKey: string): string {
  return `${DRAFT_PREFIX}${formKey}`;
}

/**
 * Saves a form draft in browser cache, tagged with the active menuKey.
 */
export function saveFormDraft<T = Record<string, unknown>>(
  formKey: string,
  data: T,
  customMenuKey?: string,
): void {
  if (typeof window === "undefined") return;

  try {
    const menuKey = customMenuKey || getMenuKey();

    // Check if data is essentially empty
    if (!data || typeof data !== "object") {
      clearFormDraft(formKey);
      return;
    }

    const hasAnyValue = Object.values(data as Record<string, unknown>).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "object") return Object.keys(val).length > 0;
      return true;
    });

    if (!hasAnyValue) {
      clearFormDraft(formKey);
      return;
    }

    const record: FormDraftRecord<T> = {
      formKey,
      menuKey,
      data,
      updatedAt: Date.now(),
    };

    localStorage.setItem(getStorageKey(formKey), JSON.stringify(record));
    window.dispatchEvent(
      new CustomEvent("aksora:form-draft-update", {
        detail: { formKey, menuKey, data },
      }),
    );
  } catch (err) {
    console.warn(`[form-draft-cache] Failed to save draft for ${formKey}:`, err);
  }
}

/**
 * Retrieves a saved draft for the given formKey.
 * If the draft belonged to a different menu, it is purged and returns null.
 */
export function getFormDraft<T = Record<string, unknown>>(
  formKey: string,
  currentPathOrMenu?: string,
): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getStorageKey(formKey));
    if (!raw) return null;

    const record = JSON.parse(raw) as FormDraftRecord<T>;
    const activeMenuKey = getMenuKey(currentPathOrMenu);

    // If the draft was saved under a different menu, purge it
    if (record.menuKey && record.menuKey !== activeMenuKey) {
      clearFormDraft(formKey);
      return null;
    }

    // Expire drafts older than 3 days
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    if (record.updatedAt && Date.now() - record.updatedAt > THREE_DAYS_MS) {
      clearFormDraft(formKey);
      return null;
    }

    return record.data;
  } catch {
    return null;
  }
}

/**
 * Checks if a draft exists for the current menu.
 */
export function hasFormDraft(formKey: string, currentPathOrMenu?: string): boolean {
  return getFormDraft(formKey, currentPathOrMenu) !== null;
}

/**
 * Clears a specific form draft.
 */
export function clearFormDraft(formKey: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(getStorageKey(formKey));
    window.dispatchEvent(
      new CustomEvent("aksora:form-draft-update", {
        detail: { formKey, data: null },
      }),
    );
  } catch (err) {
    console.warn(`[form-draft-cache] Failed to clear draft for ${formKey}:`, err);
  }
}

/**
 * Clears all form drafts and AI sessions that do not belong to the active menu.
 * Called automatically when navigating to a new menu/page.
 */
export function clearMenuDraftsExcept(activeMenuKey: string): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    const normalizedActive = getMenuKey(activeMenuKey);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(DRAFT_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as FormDraftRecord;
            if (parsed.menuKey && parsed.menuKey !== normalizedActive) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      } else if (key.startsWith(AI_SESSION_PREFIX)) {
        // Also clean AI sessions belonging to other menus if needed
        // Domain map: bug -> /bugs, test_case / test_suite / test_plan -> /test-cases, standup -> /dashboard
        const domain = key.replace(AI_SESSION_PREFIX, "");
        const domainMenuMap: Record<string, string> = {
          bug: "/bugs",
          test_case: "/test-cases",
          test_suite: "/test-cases",
          test_plan: "/test-cases",
          standup: "/dashboard",
          release_notes: "/reports",
        };
        const expectedMenu = domainMenuMap[domain];
        if (expectedMenu && expectedMenu !== normalizedActive) {
          keysToRemove.push(key);
        }
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("[form-draft-cache] Failed to prune other menu drafts:", err);
  }
}
