// The selected day's task list: mark each habit done/skipped and tweak the
// points it earned for that day. Only today is editable; other days are
// read-only (view history, streaks, and points).
import { useState } from "react";
import { sameDay, DAY_NAMES } from "./dateUtils";
import { dayTasks, dayPoints, habitStreakInState } from "./taskUtils";

export default function TaskPanel({ selected, today, state, onSetStatus, onEditPoints, onDeleteHabit }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");

  const isToday = sameDay(selected, today);
  const readOnly = !isToday;
  const items = dayTasks(selected, state);
  const done = items.filter((i) => i.status === "done").length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const earned = dayPoints(selected, state);

  function openEdit(i) {
    if (readOnly) return;
    setEditIdx(i);
    setEditVal(String(items[i].points));
  }
  function saveEdit(i) {
    onEditPoints(i, editVal);
    setEditIdx(null);
  }

  return (
    <div className="rounded-3xl bg-white/80 p-5 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-slate-800">
            {DAY_NAMES[(selected.getDay() + 6) % 7]}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {isToday ? " · Today" : readOnly ? " · Read only" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="min-w-[2rem] text-xs font-semibold text-slate-500">{pct}%</span>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
        <span>⭐</span>
        <span>
          Points earned on this day: <strong className="text-amber-600">{earned}</strong>
        </span>
      </div>

      <div className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto pr-1">
        {!items.length ? (
          <div className="py-10 text-center text-slate-400">
            <div className="mb-2 text-3xl">🌤️</div>
            <p className="text-sm">
              No habits yet. Use the{" "}
              <span className="font-semibold text-indigo-600">＋ Add habit</span> button
              to create one.
            </p>
          </div>
        ) : (
          items.map((it, i) => {
            const streak = habitStreakInState(it.habit, state, selected);
            const isNeg = it.points < 0;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  it.status === "done"
                    ? "border-transparent bg-slate-50/70 opacity-60"
                    : it.status === "skipped"
                      ? "border-rose-200 bg-rose-50/50"
                      : "border-slate-100 bg-slate-50/70"
                }`}
              >
                <div className="flex flex-shrink-0 gap-1.5">
                  <button
                    type="button"
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[13px] font-bold leading-none transition ${
                      it.status === "done"
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                        : "border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-500"
                    } ${readOnly ? "cursor-not-allowed opacity-45" : ""}`}
                    onClick={() => !readOnly && onSetStatus(i, it.status === "done" ? "pending" : "done")}
                    disabled={readOnly}
                    title={readOnly ? "Read only" : "Mark done"}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[13px] font-bold leading-none transition ${
                      it.status === "skipped"
                        ? "border-rose-500 bg-rose-500 text-white shadow-sm"
                        : "border-slate-300 text-slate-400 hover:border-rose-500 hover:text-rose-500"
                    } ${readOnly ? "cursor-not-allowed opacity-45" : ""}`}
                    onClick={() => !readOnly && onSetStatus(i, it.status === "skipped" ? "pending" : "skipped")}
                    disabled={readOnly}
                    title={readOnly ? "Read only" : "Mark skipped"}
                  >
                    ✕
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium break-words ${
                      it.status === "done" ? "text-slate-400 line-through" : it.status === "skipped" ? "text-rose-600" : "text-slate-700"
                    }`}
                  >
                    {it.text}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {streak > 0 && <span className="font-semibold text-amber-500">🔥 {streak}d</span>}
                    {it.status === "skipped" && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                        Skipped
                      </span>
                    )}
                    {it.overridden && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                        Custom pts
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {editIdx === i ? (
                    <input
                      type="number"
                      className="w-16 rounded-lg border border-amber-400 bg-white px-1.5 py-1 text-center text-sm text-slate-800 outline-none ring-2 ring-amber-200"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={() => saveEdit(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(i);
                        if (e.key === "Escape") setEditIdx(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className={`flex items-baseline gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        it.overridden
                          ? "bg-indigo-100 text-indigo-600"
                          : isNeg
                            ? "bg-rose-100 text-rose-600"
                            : "bg-amber-100 text-amber-600"
                      } ${readOnly ? "cursor-default opacity-70" : "hover:brightness-105"}`}
                      onClick={() => openEdit(i)}
                      disabled={readOnly}
                      title={readOnly ? "Read only" : "Edit points for this day"}
                    >
                      <span>{it.points}</span>
                      <span className="text-[9px] font-medium opacity-80">pts</span>
                    </button>
                  )}
                  {onDeleteHabit && (
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-slate-300 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${it.text}"? This removes it from your tracker for all days. Past completion history is kept.`,
                          )
                        ) {
                          onDeleteHabit(i);
                        }
                      }}
                      title="Delete this habit"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
