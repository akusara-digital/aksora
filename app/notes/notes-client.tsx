"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass, NotePencil, Plus, PushPin, Trash, X, Funnel } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormDrawer } from "@/components/shared/form-drawer";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { cn } from "@/lib/utils";

type Note = {
  id: number;
  title: string;
  content: string;
  color: string;
  pinned: number;
  updatedAt: string;
};

const COLORS = ["default", "amber", "emerald", "sky", "rose"] as const;

const COLOR_DOT: Record<string, string> = {
  default: "bg-slate-300",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  rose: "bg-rose-400",
};

export function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pinned">("all");
  const [filterColor, setFilterColor] = useState<string>("all");

  const [editing, setEditing] = useState<Note | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<string>("default");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to load notes.");
      const data = await res.json();
      setNotes(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setColor("default");
    setDrawerOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      toast("Note must have a title or content.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/notes/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content, color }),
          })
        : await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content, color }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save note.");
      }
      toast(editing ? "Note updated" : "Note created", "success");
      setDrawerOpen(false);
      fetchNotes();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save note.", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error("Failed to update note.");
      fetchNotes();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update note.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note.");
      toast("Note deleted", "success");
      fetchNotes();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete note.", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (filterTab === "pinned" && !n.pinned) return false;
    if (filterColor !== "all" && n.color !== filterColor) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.content && n.content.toLowerCase().includes(q))
    );
  });

  const pinnedCount = notes.filter((n) => Boolean(n.pinned)).length;

  return (
    <>
      <section className="overflow-hidden bg-white border border-gray-200">
        {/* Header Row */}
        <div className="border-b border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700 border border-blue-100">
                  <NotePencil size={18} weight="bold" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">Personal Notes</h2>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">Your private notes. Only you can see these.</p>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-2.5 lg:w-auto lg:flex-1 lg:justify-end">
              <div className="relative w-full min-w-0 md:w-56 lg:max-w-56">
                <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                  <MagnifyingGlass size={14} weight="bold" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="h-8 w-full border border-gray-200 bg-white pl-8 pr-7 text-[13px] outline-none transition-colors focus:border-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={12} weight="bold" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-[13px] font-bold text-white transition hover:bg-blue-700 shadow-xs shrink-0"
              >
                <Plus size={14} weight="bold" className="shrink-0" />
                <span>New Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Toolbar Row */}
        <div className="sticky top-0 z-[var(--z-sticky)] border-b border-gray-200 bg-white px-4 sm:px-5 py-2.5 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: View Tabs */}
            <div className="flex h-8 items-center border border-gray-200 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "h-full px-3 text-[12px] font-medium transition-colors cursor-pointer",
                  filterTab === "all"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                All Notes ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("pinned")}
                className={cn(
                  "h-full border-l border-gray-200 px-3 text-[12px] font-medium transition-colors cursor-pointer",
                  filterTab === "pinned"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                Pinned ({pinnedCount})
              </button>
            </div>

            {/* Right: Filters & Info */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                <Funnel size={13} weight="bold" />
                Filters
              </span>

              <div className="relative">
                <select
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                  aria-label="Filter by color"
                  className={cn(
                    "h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition touch-manipulation cursor-pointer capitalize",
                    filterColor !== "all"
                      ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                  )}
                >
                  <option value="all">All Colors</option>
                  {COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {(filterColor !== "all" || filterTab !== "all" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterColor("all");
                    setFilterTab("all");
                    setSearch("");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
                >
                  <X size={11} weight="bold" />
                  Clear
                </button>
              )}

              <div className="h-4 w-px bg-gray-200 hidden sm:block" />

              <span className="text-xs font-medium text-gray-400 hidden sm:inline">
                {filteredNotes.length} note{filteredNotes.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">

      {error && <InlineAlert variant="error" message={error} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <NotePencil size={20} weight="bold" />
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">No notes yet</p>
          <p className="text-xs text-slate-400">Click &quot;New Note&quot; to jot something down.</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <MagnifyingGlass size={20} weight="bold" />
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">No notes match your search</p>
          <p className="text-xs text-slate-400">Try searching with a different title or keyword.</p>
          <button
            onClick={() => setSearch("")}
            className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => openEdit(note)} className="flex min-w-0 items-center gap-2 text-left">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", COLOR_DOT[note.color] ?? COLOR_DOT.default)} />
                  <span className="truncate text-sm font-bold text-slate-900">{note.title || "Untitled"}</span>
                </button>
                {/* Actions: always visible on mobile, hover-reveal only on md+ */}
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => togglePin(note)}
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                    className={cn("rounded p-1 hover:bg-slate-100", note.pinned ? "text-amber-500" : "text-slate-400")}
                  >
                    <PushPin size={14} weight={note.pinned ? "fill" : "bold"} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(note)}
                    aria-label="Delete note"
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
              </div>
              <button onClick={() => openEdit(note)} className="mt-2 flex-1 text-left">
                <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">{note.content || "No content"}</p>
              </button>
              <p className="mt-3 text-[11px] text-slate-400">
                {new Date(note.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>

  <FormDrawer
    open={drawerOpen}
    title={editing ? "Edit Note" : "New Note"}
    onClose={() => setDrawerOpen(false)}
    size="md"
  >
    <div className="space-y-4 p-5">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Content</label>
        <AutoResizeTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something..."
          rows={4}
          maxHeight={320}
          className="px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Color</label>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={cn(
                "h-9 w-9 rounded-full border-2",
                COLOR_DOT[c],
                color === c ? "border-slate-900" : "border-transparent",
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </FormDrawer>

  <ConfirmModal
    isOpen={Boolean(deleteTarget)}
    title="Delete Note"
    message={`Are you sure you want to delete "${deleteTarget?.title || "this note"}"? This cannot be undone.`}
    confirmText={deleting ? "Deleting..." : "Yes, Delete"}
    cancelText="Cancel"
    type="danger"
    onConfirm={handleDeleteConfirm}
    onCancel={() => setDeleteTarget(null)}
  />
</>
  );
}
