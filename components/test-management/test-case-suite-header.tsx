"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/shared/badge";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  DotsThreeVertical,
  PencilSimple,
  Table,
  Plus,
  Play,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { AiGenerateCasesButton } from "@/components/test-management/ai-generate-cases-button";
import type { SuiteGroup } from "@/components/test-management/test-case-table";

interface TestCaseSuiteHeaderProps {
  selected: SuiteGroup;
  onAddCase: () => void;
  onRunSuite: () => void;
  startingRun?: boolean;
}

export function TestCaseSuiteHeader({
  selected,
  onAddCase,
  onRunSuite,
  startingRun = false,
}: TestCaseSuiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const suiteIdentifier = selected.suiteToken || selected.key;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
      <div className="min-w-0">
        {selected.planProject && (
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-blue-500">
            {selected.planProject}
            {selected.planTitle ? ` · ${selected.planTitle}` : ""}
          </p>
        )}
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-bold text-gray-900">
            {selected.suiteTitle}
          </h2>
          {selected.suiteStatus && <Badge value={selected.suiteStatus} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-gray-400">
          <span className="flex items-center gap-1">
            <CheckCircle size={13} className="text-emerald-500" />
            {selected.passed}
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={13} className="text-rose-500" />
            {selected.failed}
          </span>
          <span className="flex items-center gap-1">
            <Warning size={13} className="text-amber-500" />
            {selected.blocked}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} className="text-gray-400" />
            {selected.pending}
          </span>
        </div>

        {/* Instant Run Suite button */}
        <button
          type="button"
          onClick={onRunSuite}
          disabled={startingRun}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
          title="Start execution run for this suite immediately"
        >
          <Play size={14} weight="bold" />
          {startingRun ? "Starting..." : "Run Suite"}
        </button>

        <button
          type="button"
          onClick={onAddCase}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-sm"
        >
          <Plus size={14} weight="bold" />
          Add Case
        </button>

        <AiGenerateCasesButton
          suiteId={String(selected.cases[0]?.testSuiteId || selected.key || "")}
          suiteLabel={selected.suiteTitle}
          existingCases={selected.cases}
        />

        {suiteIdentifier && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Open test case menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50"
            >
              <DotsThreeVertical size={18} weight="bold" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-11 z-20 w-56 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onRunSuite();
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                >
                  <Play size={16} weight="bold" />
                  Run Suite Now
                </button>
                <Link
                  href={`/test-execution/${suiteIdentifier}`}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ClockCounterClockwise size={16} weight="bold" />
                  Run History
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <Link
                  href={`/test-cases/${suiteIdentifier}`}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <PencilSimple size={16} weight="bold" />
                  Edit Test Case
                </Link>
                {selected.suiteToken && (
                  <Link
                    href={`/test-suites/${selected.suiteToken}`}
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Table size={16} weight="bold" />
                    Open Suite Detail
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
