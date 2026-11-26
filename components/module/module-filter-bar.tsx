"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Funnel, X, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type FilterValue = {
  key: string;
  value: string;
  label: string;
};

type FilterOption = {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

type ModuleFilterBarProps = {
  filters: FilterOption[];
  activeFilters: FilterValue[];
  onFilterChange: (filters: FilterValue[]) => void;
};

function FilterDropdown({
  filter,
  activeValue,
  onSelect,
}: {
  filter: FilterOption;
  activeValue: string | undefined;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; placement: "bottom" | "top" } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuWidth = Math.min(192, window.innerWidth - 16);
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const estHeight = Math.min((filter.options.length + 1) * 32 + 12, 232);
    const placement: "bottom" | "top" =
      spaceBelow < estHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    setRect({
      top: placement === "bottom" ? r.bottom + 4 : r.top - 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
      width: menuWidth,
      placement,
    });
  }, [filter.options.length]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
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
  }, [open, updatePosition]);

  const selectedOption = filter.options.find((o) => o.value === activeValue);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!open) updatePosition();
          setOpen(!open);
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition touch-manipulation cursor-pointer",
          activeValue
            ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
        )}
      >
        <span className="truncate max-w-[110px] sm:max-w-none">
          {selectedOption ? selectedOption.label : filter.label}
        </span>
        <CaretDown size={11} weight="bold" className="shrink-0" />
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
              width: rect.width,
              zIndex: 99999,
            }}
            className="max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in duration-150"
          >
            <button
              type="button"
              onClick={() => { onSelect(""); setOpen(false); }}
              className={cn(
                "block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition cursor-pointer",
                !activeValue ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              All {filter.label}
            </button>
            {filter.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onSelect(option.value); setOpen(false); }}
                className={cn(
                  "block w-full truncate rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition cursor-pointer",
                  activeValue === option.value ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ModuleFilterBar({ filters, activeFilters, onFilterChange }: ModuleFilterBarProps) {
  if (filters.length === 0) return null;

  const handleSelect = (key: string, value: string) => {
    if (!value) {
      onFilterChange(activeFilters.filter((f) => f.key !== key));
    } else {
      const filter = filters.find((f) => f.key === key);
      const option = filter?.options.find((o) => o.value === value);
      const label = option?.label ?? value;
      const existing = activeFilters.filter((f) => f.key !== key);
      onFilterChange([...existing, { key, value, label }]);
    }
  };

  const clearAll = () => onFilterChange([]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
        <Funnel size={13} weight="bold" />
        Filters
      </span>
      {filters.map((filter) => (
        <FilterDropdown
          key={filter.key}
          filter={filter}
          activeValue={activeFilters.find((f) => f.key === filter.key)?.value}
          onSelect={(value) => handleSelect(filter.key, value)}
        />
      ))}
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
        >
          <X size={11} weight="bold" />
          Clear
        </button>
      )}
    </div>
  );
}
