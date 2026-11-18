"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDiskBack,
  Bug,
  Kanban,
  Clock,
  Warning,
  Sparkle,
  ClipboardText,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";

type Task = { id: number; title: string; status: string; priority: string; project: string };
type BugItem = { id: number; title: string; severity: string; status: string; project: string };
type StandupNote = { id: number; title: string; content: string; date: string; attendees: string };

type StandupData = {
  user: { name: string; email: string; role: string };
  tasks: Task[];
  bugs: BugItem[];
  recentStandups: StandupNote[];
};

function parseStandupResponse(resData: {
  yesterday?: string;
  today?: string;
  blockers?: string;
  markdown?: string;
}) {
  let y = resData.yesterday || "";
  let t = resData.today || "";
  let b = resData.blockers || "";

  if ((!y || !t) && resData.markdown) {
    const md = resData.markdown;
    const yMatch = md.match(/(?:\*\*Yesterday:?\*\*|Yesterday:?)\s*([\s\S]*?)(?=(?:\*\*Today:?\*\*|Today:?)|(?:\*\*Blockers:?\*\*|Blockers:?)|$)/i);
    if (yMatch && !y) y = yMatch[1].trim();

    const tMatch = md.match(/(?:\*\*Today:?\*\*|Today:?)\s*([\s\S]*?)(?=(?:\*\*Blockers:?\*\*|Blockers:?)|$)/i);
    if (tMatch && !t) t = tMatch[1].trim();

    const bMatch = md.match(/(?:\*\*Blockers:?\*\*|Blockers:?)\s*([\s\S]*?)$/i);
    if (bMatch && !b) b = bMatch[1].trim();
  }

  return { yesterday: y, today: t, blockers: b };
}

export function StandupClient() {
  const router = useRouter();
  const [data, setData] = useState<StandupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("");

  // Form State
  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hasBlocker, setHasBlocker] = useState(false);
  const [project, setProject] = useState("");

  useEffect(() => {
    fetch("/api/standup")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json.tasks?.[0]?.project) {
          setProject(json.tasks[0].project);
        } else if (json.bugs?.[0]?.project) {
          setProject(json.bugs[0].project);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast("Failed to load standup context", "error");
        setLoading(false);
      });

    if (isAiConfigured()) {
      const creds = getActiveAiCredentials();
      setActiveModel(creds.model || "Active AI");
    }
  }, []);

  const handleAutonomousStandup = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    if (!data) return;

    setGenerating(true);
    try {
      const credentials = getActiveAiCredentials();
      if (credentials.model) {
        setActiveModel(credentials.model);
      }

      const runsSummary = (data.tasks || []).map((t) => `[${t.status}] ${t.title}`).join("; ");
      const bugsSummary = (data.bugs || []).map((b) => `[${b.status}] ${b.title}`).join("; ");
      const testerName = data.user?.name || "Engineering Team Member";

      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_standup",
          payload: {
            runsSummary,
            bugsSummary,
            testerName,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to generate standup");
      }

      const parsed = parseStandupResponse(json.data || {});
      if (parsed.yesterday) setYesterday(parsed.yesterday);
      if (parsed.today) setToday(parsed.today);

      const hasBlockerText = Boolean(
        parsed.blockers &&
        !/^none(\s*currently)?\.?$/i.test(parsed.blockers.trim()) &&
        !/^no\s+blockers?\.?$/i.test(parsed.blockers.trim())
      );
      setHasBlocker(hasBlockerText);
      setBlockers(hasBlockerText ? parsed.blockers : "");

      toast("Autonomous standup generated successfully!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate standup", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyForSlack = async () => {
    const dateFormatted = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const standupSnippet = [
      `*Daily Standup - ${data?.user?.name || "Team Member"} (${dateFormatted})*`,
      `*Project:* ${project || "General"}`,
      "",
      `*Yesterday:*`,
      yesterday || "- None",
      "",
      `*Today:*`,
      today || "- None",
      "",
      `*Blockers:*`,
      hasBlocker && blockers ? blockers : "None",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(standupSnippet);
      toast("Copied standup for Slack / Teams to clipboard!", "success");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = standupSnippet;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast("Copied standup for Slack / Teams to clipboard!", "success");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const title = `Daily Standup - ${data?.user?.name || "User"} (${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`;
    const content = `Yesterday:\n${yesterday}\n\nToday:\n${today}\n\nBlockers:\n${hasBlocker ? blockers : "None"}`;

    try {
      const res = await fetch("/api/items/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project,
          attendees: data?.user?.name || "User",
          content,
          actionItems: hasBlocker ? blockers : "",
          relatedItems: "",
          date: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast("Daily standup logged successfully!", "success");
      router.refresh();
    } catch {
      toast("Failed to log standup", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500 py-10">Preparing standup context...</div>;
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="glass-card bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-slate-900">New Daily Log</h3>
                {activeModel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                    <Sparkle size={11} weight="bold" />
                    <span>{activeModel}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutonomousStandup}
                  disabled={generating}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  <Sparkle size={14} weight="bold" className={generating ? "animate-spin" : ""} />
                  {generating ? "Generating..." : "Autonomous AI Standup"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyForSlack}
                  disabled={!yesterday && !today}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ClipboardText size={14} weight="bold" />
                  📋 Copy for Slack / Teams
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Active Project</label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="h-10 w-full glass-card px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                placeholder="e.g. Mobile App, E-Commerce QA, Core Platform"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">What did you do yesterday?</label>
              <AutoResizeTextarea
                value={yesterday}
                onChange={(e) => setYesterday(e.target.value)}
                rows={3}
                maxHeight={240}
                placeholder={"- Worked on...\n- Executed test suite for login flow\n- Verified resolved bug #42"}
                className="glass-card p-3 font-mono text-xs text-slate-950 placeholder:text-slate-400 leading-relaxed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">What is your focus for today?</label>
              <AutoResizeTextarea
                value={today}
                onChange={(e) => setToday(e.target.value)}
                rows={3}
                maxHeight={240}
                placeholder={"- Focus on...\n- Run regression test on staging\n- Review test cases with team"}
                className="glass-card p-3 font-mono text-xs text-slate-950 placeholder:text-slate-400 leading-relaxed"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasBlocker}
                  onChange={(e) => setHasBlocker(e.target.checked)}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Warning size={14} weight="bold" className="text-amber-500" /> Do you have any blockers?
                </span>
              </label>

              {hasBlocker && (
                <AutoResizeTextarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  rows={2}
                  maxHeight={200}
                  placeholder="Describe your blockers or assistance needed..."
                  className="glass-card p-3 font-mono text-xs text-slate-950 leading-relaxed border-amber-300 bg-amber-50/20"
                  required
                />
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-10 w-full items-center justify-center gap-2 bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <FloppyDiskBack size={16} weight="bold" />
              {submitting ? "Saving..." : "Log Daily Standup"}
            </button>
          </form>
        </div>

        {/* Context Sidebar */}
        <div className="space-y-4">
          {/* Active Work Context */}
          <div className="glass-card bg-slate-50/50 p-5 space-y-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Work Items</h4>

            {/* Tasks */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Kanban size={12} weight="bold" /> Assigned Tasks ({data?.tasks?.length || 0})
              </span>
              <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
                {data?.tasks && data.tasks.length > 0 ? (
                  data.tasks.map((t) => (
                    <div key={t.id} className="glass-card bg-white p-2.5 text-xs">
                      <div className="font-semibold text-slate-950 line-clamp-1">{t.title}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{t.project}</span>
                        <span className="font-medium text-blue-600 capitalize">{t.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-400">No active tasks assigned</div>
                )}
              </div>
            </div>

            {/* Bugs */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Bug size={12} weight="bold" /> Assigned Bugs ({data?.bugs?.length || 0})
              </span>
              <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
                {data?.bugs && data.bugs.length > 0 ? (
                  data.bugs.map((b) => (
                    <div key={b.id} className="glass-card bg-white p-2.5 text-xs">
                      <div className="font-semibold text-slate-950 line-clamp-1">{b.title}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{b.project}</span>
                        <span className="font-medium text-rose-600 capitalize">{b.severity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-400">No active bugs assigned</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Standup History */}
          <div className="glass-card bg-white p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Clock size={14} weight="bold" /> Recent Standups
            </h4>
            <div className="space-y-3">
              {data?.recentStandups && data.recentStandups.length > 0 ? (
                data.recentStandups.map((note) => (
                  <div key={note.id} className="border-l-2 border-slate-200 pl-3 space-y-1">
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">{note.title}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(note.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                    <pre className="text-[10px] text-slate-600 font-mono line-clamp-3 bg-slate-50 p-1.5 overflow-hidden">
                      {note.content}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No recent standup notes found</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Autonomous AI Standup Engine"
      />
    </>
  );
}