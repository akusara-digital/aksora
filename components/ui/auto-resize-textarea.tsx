"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

export const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(function AutoResizeTextarea(
  {
    error,
    minHeight,
    maxHeight = 240,
    className,
    rows = 3,
    style,
    onInput,
    ...props
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

  const calculateMinHeight = (): number => {
    if (minHeight !== undefined) return minHeight;
    if (rows === 1) return 38;
    if (rows === 2) return 58;
    if (rows >= 3) return Math.min(rows * 24 + 16, 120);
    return 76;
  };

  const syncHeight = () => {
    const el = innerRef.current;
    if (!el) return;

    const minH = calculateMinHeight();
    const maxH = maxHeight;

    // Temporarily collapse to auto to compute accurate scrollHeight
    el.style.height = "auto";
    const scrollH = el.scrollHeight;

    if (scrollH > maxH) {
      el.style.height = `${maxH}px`;
      el.style.overflowY = "auto";
    } else if (scrollH < minH) {
      el.style.height = `${minH}px`;
      el.style.overflowY = "hidden";
    } else {
      el.style.height = `${scrollH}px`;
      el.style.overflowY = "hidden";
    }
  };

  useLayoutEffect(() => {
    syncHeight();
  }, [props.value, props.defaultValue, rows, minHeight, maxHeight]);

  useEffect(() => {
    const handleResize = () => syncHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [minHeight, maxHeight, rows]);

  const minH = calculateMinHeight();

  return (
    <textarea
      ref={innerRef}
      rows={rows}
      className={cn(
        "w-full resize-none rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow,background-color] dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500",
        error
          ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
          : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus:border-blue-400 dark:focus:ring-blue-400/20",
        className,
      )}
      style={{
        minHeight: `${minH}px`,
        maxHeight: `${maxHeight}px`,
        ...style,
      }}
      onInput={(e) => {
        syncHeight();
        onInput?.(e);
      }}
      {...props}
    />
  );
});
AutoResizeTextarea.displayName = "AutoResizeTextarea";
