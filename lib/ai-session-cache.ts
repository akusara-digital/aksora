"use client";

import { toast } from "@/components/ui/toast";

export type AiSessionDomain =
  | "bug"
  | "test_case"
  | "test_suite"
  | "test_plan"
  | "standup"
  | "release_notes";

export interface AiSessionState<TDraft = any> {
  domain: AiSessionDomain;
  project?: string;
  inputPrompt?: string;
  imageBase64?: string | null;
  preset?: string;
  status: "idle" | "processing" | "completed";
  resultDraft?: TDraft | null;
  updatedAt: number;
}

const STORAGE_PREFIX = "aksora_ai_session_";

function getStorageKey(domain: AiSessionDomain): string {
  return `${STORAGE_PREFIX}${domain}`;
}

export function saveAiSession<T = any>(
  domain: AiSessionDomain,
  updates: Partial<AiSessionState<T>>,
): AiSessionState<T> {
  if (typeof window === "undefined") {
    return {
      domain,
      status: "idle",
      updatedAt: Date.now(),
      ...updates,
    };
  }

  try {
    const existing = getAiSession<T>(domain);
    const merged: AiSessionState<T> = {
      domain,
      project: updates.project !== undefined ? updates.project : existing?.project,
      inputPrompt: updates.inputPrompt !== undefined ? updates.inputPrompt : existing?.inputPrompt,
      imageBase64: updates.imageBase64 !== undefined ? updates.imageBase64 : existing?.imageBase64,
      preset: updates.preset !== undefined ? updates.preset : existing?.preset,
      status: updates.status || existing?.status || "idle",
      resultDraft: updates.resultDraft !== undefined ? updates.resultDraft : existing?.resultDraft,
      updatedAt: Date.now(),
    };

    localStorage.setItem(getStorageKey(domain), JSON.stringify(merged));
    window.dispatchEvent(
      new CustomEvent("aksora:ai-session-update", {
        detail: { domain, session: merged },
      }),
    );
    return merged;
  } catch (err) {
    console.warn("[ai-session-cache] Failed to save session to localStorage:", err);
    return {
      domain,
      status: "idle",
      updatedAt: Date.now(),
      ...updates,
    };
  }
}

export function getAiSession<T = any>(domain: AiSessionDomain): AiSessionState<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getStorageKey(domain));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiSessionState<T>;

    // Expire sessions older than 7 days
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > SEVEN_DAYS_MS) {
      clearAiSession(domain);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearAiSession(domain: AiSessionDomain): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(domain));
    window.dispatchEvent(
      new CustomEvent("aksora:ai-session-update", {
        detail: { domain, session: null },
      }),
    );
  } catch (err) {
    console.warn("[ai-session-cache] Failed to clear session:", err);
  }
}

export function hasAiDraft(domain: AiSessionDomain): boolean {
  const session = getAiSession(domain);
  if (!session) return false;
  return Boolean(
    session.resultDraft ||
      (session.inputPrompt && session.inputPrompt.trim().length > 0) ||
      session.imageBase64 ||
      session.status === "processing",
  );
}

// In-memory promise registry so in-flight background requests survive component unmounts
const inFlightRequests = new Map<AiSessionDomain, Promise<any>>();

export function isAiDomainProcessing(domain: AiSessionDomain): boolean {
  if (inFlightRequests.has(domain)) return true;
  const session = getAiSession(domain);
  return session?.status === "processing";
}

export async function runAiBackgroundProcess<TResult = any>({
  domain,
  action,
  payload,
  aiCredentials,
  transformResponse,
  onCompleted,
  onError,
}: {
  domain: AiSessionDomain;
  action: string;
  payload: Record<string, unknown>;
  aiCredentials?: Record<string, unknown>;
  transformResponse?: (data: any) => TResult;
  onCompleted?: (result: TResult) => void;
  onError?: (err: Error) => void;
}): Promise<TResult> {
  // Mark session as processing
  saveAiSession(domain, {
    status: "processing",
    inputPrompt: typeof payload.prompt === "string" ? payload.prompt : typeof payload.text === "string" ? payload.text : typeof payload.story === "string" ? payload.story : undefined,
    project: typeof payload.project === "string" ? payload.project : undefined,
    imageBase64: typeof payload.imageBase64 === "string" ? payload.imageBase64 : undefined,
  });

  const promise = (async () => {
    try {
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload,
          ai: aiCredentials,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `AI processing failed (HTTP ${res.status})`);
      }

      const transformed: TResult = transformResponse ? transformResponse(json.data) : (json.data as TResult);

      // Save structured result in browser cache
      saveAiSession(domain, {
        status: "completed",
        resultDraft: transformed,
      });

      // Notify completion
      window.dispatchEvent(
        new CustomEvent("aksora:ai-session-completed", {
          detail: { domain, result: transformed },
        }),
      );

      if (onCompleted) {
        onCompleted(transformed);
      }

      return transformed;
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      // Reset status to idle so user can retry, keeping input text
      saveAiSession(domain, {
        status: "idle",
      });

      if (onError) {
        onError(errorObj);
      }
      throw errorObj;
    } finally {
      inFlightRequests.delete(domain);
    }
  })();

  inFlightRequests.set(domain, promise);
  return promise;
}
