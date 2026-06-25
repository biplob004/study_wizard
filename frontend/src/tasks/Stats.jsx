// Summary stat cards for the daily tracker: today's progress, points earned
// today, this month's points, and last month's points.
import { dayTasks, dayPoints, monthPoints } from "./taskUtils";

const ACCENTS = [
  { ring: "ring-indigo-200", val: "text-indigo-600" },
  { ring: "ring-amber-200", val: "text-amber-500" },
  { ring: "ring-emerald-200", val: "text-emerald-600" },
  { ring: "ring-violet-200", val: "text-violet-600" },
];

export default function Stats({ state, today }) {
  const todays = dayTasks(today, state);
  const doneToday = todays.filter((t) => t.status === "done").length;
  const pct = todays.length ? Math.round((doneToday / todays.length) * 100) : 0;
  const ptsToday = dayPoints(today, state);

  const y = today.getFullYear();
  const m = today.getMonth();
  const prevYear = m === 0 ? y - 1 : y;
  const prevMonth = m === 0 ? 11 : m - 1;
  const thisMonthPts = monthPoints(y, m, state);
  const lastMonthPts = monthPoints(prevYear, prevMonth, state);

  const cards = [
    { ic: "📊", val: `${pct}%`, lbl: "Today progress" },
    { ic: "⭐", val: ptsToday, lbl: "Points earned today" },
    { ic: "📅", val: thisMonthPts, lbl: "This month points" },
    { ic: "🗓", val: lastMonthPts, lbl: "Last month points" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-2xl bg-white/80 p-4 shadow-sm ring-1 backdrop-blur ${ACCENTS[i].ring}`}
        >
          <span className="absolute right-3 top-3 text-base opacity-40">{c.ic}</span>
          <div className={`text-2xl font-extrabold tracking-tight ${ACCENTS[i].val}`}>
            {c.val}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">{c.lbl}</div>
        </div>
      ))}
    </div>
  );
}
