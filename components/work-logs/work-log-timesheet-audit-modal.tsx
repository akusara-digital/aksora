"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CaretLeft,
  CaretRight,
  ArrowsClockwise,
  Plus,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { WorkLogFillGapModal } from "./work-log-fill-gap-modal";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: number | string;
  project: string;
  category: string;
  description: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  sicmundusEntryId?: string;
}

interface AuditDay {
  date: string;
  dayNumber: number;
  dayName: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  totalMinutes: number;
  totalHours: number;
  missingMinutes: number;
  status: "compliant" | "under_target" | "missing" | "weekend" | "holiday";
  entriesCount: number;
  entries: AuditEntry[];
}

interface AuditSummary {
  totalDays: number;
  workingDays: number;
  compliantDays: number;
  underTargetDays: number;
  missingDays: number;
  totalHoursLogged: number;
  minTargetHours: number;
  completionRate: number;
}

interface WorkLogTimesheetAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// A single, neutral accent color per status — avoids the previous mix of
// four saturated background colors competing for attention across the grid.
const STATUS_DOT: Record<AuditDay["status"], string> = {
  compliant: "bg-emerald-500",
  under_target: "bg-amber-500",
  missing: "bg-rose-500",
  weekend: "bg-gray-300",
  holiday: "bg-gray-300",
};

export function WorkLogTimesheetAuditModal({ isOpen, onClose }: WorkLogTimesheetAuditModalProps) {
  const router = useRouter();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [days, setDays] = useState<AuditDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<AuditDay | null>(null);
  const [selectedDayForGap, setSelectedDayForGap] = useState<{ date: string; currentMinutes: number } | null>(null);

  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const fetchAudit = async (mStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-logs/timesheet-audit?month=${mStr}&target=480`);
      const json = await res.json();
      if (res.ok && json.data) {
        setSummary(json.data.summary);
        setDays(json.data.days || []);
      }
    } catch {
      // Swallowed, UI handles empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedDay(null);
      fetchAudit(monthStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, monthStr]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  // Pad the grid so the 1st of the month lands on its correct weekday column (Mon-first).
  const leadingBlanks = days.length > 0 ? (days[0].dayOfWeek + 6) % 7 : 0;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Audit Timesheet & Kalender Kerja Sicmundus"
        description="Pantau pemenuhan target minimal 8 jam kerja setiap hari kerja."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CalendarCheck size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">
              Target standar harian: <strong>minimal 8 jam (480m)</strong> pada hari kerja non-libur.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Tutup
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Month Selector Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="h-8 w-8 rounded-md flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                title="Bulan sebelumnya"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="text-sm font-bold text-gray-900 px-2 min-w-36 text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="h-8 w-8 rounded-md flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                title="Bulan berikutnya"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchAudit(monthStr)}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              <ArrowsClockwise size={13} weight="bold" className={loading ? "animate-spin text-emerald-600" : ""} />
              Refresh
            </button>
          </div>

          {/* Month Summary — plain label/value row, no colored KPI cards */}
          {summary && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span className="text-gray-600">
                Total: <strong className="text-gray-900">{summary.totalHoursLogged}h</strong> / {summary.minTargetHours}h min
                <span className="text-gray-400"> ({summary.completionRate}%)</span>
              </span>
              <span className="text-gray-600">
                Lengkap: <strong className="text-gray-900">{summary.compliantDays}</strong> / {summary.workingDays} hari kerja
              </span>
              {summary.underTargetDays > 0 && (
                <span className="text-amber-700">
                  Kurang jam: <strong>{summary.underTargetDays}</strong> hari
                </span>
              )}
              {summary.missingDays > 0 && (
                <span className="text-rose-700">
                  Belum terisi: <strong>{summary.missingDays}</strong> hari
                </span>
              )}
            </div>
          )}

          {/* Calendar grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
              <ArrowsClockwise size={24} weight="bold" className="animate-spin text-emerald-600 mb-2" />
              <p className="text-xs font-medium">Memuat audit timesheet bulanan...</p>
            </div>
          ) : days.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 border border-gray-200 rounded-lg">
              Tidak ada data timesheet untuk bulan ini.
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {days.map((day) => {
                  const isRestDay = day.status === "weekend" || day.status === "holiday";
                  const isSelected = selectedDay?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-xs transition",
                        isSelected
                          ? "border-blue-400 bg-blue-50"
                          : isRestDay
                          ? "border-gray-100 bg-gray-50 text-gray-400"
                          : "border-gray-200 bg-white hover:border-gray-300",
                      )}
                      title={day.holidayName || day.dayName}
                    >
                      <span className={cn("font-bold", isRestDay ? "text-gray-400" : "text-gray-900")}>
                        {day.dayNumber}
                      </span>
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[day.status])} />
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Lengkap</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Kurang jam</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Kosong</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> Libur</span>
              </div>

              {/* Selected day detail */}
              {selectedDay && (
                <div className="mt-4 rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">
                        {selectedDay.date} — {selectedDay.dayName}
                        {selectedDay.holidayName && (
                          <span className="ml-1.5 text-xs font-medium text-gray-400">({selectedDay.holidayName})</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        {selectedDay.entriesCount > 0
                          ? `${selectedDay.entriesCount} entri: ${selectedDay.entries.map((e) => e.project).join(", ")}`
                          : selectedDay.status === "weekend" || selectedDay.status === "holiday"
                          ? "Hari libur / tidak wajib input log"
                          : "Belum ada entri log tercatat"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{selectedDay.totalHours}h</span>
                      {(selectedDay.status === "under_target" || selectedDay.status === "missing") && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDayForGap({ date: selectedDay.date, currentMinutes: selectedDay.totalMinutes })
                          }
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md font-bold text-[11px] transition"
                        >
                          <Plus size={11} weight="bold" />
                          Lengkapi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalShell>

      {/* Fill Gap Submodal */}
      {selectedDayForGap && (
        <WorkLogFillGapModal
          isOpen={true}
          onClose={() => {
            setSelectedDayForGap(null);
            fetchAudit(monthStr);
            router.refresh();
          }}
          date={selectedDayForGap.date}
          currentMinutes={selectedDayForGap.currentMinutes}
        />
      )}
    </>
  );
}
