// Exercise 5 — Fill in the blank (LLM-judged).
// The sentence has the key word blanked out; type the missing word.
import { useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import { checkAnswer } from "../api/client";

function blankOut(sentence, word) {
  const re = new RegExp(word, "i");
  if (re.test(sentence)) return sentence.replace(re, "_____");
  return `${sentence.replace(/\.$/, "")} — _____.`;
}

function FillBlank({ items, onResult }) {
  const target = items[0];
  const prompt = useMemo(() => blankOut(target.sentence, target.word), [target]);
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
        exerciseType: "fill-blank",
        expected: target.word,
        sentence: target.sentence,
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
      <p className="text-center text-lg font-semibold text-slate-700">Fill in the missing word</p>
      <ImageBox src={target.image} alt="hint" className="mx-auto h-48 w-full max-w-xs" />
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xl text-slate-800">{prompt}</p>
      <input
        type="text"
        value={value}
        autoFocus
        disabled={done}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type the word…"
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
  id: "fill-blank",
  name: "Fill the blank",
  needs: 1,
  usesLLM: true,
  Component: FillBlank,
};
