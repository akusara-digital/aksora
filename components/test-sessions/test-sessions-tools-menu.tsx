"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkle, CaretDown, ChatCenteredText, Scroll } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AiStandupDigestModal } from "@/components/dashboard/ai-standup-digest-modal";
import { AiReleaseNotesModal } from "@/components/test-sessions/ai-release-notes-modal";

interface TestSessionsToolsMenuProps {
  testerName?: string;
  defaultVersion?: string;
}

export function TestSessionsToolsMenu({
  testerName,
  defaultVersion,
}: TestSessionsToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative inline-block text-left shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition shadow-xs cursor-pointer",
            isOpen
              ? "border-teal-300 bg-teal-50/50 text-teal-700"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          )}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="AI Reports & Digests"
        >
          <Sparkle size={13} weight="bold" className="text-teal-600 shrink-0" />
          <span>AI Reports</span>
          <CaretDown size={11} weight="bold" className="text-gray-400 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute right-0 z-30 mt-1 w-60 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100">
            <div className="px-3 py-1.5 border-b border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Session AI Automations
              </p>
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsStandupOpen(true);
                }}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-sky-50 hover:text-sky-900 transition cursor-pointer"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <ChatCenteredText size={13} weight="bold" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">Generate Standup</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    Daily summary for Slack or Teams
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsReleaseNotesOpen(true);
                }}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-teal-50 hover:text-teal-900 transition cursor-pointer"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                  <Scroll size={13} weight="bold" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">Generate Release Notes</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    Changelog from verified test runs
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <AiStandupDigestModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        testerName={testerName}
      />
      <AiReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={() => setIsReleaseNotesOpen(false)}
        defaultVersion={defaultVersion}
      />
    </>
  );
}
