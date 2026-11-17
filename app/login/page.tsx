"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { InlineAlert } from "@/components/ui/inline-alert";
import { GoogleSignInButton } from "@/components/oauth/google-signin-button";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { useTranslation } from "@/hooks/use-translation";

function getSafeRedirectUrl(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/dashboard";
  }
  if (raw.startsWith("/login")) {
    return "/dashboard";
  }
  return raw;
}

export function LoginContent() {
  const { dict } = useTranslation();
  const t = dict.login;
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = getSafeRedirectUrl(searchParams.get("next") || searchParams.get("redirectTo"));
  const inviteToken = searchParams.get("inviteToken") || "";

  const [mode, setMode] = useState<"signin" | "verify-mfa">("signin");
  const [mfaTempToken, setMfaTempToken] = useState("");
  const [mfaTotpCode, setMfaTotpCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaTotpCode || mfaTotpCode.length !== 6) {
      setError(dict.otp?.errorEnterCode || "Enter the 6-digit code.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: mfaTempToken,
          code: mfaTotpCode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t.authFailed);
      }

      const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
      let targetUrl = nextUrl;
      if (data.workspaceUuid && !targetUrl.includes("ws=")) {
        const sep = targetUrl.includes("?") ? "&" : "?";
        targetUrl = `${targetUrl}${sep}ws=${encodeURIComponent(data.workspaceUuid)}`;
      }
      router.push(isPlatformSuperAdmin ? "/admin/overview" : targetUrl);
      router.refresh();
      toast(t.welcomeBack, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unexpectedError);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-4 py-12 select-none transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeSwitcher compact />
      </div>

      <div className="w-full max-w-[440px] flex flex-col items-center text-center">
        {mode === "verify-mfa" ? (
          /* Two-Factor Authentication Step */
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mb-6">
              <ShieldCheck size={36} weight="bold" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t.tagTwoFactor || "Two-Factor Authentication"}
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
              {t.subtitleVerifyMfa || "Please open your authenticator app and enter the 6-digit code."}
            </p>

            <form noValidate onSubmit={handleMfaSubmit} className="w-full max-w-sm mt-8 space-y-4">
              <div className="space-y-1.5">
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={mfaTotpCode}
                  onChange={(e) => setMfaTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full h-12 text-center font-mono text-2xl font-bold tracking-[0.4em] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {error && <InlineAlert variant="error" message={error} compact className="px-1 text-left" />}

              <button
                type="submit"
                disabled={pending || mfaTotpCode.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 text-sm font-semibold transition-all shadow-md shadow-blue-500/15 disabled:opacity-50 cursor-pointer"
              >
                <span>{pending ? dict.otp?.verifying || "Verifying..." : dict.otp?.verify || "Verify"}</span>
                {!pending && <ArrowRight size={16} weight="bold" />}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMfaTempToken("");
                    setMfaTotpCode("");
                    setError("");
                    setMode("signin");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium transition cursor-pointer"
                >
                  <ArrowLeft size={12} weight="bold" />
                  <span>{dict.common?.backToSignIn || "Back to sign in"}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Minimalist Login Screen (1-to-1 with Image Specification) */
          <>
            {/* Centered Large Aksora Logo */}
            <Link href="/" className="inline-block transition-transform hover:scale-105" title="Aksora">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Aksora"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-white.svg"
                alt="Aksora"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain hidden dark:block"
              />
            </Link>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-6 sm:mt-7">
              {t.loginToContinue || "Log in to continue"}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2.5 max-w-sm sm:max-w-md leading-relaxed">
              {t.loginTagline ||
                "The workspace for engineering teams: test planning, execution, bug tracking, and tasks — all in one app."}
            </p>

            {/* Google Single Sign-On Button */}
            <div className="w-full max-w-sm sm:max-w-md mt-8">
              <GoogleSignInButton
                inviteToken={inviteToken}
                onMfaRequired={(tempToken) => {
                  setMfaTempToken(tempToken);
                  setError("");
                  setMode("verify-mfa");
                }}
                onErrorChange={setError}
              />
            </div>

            {/* Terms of Service & Privacy Policy Agreement Text */}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-10 max-w-xs sm:max-w-sm leading-relaxed">
              {t.termsAgreement || "By continuing, you agree to our"}{" "}
              <Link href="/security" className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                {t.termsLink || "Terms of Service"}
              </Link>{" "}
              {t.and || "and"}{" "}
              <Link href="/privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                {t.privacyLink || "Privacy Policy"}
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0B0F19] text-3xl font-black tracking-tighter text-blue-600">
          Aksora
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
