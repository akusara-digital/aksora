"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  Clock,
  Check,
  ArrowsClockwise,
  Calendar,
  X,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";

interface ParsedItem {
  project: string;
  category: string;
  description: string;
  output?: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  date: string;
}

interface WorkLogQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

const SAMPLE_PROMPTS = [
  "MOT bug slicing 4 hours, sprint planning meeting 1 hour, remaining regression testing on Oronamin C 3.5 hours",
  "Table filter and column visibility feature development 5 hours, code review 3.5 hours",
  "Regression testing and defect verification 4 hours, remaining MOT feature enhancement",
];

export function WorkLogQuickModal({ isOpen, onClose, defaultDate }: WorkLogQuickModalProps) {
  const router = useRouter();
  const todayStr = defaultDate || new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayStr);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [activeModel, setActiveModel] = useState("");

  useEffect(() => {
    if (isAiConfigured()) {
      const creds = getActiveAiCredentials();
      setActiveModel(creds.model || "Active AI");
    }
  }, [isOpen]);

  const handleParse = async () => {
    if (!text.trim()) {
      toast("Please enter your work summary first", "warning");
      return;
    }

    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setParsing(true);
    try {
      const credentials = getActiveAiCredentials();
      if (credentials.model) {
        setActiveModel(credentials.model);
      }

      const res = await fetch("/api/work-logs/quick-ai-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          date,
          saveDirectly: false,
          ai: {
            ai_provider: credentials.provider,
            ai_model: credentials.model,
            api_key: credentials.apiKey,
            nine_router_public_url: credentials.publicUrl,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to process work log summary");
      }

      const items: ParsedItem[] = json.data?.items || [];
      if (items.length === 0) {
        throw new Error("No work log entries detected");
      }

      setParsedItems(items);
      toast(`Successfully extracted ${items.length} work log entries`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to process with AI", "error");
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateDuration = (index: number, minutes: number) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], durationMinutes: Math.max(15, minutes) };
      }
      return updated;
    });
  };

  const handleSaveAndSync = async () => {
    if (parsedItems.length === 0) return;
    setSaving(true);
    try {
      for (const item of parsedItems) {
        const fd = new FormData();
        fd.append("date", item.date || date);
        fd.append("project", item.project);
        fd.append("category", item.category);
        fd.append("description", item.description);
        fd.append("output", item.output || "");
        fd.append("notes", item.output || item.description);
        fd.append("durationMinutes", String(item.durationMinutes));
        if (item.startTime) fd.append("startTime", item.startTime);
        if (item.endTime) fd.append("endTime", item.endTime);

        const res = await fetch("/api/items/work-logs", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save work log entry");
        }
      }

      toast("All work logs saved and synced successfully!", "success");
      onClose();
      setText("");
      setParsedItems([]);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save entry", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = parsedItems.reduce((acc, item) => acc + (item.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const isTargetMet = totalMinutes >= 480;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Work Log (Single-Sentence AI)"
        description="Type your daily work in natural language. AI automatically extracts hours, project, and category."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Sparkle size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-gray-500">
              {parsedItems.length > 0 ? (
                <span className="font-semibold text-gray-700">
                  Total: {totalHours}h ({totalMinutes}m)
                  {isTargetMet ? (
                    <span className="ml-1.5 text-emerald-600 font-bold">✓ Meets 8h daily target</span>
                  ) : (
                    <span className="ml-1.5 text-amber-600 font-semibold">
                      ({((480 - totalMinutes) / 60).toFixed(1)}h short of 8h target)
                    </span>
                  )}
                </span>
              ) : (
                <span>Daily minimum target: 8 hours</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || parsing}
                className="h-8 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              {parsedItems.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSaveAndSync}
                  disabled={saving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                      Saving & Syncing...
                    </>
                  ) : (
                    <>
                      <Check size={13} weight="bold" />
                      Save & Sync Logs ({parsedItems.length})
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={parsing || !text.trim()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {parsing ? (
                    <>
                      <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkle size={13} weight="bold" />
                      Extract & Preview
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Active Model Indicator */}
          {activeModel && (
            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-1.5 text-xs">
              <span className="text-[11px] font-medium text-blue-700">Autonomous Extraction Engine</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700">
                <Sparkle size={10} weight="bold" />
                {activeModel}
              </span>
            </div>
          )}

          {/* Date Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Calendar size={14} weight="bold" className="text-gray-500" />
              Work Date:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Input Textarea */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Natural Language Work Summary:
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. MOT bug slicing 4 hours, sprint planning meeting 1 hour, remaining regression testing on Oronamin C 3.5 hours"
              className="w-full rounded-lg border border-gray-200 p-3 text-xs text-gray-800 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Example Chips */}
          <div>
            <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
              Quick Examples (Click to use):
            </span>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setText(sample)}
                  className="text-left text-[11px] text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-md px-2.5 py-1.5 transition"
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Preview of Parsed Items */}
          {parsedItems.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Extracted Work Entries ({parsedItems.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setParsedItems([])}
                  className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <X size={12} weight="bold" />
                  Reset Preview
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 text-xs transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-gray-900">{item.project}</span>
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                          {item.category}
                        </span>
                        {item.startTime && item.endTime && (
                          <span className="text-[11px] text-gray-500">
                            {item.startTime} - {item.endTime}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock size={12} weight="bold" className="text-gray-500" />
                        <input
                          type="number"
                          min={15}
                          step={15}
                          value={item.durationMinutes}
                          onChange={(e) => handleUpdateDuration(idx, parseInt(e.target.value, 10) || 60)}
                          className="w-14 h-6 text-center border border-gray-200 rounded bg-white text-xs font-bold text-gray-800"
                        />
                        <span className="text-[11px] text-gray-500">m</span>
                      </div>
                    </div>
                    <p className="font-medium text-gray-800 leading-snug">{item.description}</p>
                    {item.output && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        <span className="font-semibold text-gray-600">Output:</span> {item.output}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Quick AI Work Log"
      />
    </>
  );
}