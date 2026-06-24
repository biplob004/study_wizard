// Top bar during a practice session: progress, score and streak.
export default function SessionHeader({ round, total, score, streak, exerciseName }) {
  const pct = total ? Math.min(100, Math.round((round / total) * 100)) : 0;
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-500">
        <span>
          Round {round} {total ? `/ ${total}` : ""}
        </span>
        <span className="flex items-center gap-3">
          <span title="Score" className="text-indigo-600">⭐ {score}</span>
          <span title="Streak" className="text-amber-600">🔥 {streak}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {exerciseName && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-500">
          {exerciseName}
        </p>
      )}
    </div>
  );
}
