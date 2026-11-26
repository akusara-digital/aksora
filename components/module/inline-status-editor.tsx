"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type InlineStatusEditorProps = {
  value: string;
  options: Option[];
  onUpdate: (newValue: string) => void;
  disabled?: boolean;
};

export function InlineStatusEditor({ value, options, onUpdate, disabled }: InlineStatusEditorProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; placement: "bottom" | "top" } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuWidth = 156;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const estHeight = Math.min(options.length * 36 + 8, 260);
    const placement: "bottom" | "top" =
      spaceBelow < estHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    setRect({
      top: placement === "bottom" ? r.bottom + 4 : r.top - 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
      placement,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  if (disabled || options.length === 0) {
    return <Badge value={value} />;
  }

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) updatePosition();
          setOpen(!open);
        }}
        className="cursor-pointer transition hover:opacity-80"
        title="Click to change status"
      >
        <Badge value={value} />
      </button>
      {open &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: rect.placement === "bottom" ? rect.top : undefined,
              bottom: rect.placement === "top" ? window.innerHeight - rect.top : undefined,
              left: rect.left,
              zIndex: 99999,
            }}
            className="min-w-[148px] max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in duration-150"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (opt.value !== value) onUpdate(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition cursor-pointer",
                  opt.value === value ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50",
                )}
              >
                <Badge value={opt.value} />
                {opt.value === value && (
                  <span className="ml-auto text-[10px] text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
