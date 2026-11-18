"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: (
            callback?: (notification: {
              isNotDisplayed: () => boolean;
              getNotDisplayedReason?: () => string;
            }) => void,
          ) => void;
        };
      };
    };
  }
}

function getGoogleClientId(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
}
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`,
    );

    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existing.addEventListener(
        "load",
        () => {
          resolve();
        },
        { once: true },
      );

      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export function GoogleIcon({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  inviteToken,
  onMfaRequired,
  onErrorChange,
}: {
  inviteToken?: string;
  onMfaRequired?: (tempToken: string) => void;
  onErrorChange?: (error: string) => void;
}) {
  const router = useRouter();
  const { dict } = useTranslation();
  const t = dict.login;
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const [pending, setPending] = useState(false);
  const [gisRendered, setGisRendered] = useState(false);
  const [localError, setLocalError] = useState("");

  const updateError = useCallback(
    (msg: string) => {
      setLocalError(msg);
      onErrorChange?.(msg);
    },
    [onErrorChange],
  );

  const handleDevSignIn = async (forcedEmail?: string) => {
    const inputEmail =
      forcedEmail || window.prompt("Enter your Gmail address for login:", "wahyu@gmail.com");
    if (!inputEmail || !inputEmail.trim()) return;
    setPending(true);
    updateError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: `dev_gmail:${inputEmail.trim()}`, inviteToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        updateError(data.error || "Google sign-in failed.");
        setPending(false);
        return;
      }
      if (data.requiresMfa && data.tempToken) {
        setPending(false);
        onMfaRequired?.(data.tempToken);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
      router.push(isPlatformSuperAdmin ? "/admin/overview" : next);
      router.refresh();
      toast(`Signed in as ${inputEmail}`, "success");
    } catch {
      updateError("Network error. Please try again.");
      setPending(false);
    }
  };

  useEffect(() => {
    const googleClientId = getGoogleClientId();
    if (!googleClientId) return;
    let mounted = true;

    function init() {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: { credential?: string }) => {
          setPending(true);
          updateError("");
          try {
            const next =
              new URLSearchParams(window.location.search).get("next") || "/dashboard";
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential, inviteToken }),
            });
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
              ok?: boolean;
              role?: string;
              company?: string;
              requiresMfa?: boolean;
              tempToken?: string;
            };
            if (!res.ok) {
              updateError(data.error || "Google sign-in failed.");
              setPending(false);
              return;
            }
            if (data.requiresMfa && data.tempToken) {
              setPending(false);
              onMfaRequired?.(data.tempToken);
              return;
            }
            const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
            router.push(isPlatformSuperAdmin ? "/admin/overview" : next);
            router.refresh();
            toast("Signed in with Google", "success");
          } catch {
            updateError("Network error. Please try again.");
            setPending(false);
          }
        },
      });

      if (buttonHostRef.current && window.google?.accounts?.id) {
        const isDark =
          typeof document !== "undefined" &&
          (document.documentElement.classList.contains("dark") ||
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        const buttonWidth =
          buttonHostRef.current.clientWidth || buttonHostRef.current.offsetWidth || 340;
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          theme: isDark ? "filled_black" : "outline",
          size: "large",
          shape: "rectangular",
          type: "standard",
          width: Math.min(Math.max(buttonWidth, 240), 400),
          text: "continue_with",
          logo_alignment: "left",
        });

        const checkRendered = () => {
          if (mounted && buttonHostRef.current?.querySelector("iframe")) {
            setGisRendered(true);
          }
        };
        setTimeout(checkRendered, 50);
        setTimeout(checkRendered, 250);
        setTimeout(checkRendered, 600);

        try {
          const observer = new MutationObserver(() => {
            if (mounted && buttonHostRef.current?.querySelector("iframe")) {
              setGisRendered(true);
              observer.disconnect();
            }
          });
          observer.observe(buttonHostRef.current, { childList: true, subtree: true });
        } catch {
          /* ignore observer error */
        }
      }
    }

    loadGsiScript().then(() => {
      if (!mounted) return;
      init();
    });

    return () => {
      mounted = false;
    };
  }, [router, inviteToken, onMfaRequired, updateError]);

  if (!getGoogleClientId() && process.env.NODE_ENV === "production") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        Google sign-in is not configured. (Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. Official Google Identity Services Rendered Button (kept in DOM with layout width) */}
      <div
        ref={buttonHostRef}
        className={cn(
          "w-full flex items-center justify-center transition-all",
          gisRendered ? "min-h-[44px]" : "h-0 overflow-hidden"
        )}
      />

      {/* 2. Sleek Custom Fallback Button (visible when GIS iframe is loading or not yet rendered) */}
      {!gisRendered && (
        <button
          type="button"
          onClick={() => {
            if (pending) return;
            if (process.env.NODE_ENV !== "production") {
              handleDevSignIn();
              return;
            }
            if (window.google?.accounts?.id) {
              try {
                window.google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; getNotDisplayedReason?: () => string }) => {
                  if (notification.isNotDisplayed()) {
                    const reason = notification.getNotDisplayedReason?.() || "suppressed";
                    toast(`Google Sign-In prompt suppressed (${reason}). Please refresh or check ad-blockers.`, "warning");
                  }
                });
              } catch {
                toast("Initializing Google sign-in...", "info");
              }
            } else {
              toast("Google Sign-In is loading or blocked by an extension. Please check ad-blockers.", "warning");
            }
          }}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100 text-sm sm:text-base font-semibold transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
        >
          {pending ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <GoogleIcon className="w-5 h-5 shrink-0" />
          )}
          <span>{pending ? t.connecting || "Connecting..." : t.continueWithGoogle || "Continue with Google"}</span>
        </button>
      )}

      {/* Dev helper for localhost:3001 if Google OAuth origin is restricted */}
      {process.env.NODE_ENV !== "production" && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => handleDevSignIn()}
            className="text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition underline underline-offset-2"
          >
            Sign in with Gmail (Dev 3001)
          </button>
        </div>
      )}

      {localError && (
        <div
          className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center font-medium leading-relaxed"
          role="alert"
        >
          {localError}
        </div>
      )}
    </div>
  );
}
