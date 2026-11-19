"use client";

import { useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { cn, decomposeDuration, composeDuration, formatDuration } from "@/lib/utils";

export const DURATION_PRESETS = [
  { label: "30m", minutes: 30 },
  { label: "1h (60m)", minutes: 60 },
  { label: "2h (120m)", minutes: 120 },
  { label: "4h (240m)", minutes: 240 },
  { label: "8h (480m)", minutes: 480 },
];

export interface DurationInputProps {
  name?: string;
  value?: number | string;
  onChange?: (totalMinutes: number) => void;
  disabled?: boolean;
  error?: boolean;
  showPresets?: boolean;
  className?: string;
}

export function DurationInput({
  name,
  value,
  onChange,
  disabled,
  error,
  showPresets = true,
  className,
}: DurationInputProps) {
  const [prevValue, setPrevValue] = useState(value);
  const initial = decomposeDuration(value);
  const [hoursDraft, setHoursDraft] = useState<string>(
    initial.hours > 0 ? String(initial.hours) : initial.totalMinutes > 0 ? "0" : ""
  );
  const [minutesDraft, setMinutesDraft] = useState<string>(
    initial.minutes > 0 ? String(initial.minutes) : initial.totalMinutes > 0 ? "0" : ""
  );

  // Sync state if external value changes (e.g. row loaded, preset applied, or start/end time changed)
  if (value !== prevValue) {
    setPrevValue(value);
    const dec = decomposeDuration(value);
    setHoursDraft(dec.hours > 0 ? String(dec.hours) : dec.totalMinutes > 0 ? "0" : "");
    setMinutesDraft(dec.minutes > 0 ? String(dec.minutes) : dec.totalMinutes > 0 ? "0" : "");
  }

  const currentTotal = composeDuration(hoursDraft, minutesDraft);

  const handleHoursChange = (val: string) => {
    setHoursDraft(val);
    const newTotal = composeDuration(val, minutesDraft);
    onChange?.(newTotal);
  };

  const handleMinutesChange = (val: string) => {
    setMinutesDraft(val);
    const newTotal = composeDuration(hoursDraft, val);
    onChange?.(newTotal);
  };

  const handlePresetSelect = (presetMinutes: number) => {
    if (presetMinutes === currentTotal) {
      setHoursDraft("");
      setMinutesDraft("");
      onChange?.(0);
      return;
    }
    const dec = decomposeDuration(presetMinutes);
    setHoursDraft(dec.hours > 0 ? String(dec.hours) : "0");
    setMinutesDraft(String(dec.minutes));
    onChange?.(presetMinutes);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentTotal > 0 ? String(currentTotal) : ""}
        />
      )}

      {/* Dual Inputs: Hours and Minutes */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Hours
          </span>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step="1"
              disabled={disabled}
              placeholder="0"
              value={hoursDraft}
              onChange={(e) => handleHoursChange(e.target.value)}
              className={cn(
                "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 pr-10 outline-none transition-[border-color,box-shadow,background-color] hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:border-blue-200/80 disabled:bg-blue-50/60 disabled:text-blue-900 disabled:cursor-not-allowed dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100",
                error && "border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
              )}
            />
            <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-400 dark:text-zinc-500">
              hrs
            </span>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Minutes
          </span>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              disabled={disabled}
              placeholder="0"
              value={minutesDraft}
              onChange={(e) => handleMinutesChange(e.target.value)}
              className={cn(
                "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 pr-11 outline-none transition-[border-color,box-shadow,background-color] hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:border-blue-200/80 disabled:bg-blue-50/60 disabled:text-blue-900 disabled:cursor-not-allowed dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100",
                error && "border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
              )}
            />
            <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-400 dark:text-zinc-500">
              min
            </span>
          </div>
        </div>
      </div>

      {/* Live Converter Result Indicator */}
      <div className="flex items-center justify-between border-t border-slate-200/70 pt-1.5 text-[11px] dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
          <Clock size={13} weight="bold" className="text-amber-500" />
          <span className="font-medium text-slate-500 dark:text-zinc-400">Total:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {currentTotal > 0 ? `${currentTotal} min` : "0 min"}
          </span>
          {currentTotal > 0 && (
            <span className="text-slate-400 dark:text-zinc-500">({formatDuration(currentTotal)})</span>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      {showPresets && (
        <div className="pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5 dark:text-zinc-500">
              Quick:
            </span>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = preset.minutes === currentTotal;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePresetSelect(preset.minutes)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50",
                    isSelected
                      ? "border-amber-500 bg-amber-50 text-amber-800 font-bold dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
