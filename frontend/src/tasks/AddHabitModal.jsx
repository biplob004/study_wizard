// Popup window for adding a new recurring habit. The parent controls
// visibility via `open` and should pass a `key` that changes when it opens so
// the form remounts with fresh defaults. `onAdd(text, points)` should return a
// Promise so the modal can show a saving state and surface errors inline.
import { useEffect, useState } from "react";

export default function AddHabitModal({ open, onClose, onAdd }) {
  const [text, setText] = useState("");
  const [points, setPoints] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Close on Escape (unless saving).
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) {
      setError("Please enter a habit name.");
      return;
    }
    const parsed = parseInt(points, 10);
    const pts = isNaN(parsed) ? 0 : parsed;
    setSaving(true);
    setError("");
    Promise.resolve(onAdd(t, pts))
      .then(() => {
        setSaving(false);
        onClose();
      })
      .catch((err) => {
        setSaving(false);
        setError(err?.message || "Failed to add habit.");
      });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg text-white shadow-md">
              ＋
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">New habit</h3>
              <p className="text-xs text-slate-500">Add a recurring task to your daily tracker</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Habit name
            </label>
            <input
              type="text"
              autoFocus
              maxLength={120}
              placeholder="e.g. Drink 8 glasses of water"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Points{" "}
              <span className="font-normal text-slate-400">
                (negative for bad habits)
              </span>
            </label>
            <input
              type="number"
              placeholder="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
