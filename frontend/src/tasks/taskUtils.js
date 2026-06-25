import { isoDate, addDays } from "./dateUtils.js";

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function findDay(data, ds) {
  return data.find((d) => d.date === ds);
}

export function taskStatus(day, text) {
  if (!day) return "pending";
  const t = day.tasks.find((x) => x.text === text);
  return t && (t.status === "done" || t.status === "skipped") ? t.status : "pending";
}

export function taskPoints(recur, day, text) {
  const base = toNum(recur.points);
  if (!day) return base;
  const t = day.tasks.find((x) => x.text === text);
  return t && t.points != null ? toNum(t.points, base) : base;
}

export function isOverridden(recur, day, text) {
  if (!day || !recur) return false;
  const t = day.tasks.find((x) => x.text === text);
  if (!t) return false;
  return toNum(t.points) !== toNum(recur.points);
}

export function ensureDay(state, ds) {
  let day = findDay(state.data, ds);
  if (!day) {
    day = { date: ds, tasks: [], dayPoints: 0 };
    state.data = [...state.data, day].sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  return day;
}

export function dayTasks(date, state) {
  const ds = isoDate(date);
  const day = findDay(state.data, ds);
  return state.recurring.map((r, i) => ({
    kind: "recur",
    idx: i,
    text: r.text,
    basePoints: toNum(r.points),
    points: taskPoints(r, day, r.text),
    overridden: isOverridden(r, day, r.text),
    status: taskStatus(day, r.text),
    habit: r,
  }));
}

export function dayStatus(date, state) {
  const items = dayTasks(date, state);
  if (!items.length) return "none";
  const done = items.filter((i) => i.status === "done").length;
  if (done === items.length) return "done";
  if (done > 0) return "partial";
  return "scheduled";
}

// Day points are derived on the fly from the tasks of habits that are
// currently in the user's recurring list. We do not trust any stored
// `dayPoints` snapshot — iterating the current habits means deleting a habit
// or tweaking its points automatically re-prices every past day.
export function computeDayPoints(day, state) {
  if (!day) return 0;
  const recurring = state ? new Set(state.recurring.map((h) => h.text)) : null;
  let total = 0;
  day.tasks.forEach((t) => {
    if (t.status !== "done") return;
    if (recurring && !recurring.has(t.text)) return;
    total += toNum(t.points);
  });
  return total;
}

export function dayPoints(date, state) {
  const ds = isoDate(date);
  const day = findDay(state.data, ds);
  return computeDayPoints(day, state);
}

export function monthPoints(year, month, state) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  let total = 0;
  state.data.forEach((day) => {
    if (day.date.startsWith(prefix)) total += computeDayPoints(day, state);
  });
  return total;
}

export function habitStreakInState(recur, state, upToDate) {
  let streak = 0;
  let d = new Date(upToDate);
  const x = new Date(upToDate);
  x.setHours(0, 0, 0, 0);
  if (taskStatus(findDay(state.data, isoDate(d)), recur.text) !== "done") {
    d = addDays(d, -1);
  }
  while (taskStatus(findDay(state.data, isoDate(d)), recur.text) === "done") {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}
