// Exercise 7 — Listen & choose.
// Plays the pre-generated clip for the word (with a speech-synthesis fallback);
// pick the matching image.
import { useEffect, useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import { pickDistractors, shuffle } from "../lib/random";
import { playWord } from "../lib/audio";

function ListenChoose({ items, pool, onResult }) {
  const target = items[0];
  const choices = useMemo(
    () => shuffle([target, ...pickDistractors(target, pool, 3)]),
    [target, pool],
  );
  const [picked, setPicked] = useState(null);
  const supported = typeof window !== "undefined" && (!!window.speechSynthesis || !!target.audio);

  useEffect(() => playWord(target), [target]);

  function choose(choice) {
    if (picked) return;
    setPicked(choice);
    const correct = choice.id === target.id;
    onResult(correct, { message: correct ? "Correct!" : `It was “${target.word}”.` });
  }

  function ring(choice) {
    if (!picked) return "ring-slate-200 hover:ring-indigo-400";
    if (choice.id === target.id) return "ring-emerald-500 ring-4";
    if (choice.id === picked.id) return "ring-rose-400 ring-4";
    return "ring-slate-200 opacity-60";
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">Listen, then pick the picture</p>
      <button
        type="button"
        onClick={() => playWord(target)}
        className="mx-auto flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        🔊 Play the word
      </button>
      {!supported && (
        <p className="text-center text-sm text-rose-500">
          Your browser can’t play audio — the word is “{target.word}”.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            disabled={!!picked}
            onClick={() => choose(choice)}
            className={`overflow-hidden rounded-2xl bg-white ring-2 transition disabled:cursor-not-allowed ${ring(choice)}`}
          >
            <ImageBox src={choice.image} alt={choice.word} className="h-36 w-full" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default {
  id: "listen-choose",
  name: "Listen & choose",
  needs: 1,
  usesLLM: false,
  Component: ListenChoose,
};
