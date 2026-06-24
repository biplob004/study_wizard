// Exercise 2 — Image → Type Answer (LLM-judged).
// Type what the picture shows; the backend (Gemini) decides if it's acceptable.
import { useState } from "react";
import ImageBox from "../components/ImageBox";
import { checkAnswer } from "../api/client";

function TypeAnswer({ items, onResult }) {
  const target = items[0];
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (checking || done || !value.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const result = await checkAnswer({
        exerciseType: "type-answer",
        expected: target.word,
        userAnswer: value,
      });
      setDone(true);
      onResult(result.correct, { message: result.feedback });
    } catch (err) {
      setError("Couldn’t reach the checker. Is the backend running?");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">What is in the picture?</p>
      <ImageBox src={target.image} alt="describe me" className="mx-auto h-56 w-full max-w-sm" />
      <input
        type="text"
        value={value}
        autoFocus
        disabled={done}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a word…"
        className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
      />
      {error && <p className="text-center text-sm text-rose-500">{error}</p>}
      <button
        type="submit"
        disabled={checking || done || !value.trim()}
        className="mx-auto rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
      >
        {checking ? "Checking…" : "Submit"}
      </button>
    </form>
  );
}

export default {
  id: "type-answer",
  name: "Type the word",
  needs: 1,
  usesLLM: true,
  Component: TypeAnswer,
};
