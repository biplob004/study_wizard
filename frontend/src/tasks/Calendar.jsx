// Month calendar for the daily tracker. Each day cell shows its status dot
// (all done / partial / scheduled) and points earned, with a hover tooltip.
import { MONTHS, DAY_SHORT, sameDay } from "./dateUtils";
import { dayStatus, dayPoints } from "./taskUtils";

const DOT = {
  done: "bg-emerald-500",
  partial: "bg-amber-400",
  scheduled: "bg-indigo-500",
};

export default function Calendar({
  viewYear, viewMonth, selected, today, state, onSelect, onPrev, onNext, onToday,
}) {
  const first = new Date(viewYear, viewMonth, 1);
  let startOffset = first.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  return (
    <div className="rounded-3xl bg-white/80 p-5 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            ◀
          </button>
          <span className="min-w-[8rem] text-center text-sm font-semibold text-slate-700">
            {`${MONTHS[viewMonth]} ${viewYear}`}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
          >
            Today
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {DAY_SHORT.map((d) => (
          <span
            key={d}
            className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;
          const status = dayStatus(date, state);
          const pts = dayPoints(date, state);
          const isToday = sameDay(date, today);
          const isSel = sameDay(date, selected);
          let cls = "group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border transition";
          if (isSel) cls += " bg-indigo-50 border-indigo-400";
          else if (status === "done") cls += " bg-emerald-50/70 border-transparent hover:bg-emerald-50";
          else cls += " bg-slate-50 border-transparent hover:bg-slate-100";
          if (isToday) cls += " ring-1 ring-indigo-400";
          const label =
            date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
            (pts > 0 ? ` — ${pts} pts` : " — 0 pts");
          return (
            <div key={i} className={cls} onClick={() => onSelect(date)} title={label}>
              <span
                className={`text-[13px] font-medium ${
                  isToday ? "text-indigo-600 font-bold" : status === "done" ? "text-emerald-600" : "text-slate-600"
                }`}
              >
                {date.getDate()}
              </span>
              {status !== "none" && (
                <span className="mt-1 h-1.5 w-1.5 rounded-full">
                  <span className={`block h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
                </span>
              )}
              {pts > 0 && (
                <span className="absolute right-1 top-1 rounded-full bg-amber-100 px-1.5 text-[9px] font-bold text-amber-600">
                  {pts}
                </span>
              )}
              <span className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {pts > 0 ? `${pts} pts earned` : "No points yet"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-emerald-500" /> All done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-amber-400" /> Partial
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-indigo-500" /> Scheduled
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-amber-400" /> Points earned
        </span>
      </div>
    </div>
  );
}
