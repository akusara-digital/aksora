import { cn } from "@/lib/utils";

export type AppLoaderProps = {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  className?: string;
  showSpinner?: boolean;
};

export function AppLoader({
  message,
  size = "md",
  fullScreen = false,
  className,
  showSpinner = false,
}: AppLoaderProps) {
  const iconPx = size === "lg" ? 64 : size === "sm" ? 32 : 44;

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 text-center select-none">
      <div className="relative flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-light.png"
          alt="Aksora"
          width={iconPx}
          height={iconPx}
          className="animate-pulse object-contain dark:hidden shrink-0 select-none"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-dark.png"
          alt="Aksora"
          width={iconPx}
          height={iconPx}
          className="animate-pulse object-contain hidden dark:block shrink-0 select-none"
        />
      </div>

      {(message || showSpinner) && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-zinc-500">
          {showSpinner && (
            <span
              className={cn(
                "rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0",
                size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
              )}
              aria-hidden="true"
            />
          )}
          {message && <span className="tracking-wide">{message}</span>}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app,#0B0F19)] transition-colors select-none",
          className,
        )}
        role="status"
        aria-label={message || "Loading"}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[50vh] w-full items-center justify-center py-12 transition-colors select-none",
        className,
      )}
      role="status"
      aria-label={message || "Loading"}
    >
      {content}
    </div>
  );
}
