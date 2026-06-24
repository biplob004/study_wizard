// Small helpers for the focus-time dashboard. All day math is done in the
// learner's LOCAL timezone so "today" lines up with their wall clock, and weeks
// start on Sunday (getDay() === 0).

/** Local calendar day as "YYYY-MM-DD" (not UTC). */
export function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** A date N days before `from` (local). */
function daysAgo(n, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Compact human duration, e.g. "1h 23m", "45m", "30s", "0m". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/**
 * Turn the backend's [{day, seconds}] rows into everything the dashboard needs:
 * the last 7 days (today first), today/yesterday totals, and the current week's
 * average (Sunday → today).
 */
export function buildTimeSummary(rows, now = new Date()) {
  const byDay = new Map((rows || []).map((r) => [r.day, r.seconds]));

  // Last 7 days, today first.
  const last7 = [];
  for (let i = 0; i < 7; i++) {
    const date = daysAgo(i, now);
    const seconds = byDay.get(localDayKey(date)) || 0;
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : WEEKDAYS[date.getDay()];
    last7.push({ key: localDayKey(date), date, seconds, label, isSunday: date.getDay() === 0 });
  }

  // Current week so far: from the most recent Sunday through today.
  const elapsedThisWeek = now.getDay() + 1; // Sun=1 day in, Sat=7
  let weekTotal = 0;
  for (let i = 0; i < elapsedThisWeek; i++) {
    weekTotal += byDay.get(localDayKey(daysAgo(i, now))) || 0;
  }

  return {
    last7, // [today, yesterday, … 7 entries]
    today: last7[0].seconds,
    yesterday: last7[1].seconds,
    weeklyAverage: Math.round(weekTotal / elapsedThisWeek),
    weekTotal,
  };
}
