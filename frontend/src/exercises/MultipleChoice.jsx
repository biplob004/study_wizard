// Exercise 1 — Image → Multiple Choice.
// Show the image, pick the correct sentence from 5 options.
import { useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import OptionButton from "../components/OptionButton";
import { pickDistractors, shuffle } from "../lib/random";

function MultipleChoice({ items, pool, onResult }) {
  const target = items[0];
  const options = useMemo(() => {
    const distractors = pickDistractors(target, pool, 4);
    return shuffle([target, ...distractors]);
  }, [target, pool]);

  const [picked, setPicked] = useState(null);

  function choose(option) {
    if (picked) return;
    setPicked(option);
    const correct = option.id === target.id;
    onResult(correct, {
      message: correct ? "Correct!" : `That was “${target.sentence}”`,
    });
  }

  function stateFor(option) {
    if (!picked) return "idle";
    if (option.id === target.id) return "correct";
    if (option.id === picked.id) return "wrong";
    return "idle";
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">What is happening?</p>
      <ImageBox src={target.image} alt={target.word} className="mx-auto h-56 w-full max-w-sm" />
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => (
          <OptionButton key={opt.id} state={stateFor(opt)} disabled={!!picked} onClick={() => choose(opt)}>
            {opt.sentence}
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

export default {
  id: "multiple-choice",
  name: "Choose the sentence",
  needs: 1,
  usesLLM: false,
  Component: MultipleChoice,
};
