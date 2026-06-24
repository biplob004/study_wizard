// Landing screen: pick how you want to study. Learning mode is a calm,
// self-paced gallery; Practice mode is the scored exercise session.
const MODES = [
  {
    id: "learning",
    emoji: "📖",
    title: "Learning mode",
    blurb: "Browse the words at your own pace. See each picture, hear it spoken, and flip through cards.",
    cta: "Start learning",
    accent: "from-indigo-500 to-cyan-400",
  },
  {
    id: "practice",
    emoji: "🎯",
    title: "Practice mode",
    blurb: "Test yourself with mixed exercises — multiple choice, matching, typing and more. Keep a streak going.",
    cta: "Start practicing",
    accent: "from-fuchsia-500 to-amber-400",
  },
];

export default function ModePicker({ onPick }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-3 text-6xl">📚</div>
        <h1 className="text-3xl font-extrabold text-slate-800 sm:text-4xl">Vocabulary Studio</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-500">
          Choose a mode to get started. You can switch any time.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onPick(mode.id)}
              className="group flex flex-col items-start rounded-3xl bg-white/80 p-6 text-left shadow-xl ring-1 ring-slate-100 backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${mode.accent}`}
              >
                <span>{mode.emoji}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800">{mode.title}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-500">{mode.blurb}</p>
              <span
                className={`mt-5 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r px-5 py-2 text-sm font-semibold text-white shadow-sm ${mode.accent}`}
              >
                {mode.cta} →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
