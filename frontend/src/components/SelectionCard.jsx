// A single tappable card used on every selection screen (courses, modules, activities)
// so they all share one look. Disabled cards show a muted "Coming soon" treatment.
export default function SelectionCard({
  emoji,
  title,
  blurb,
  cta,
  accent = "from-indigo-500 to-cyan-400",
  disabled = false,
  badge,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`group flex h-full flex-col items-start rounded-3xl bg-white/80 p-6 text-left shadow-xl ring-1 ring-slate-100 backdrop-blur transition ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-1 hover:shadow-2xl hover:ring-indigo-200"
      }`}
    >
      <div className="mb-4 flex w-full items-start justify-between">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${accent}`}
        >
          <span>{emoji}</span>
        </div>
        {badge && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {badge}
          </span>
        )}
      </div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {blurb && <p className="mt-2 flex-1 text-sm text-slate-500">{blurb}</p>}
      {cta && !disabled && (
        <span
          className={`mt-5 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r px-5 py-2 text-sm font-semibold text-white shadow-sm ${accent}`}
        >
          {cta} →
        </span>
      )}
      {disabled && (
        <span className="mt-5 inline-flex items-center rounded-xl bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-400">
          Coming soon
        </span>
      )}
    </button>
  );
}
