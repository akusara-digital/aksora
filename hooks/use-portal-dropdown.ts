"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

export interface UsePortalDropdownOptions {
  /** Controlled open state. Omit for uncontrolled mode. */
  isOpen?: boolean;
  /** Callback when open state should change. */
  onOpenChange?: (open: boolean) => void;
  /** Horizontal alignment relative to trigger element. */
  align?: "left" | "right";
  /** Expected menu width in px for viewport clamping. */
  width?: number;
  /** Match the trigger element's width. */
  matchTriggerWidth?: boolean;
  /** Estimated menu height in px for top/bottom flip calculation. */
  estHeight?: number;
  /** Vertical gap in px between trigger and menu. */
  offset?: number;
  /** Optional external anchor element that should not trigger outside-click close. */
  anchorRef?: RefObject<HTMLElement | null>;
}

interface PortalRect {
  top: number;
  left: number;
  width?: number;
  placement: "bottom" | "top";
}

/**
 * Positions a dropdown/popover in a document.body portal with viewport clamping
 * and automatic top/bottom placement so it never clips inside overflow containers.
 */
export function usePortalDropdown<T extends HTMLElement = HTMLButtonElement>(
  options: UsePortalDropdownOptions = {},
) {
  const {
    isOpen: controlledOpen,
    onOpenChange,
    align = "left",
    width,
    matchTriggerWidth = false,
    estHeight = 260,
    offset = 4,
    anchorRef,
  } = options;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const [rect, setRect] = useState<PortalRect | null>(null);
  const triggerRef = useRef<T | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = triggerRef.current ?? anchorRef?.current;
    if (!anchor || typeof window === "undefined") return;

    const r = anchor.getBoundingClientRect();
    const resolvedWidth = matchTriggerWidth
      ? r.width
      : Math.min(width ?? Math.max(r.width, 180), window.innerWidth - 16);

    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placement: "bottom" | "top" =
      spaceBelow < estHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    const rawLeft = align === "right" ? r.right - resolvedWidth : r.left;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - resolvedWidth - 8));

    setRect({
      top: placement === "bottom" ? r.bottom + offset : r.top - offset,
      left,
      width: matchTriggerWidth ? r.width : undefined,
      placement,
    });
  }, [align, anchorRef, estHeight, matchTriggerWidth, offset, width]);

  const toggle = useCallback(() => {
    if (!open) updatePosition();
    setOpen(!open);
  }, [open, setOpen, updatePosition]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef, setOpen, updatePosition]);

  const portalStyle: CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.placement === "bottom" ? rect.top : undefined,
        bottom:
          rect.placement === "top" && typeof window !== "undefined"
            ? window.innerHeight - rect.top
            : undefined,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      }
    : {};

  return {
    open,
    setOpen,
    toggle,
    close,
    triggerRef,
    menuRef,
    ready: Boolean(open && rect && typeof document !== "undefined"),
    portalStyle,
  };
}
