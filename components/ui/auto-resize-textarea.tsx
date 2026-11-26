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
  syncGroup?: string;
}

type SyncEntry = {
  element: HTMLTextAreaElement;
  calculateMinHeight: () => number;
  maxHeight: number;
};

const syncRegistry = new Map<string, Set<SyncEntry>>();

function syncGroupHeights(groupName: string, activeEl?: HTMLTextAreaElement | null) {
  const entries = syncRegistry.get(groupName);
  if (!entries || entries.size === 0) return;

  const targetForm = activeEl?.closest("form") ?? activeEl?.closest("[role='dialog']") ?? null;
  const connected: SyncEntry[] = [];

  for (const entry of entries) {
    if (!entry.element.isConnected) {
      entries.delete(entry);
      continue;
    }
    const entryForm = entry.element.closest("form") ?? entry.element.closest("[role='dialog']") ?? null;
    if (targetForm && entryForm && targetForm !== entryForm) {
      continue;
    }
    connected.push(entry);
  }

  if (connected.length === 0) return;

  // Reset all elements in group to auto so natural scrollHeight can be read accurately
  for (const entry of connected) {
    entry.element.style.height = "auto";
  }

  // Calculate maximum target height across all entries in the group
  let maxTargetHeight = 0;
  for (const entry of connected) {
    const minH = entry.calculateMinHeight();
    const naturalH = entry.element.scrollHeight;
    const clampedH = Math.min(Math.max(naturalH, minH), entry.maxHeight);
    if (clampedH > maxTargetHeight) {
      maxTargetHeight = clampedH;
    }
  }

  // Apply synchronized height to all elements in the group
  for (const entry of connected) {
    entry.element.style.height = `${maxTargetHeight}px`;
    entry.element.style.overflowY = entry.element.scrollHeight > entry.maxHeight ? "auto" : "hidden";
  }
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
    syncGroup,
    onInput,
    ...props
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

  const calculateMinHeight = (): number => {
    if (minHeight !== undefined) return minHeight;
    if (rows === 1) return 40;
    if (rows === 2) return 60;
    if (rows >= 3) return Math.min(rows * 22 + 18, 120);
    return 40;
  };

  const syncHeight = () => {
    const el = innerRef.current;
    if (!el) return;

    if (syncGroup) {
      syncGroupHeights(syncGroup, el);
      return;
    }

    const minH = calculateMinHeight();
    const maxH = maxHeight;

    // Temporarily collapse to auto to compute accurate scrollHeight
    el.style.height = "auto";
    const scrollH = el.scrollHeight;

    if (scrollH > maxH) {
      el.style.height = `${maxH}px`;
      el.style.overflowY = "auto";
    } else if (scrollH <= minH) {
      el.style.height = `${minH}px`;
      el.style.overflowY = "hidden";
    } else {
      el.style.height = `${scrollH}px`;
      el.style.overflowY = "hidden";
    }
  };

  useLayoutEffect(() => {
    if (syncGroup && innerRef.current) {
      let set = syncRegistry.get(syncGroup);
      if (!set) {
        set = new Set();
        syncRegistry.set(syncGroup, set);
      }
      const entry: SyncEntry = {
        element: innerRef.current,
        calculateMinHeight,
        maxHeight,
      };
      set.add(entry);

      syncGroupHeights(syncGroup, innerRef.current);

      return () => {
        set.delete(entry);
        if (set.size === 0) {
          syncRegistry.delete(syncGroup);
        } else {
          syncGroupHeights(syncGroup);
        }
      };
    } else {
      syncHeight();
    }
  }, [syncGroup, props.value, props.defaultValue, rows, minHeight, maxHeight]);

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
        "w-full resize-none rounded-none border bg-white px-3.5 py-2.5 text-sm leading-5 text-slate-800 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow,background-color] dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
        error
          ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
          : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus:border-blue-400 dark:focus:ring-blue-400/20",
        props.disabled &&
          "border-blue-200/80 bg-blue-50/60 text-blue-900 cursor-not-allowed placeholder:text-blue-400 select-none dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
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
