// Shown after an answer. Displays correct/incorrect plus optional LLM feedback,
// and a Next button to advance the session.
export default function FeedbackBanner({ correct, message, onNext, checking }) {
  if (checking) {
    return (
      <div className="animate-pop rounded-2xl bg-slate-100 px-5 py-4 text-center text-slate-600">
        Checking your answer…
      </div>
    );
  }

  return (
    <div
      className={`animate-pop flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{correct ? "✅" : "❌"}</span>
        <span className="font-medium">{message || (correct ? "Correct!" : "Not quite.")}</span>
      </div>
      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Next →
      </button>
    </div>
  );
}
