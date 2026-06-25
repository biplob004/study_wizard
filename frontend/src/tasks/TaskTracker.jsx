// The Tasks & Habits tracker — a cross-cutting daily habit tracker (merged
// from the standalone HabitFlow app), embedded on the landing page. Loads the
// learner's per-day check-offs from /api/tasks/state, lets them mark each
// habit done/failed and tweak per-day points, and saves debounced. Past/future
// days are read-only; only today is editable.
import { useState, useEffect, useCallback, useRef } from "react";
import { getTaskState, saveTaskState, addTaskHabit, deleteTaskHabit } from "../api/client";
import { isoDate, startOfDay } from "./dateUtils";
import { dayTasks, findDay, computeDayPoints } from "./taskUtils";
import Stats from "./Stats";
import Calendar from "./Calendar";
import TaskPanel from "./TaskPanel";
import AddHabitModal from "./AddHabitModal";

const EMPTY = { recurring: [], data: [] };

function withUpdatedDay(state, ds, fn) {
  const prevDay = findDay(state.data, ds);
  const day = prevDay
    ? { ...prevDay, tasks: prevDay.tasks.map((t) => ({ ...t })) }
    : { date: ds, tasks: [], dayPoints: 0 };
  fn(day);
  day.dayPoints = computeDayPoints(day);
  const exists = !!prevDay;
  const data = exists
    ? state.data.map((d) => (d.date === ds ? day : d))
    : [...state.data, day].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { ...state, data };
}

export default function TaskTracker() {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [today] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [toast, setToast] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const saveTimer = useRef();
  const toastTimer = useRef();

  useEffect(() => {
    getTaskState()
      .then((d) => { setState(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTaskState(state.data).catch((e) => showToast("Save failed: " + e.message));
    }, 400);
  }, [state]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  const update = useCallback((fn) => setState((prev) => fn(prev)), []);

  function handleSetStatus(i, status) {
    const ds = isoDate(selected);
    update((prev) => {
      const items = dayTasks(selected, prev);
      const it = items[i];
      return withUpdatedDay(prev, ds, (day) => {
        let t = day.tasks.find((x) => x.text === it.text);
        if (!t) { t = { text: it.text, points: it.points, status: "pending" }; day.tasks.push(t); }
        t.status = status === "pending" ? "pending" : status;
      });
    });
  }

  function handleEditPoints(i, rawPoints) {
    const parsed = parseInt(rawPoints, 10);
    const points = isNaN(parsed) ? 0 : parsed;
    const ds = isoDate(selected);
    update((prev) => {
      const items = dayTasks(selected, prev);
      const it = items[i];
      return withUpdatedDay(prev, ds, (day) => {
        let t = day.tasks.find((x) => x.text === it.text);
        if (!t) { t = { text: it.text, points, status: "pending" }; day.tasks.push(t); }
        else t.points = points;
      });
    });
    showToast("Points updated");
  }

  function handleAddHabit(text, points) {
    return addTaskHabit(text, points).then((res) => {
      setState((prev) => ({ ...prev, recurring: res.recurring }));
      showToast("Habit added");
    });
  }

  function handleDeleteHabit(index) {
    deleteTaskHabit(index)
      .then((res) => {
        setState((prev) => ({ ...prev, recurring: res.recurring }));
        showToast("Habit removed");
      })
      .catch((e) => showToast("Delete failed: " + e.message));
  }

  function handlePrev() {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }
  function handleNext() {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }
  function handleToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelected(startOfDay(new Date()));
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading your tasks…</p>;
  }
  if (error) {
    return (
      <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
        Couldn’t load your tasks. {error}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-md">
            ✓
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Tasks &amp; Habits</h2>
            <p className="text-xs text-slate-500">Track habits, build streaks, earn points</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <span className="text-base leading-none">＋</span>
            <span className="hidden sm:inline">Add habit</span>
            <span className="sm:hidden">Add</span>
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500" />
            <span className="hidden md:inline">{today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            <span className="md:hidden">{today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      <Stats state={state} today={today} />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <Calendar
          viewYear={viewYear}
          viewMonth={viewMonth}
          selected={selected}
          today={today}
          state={state}
          onSelect={setSelected}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />
        <TaskPanel
          selected={selected}
          today={today}
          state={state}
          onSetStatus={handleSetStatus}
          onEditPoints={handleEditPoints}
          onDeleteHabit={handleDeleteHabit}
        />
      </div>

      <AddHabitModal
        key={showAdd ? "open" : "closed"}
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddHabit}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
