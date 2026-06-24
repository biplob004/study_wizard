// Exercise 4 — Word → Pick the image.
// Show a word, choose which of 4 images matches it.
import { useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import { pickDistractors, shuffle } from "../lib/random";

function PickImage({ items, pool, onResult }) {
  const target = items[0];
  const choices = useMemo(
    () => shuffle([target, ...pickDistractors(target, pool, 3)]),
    [target, pool],
  );
  const [picked, setPicked] = useState(null);

  function choose(choice) {
    if (picked) return;
    setPicked(choice);
    const correct = choice.id === target.id;
    onResult(correct, { message: correct ? "Correct!" : `That was “${target.word}”.` });
  }

  function ring(choice) {
    if (!picked) return "ring-slate-200 hover:ring-indigo-400";
    if (choice.id === target.id) return "ring-emerald-500 ring-4";
    if (choice.id === picked.id) return "ring-rose-400 ring-4";
    return "ring-slate-200 opacity-60";
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">
        Tap the picture for: <span className="text-indigo-600">{target.word}</span>
      </p>
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
  id: "pick-image",
  name: "Pick the picture",
  needs: 1,
  usesLLM: false,
  Component: PickImage,
};
