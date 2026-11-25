"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  dot?: string;
  description?: string;
  disabled?: boolean;
}

export type CustomSelectOptionItem = string | CustomSelectOption;

export interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly CustomSelectOptionItem[] | CustomSelectOptionItem[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  icon?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  customOptionLabel?: string;
  customOptionValue?: string;
  onCustomSelect?: () => void;
  "aria-label"?: string;
  name?: string;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
}

export function CustomSelect({
  id: propId,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  className,
  menuClassName,
  icon,
  searchable,
  searchPlaceholder = "Search options...",
  allowCustom = false,
  customOptionLabel = "+ Enter custom name...",
  customOptionValue = "__custom__",
  onCustomSelect,
  "aria-label": ariaLabel,
  name,
}: CustomSelectProps) {
  const generatedId = useId();
  const selectId = propId || generatedId;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<DropdownRect | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Normalize options
  const normalizedOptions: CustomSelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected option
  const selectedOption = useMemo(() => {
    if (value === customOptionValue) {
      return { value: customOptionValue, label: customOptionLabel };
    }
    return normalizedOptions.find((opt) => opt.value === value) || null;
  }, [normalizedOptions, value, customOptionValue, customOptionLabel]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const query = search.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    );
  }, [normalizedOptions, search]);

  const showSearch = searchable ?? normalizedOptions.length > 8;

  // Calculate and update position
  const updatePosition = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const menuHeightEstimate = Math.min(filteredOptions.length * 40 + (showSearch ? 50 : 0) + 20, 320);

    const placement: "bottom" | "top" =
      spaceBelow < menuHeightEstimate && spaceAbove > spaceBelow ? "top" : "bottom";

    setRect({
      top: placement === "bottom" ? r.bottom + 6 : r.top - 6,
      left: r.left,
      width: Math.max(r.width, 180),
      placement,
    });
  };

  function toggleOpen() {
    if (disabled) return;
    if (!open) {
      updatePosition();
      setOpen(true);
      setSearch("");
      const initialIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setActiveIndex(initialIdx >= 0 ? initialIdx : 0);
    } else {
      setOpen(false);
    }
  }

  // Handle outside click & resize
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, filteredOptions.length, showSearch]);

  // Focus search input on open
  useEffect(() => {
    if (open && showSearch && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, showSearch]);

  // Keyboard navigation
  const handleButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      toggleOpen();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      toggleOpen();
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const totalCount = filteredOptions.length + (allowCustom ? 1 : 0);
    if (totalCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        const item = filteredOptions[activeIndex];
        if (!item.disabled) {
          onChange(item.value);
          setOpen(false);
          btnRef.current?.focus();
        }
      } else if (allowCustom && activeIndex === filteredOptions.length) {
        onChange(customOptionValue);
        onCustomSelect?.();
        setOpen(false);
        btnRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const handleSelectOption = (optVal: string) => {
    onChange(optVal);
    setOpen(false);
    btnRef.current?.focus();
  };

  const handleSelectCustom = () => {
    onChange(customOptionValue);
    onCustomSelect?.();
    setOpen(false);
    btnRef.current?.focus();
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={btnRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition-all duration-150",
          "hover:border-slate-300 hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/70",
          "flex items-center justify-between gap-2 text-left select-none",
          disabled && "cursor-not-allowed opacity-60 hover:border-slate-200 hover:bg-white",
          open && "border-blue-500 ring-2 ring-blue-500/20",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0 text-slate-500 dark:text-slate-400">{icon}</span>}
          {selectedOption?.dot && (
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", selectedOption.dot)}
              aria-hidden="true"
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={cn(
              "truncate",
              !selectedOption && "text-slate-400 font-normal"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={cn(
            "shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180 text-blue-600"
          )}
        />
      </button>

      {open &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              activeIndex >= 0 ? `${selectId}-opt-${activeIndex}` : undefined
            }
            onKeyDown={handleMenuKeyDown}
            style={{
              position: "fixed",
              top: rect.placement === "bottom" ? rect.top : undefined,
              bottom:
                rect.placement === "top"
                  ? window.innerHeight - rect.top
                  : undefined,
              left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
              width: rect.width,
              zIndex: 99999,
            }}
            className={cn(
              "rounded-md border border-slate-200/90 bg-white/95 p-1.5 shadow-lg backdrop-blur-md",
              "dark:border-slate-800 dark:bg-slate-900/95 animate-in fade-in-0 zoom-in-95 duration-100",
              menuClassName
            )}
          >
            {showSearch && (
              <div className="p-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="relative flex items-center">
                  <MagnifyingGlass
                    size={14}
                    weight="bold"
                    className="absolute left-2.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setActiveIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md bg-slate-50 dark:bg-slate-800/80 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto space-y-0.5 p-0.5 focus:outline-none">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2.5 text-center text-xs text-slate-400">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === activeIndex;

                  return (
                    <button
                      key={opt.value}
                      id={`${selectId}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelectOption(opt.value)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-left transition-colors select-none",
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80",
                        isActive && !isSelected && "bg-slate-100/80 dark:bg-slate-800/60",
                        opt.disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {opt.dot && (
                          <span
                            className={cn("h-2 w-2 shrink-0 rounded-full", opt.dot)}
                            aria-hidden="true"
                          />
                        )}
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-[11px] font-normal text-slate-400 truncate">
                            {opt.description}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check
                          size={14}
                          weight="bold"
                          className="shrink-0 text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </button>
                  );
                })
              )}

              {allowCustom && (
                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    id={`${selectId}-opt-custom`}
                    type="button"
                    role="option"
                    aria-selected={value === customOptionValue}
                    onClick={handleSelectCustom}
                    onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors text-left",
                      value === customOptionValue && "bg-blue-50 dark:bg-blue-950/60 font-bold",
                      activeIndex === filteredOptions.length && "bg-blue-50/70 dark:bg-blue-950/40"
                    )}
                  >
                    <Plus size={14} weight="bold" className="shrink-0" />
                    <span>{customOptionLabel}</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
