// Exercise 8 — True / False.
// Half the time the sentence is correct; otherwise the key word is swapped with a
// same-category word. Decide whether the sentence matches the image.
import { useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import { pickDistractors } from "../lib/random";

function TrueFalse({ items, pool, onResult }) {
  const target = items[0];

  const { sentence, isTrue } = useMemo(() => {
    const makeTrue = Math.random() < 0.5;
    if (makeTrue) return { sentence: target.sentence, isTrue: true };

    const distractor = pickDistractors(target, pool, 1)[0];
    if (!distractor) return { sentence: target.sentence, isTrue: true };
    // Swap the target word with the distractor's word (case-insensitive).
    const swapped = target.sentence.replace(new RegExp(target.word, "i"), distractor.word);
    // If the word wasn't literally present, fall back to a clearly false sentence.
    const text = swapped === target.sentence ? `This is ${distractor.word}.` : swapped;
    return { sentence: text, isTrue: false };
  }, [target, pool]);

  const [answered, setAnswered] = useState(false);

  function answer(choice) {
    if (answered) return;
    setAnswered(true);
    const correct = choice === isTrue;
    onResult(correct, {
      message: correct ? "Correct!" : isTrue ? "It was actually True." : "It was actually False.",
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">Does the sentence match the picture?</p>
      <ImageBox src={target.image} alt={target.word} className="mx-auto h-48 w-full max-w-xs" />
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-lg text-slate-800">“{sentence}”</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={answered}
          onClick={() => answer(true)}
          className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-lg font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
        >
          ✓ True
        </button>
        <button
          type="button"
          disabled={answered}
          onClick={() => answer(false)}
          className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-4 text-lg font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
        >
          ✗ False
        </button>
      </div>
    </div>
  );
}

export default {
  id: "true-false",
  name: "True or False",
  needs: 1,
  usesLLM: false,
  Component: TrueFalse,
};
