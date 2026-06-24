// Exercise 6 — Unscramble the word.
// Letter tiles are shuffled; tap to build the word, tap a placed tile to remove it.
import { useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import { shuffle } from "../lib/random";

function Unscramble({ items, onResult }) {
  const target = items[0];
  const letters = useMemo(() => {
    const chars = target.word.toLowerCase().replace(/\s/g, "").split("");
    let scrambled = shuffle(chars);
    // Avoid handing back the already-solved word.
    if (scrambled.join("") === chars.join("") && chars.length > 1) {
      scrambled = shuffle(chars);
    }
    return scrambled.map((ch, i) => ({ ch, key: `${ch}-${i}` }));
  }, [target]);

  const [placed, setPlaced] = useState([]); // array of tile keys
  const [done, setDone] = useState(false);

  const placedKeys = new Set(placed);
  const built = placed.map((k) => letters.find((l) => l.key === k).ch).join("");
  const answer = target.word.toLowerCase().replace(/\s/g, "");

  function addTile(tile) {
    if (done || placedKeys.has(tile.key)) return;
    setPlaced([...placed, tile.key]);
  }
  function removeTile(key) {
    if (done) return;
    setPlaced(placed.filter((k) => k !== key));
  }
  function submit() {
    if (done) return;
    setDone(true);
    const correct = built === answer;
    onResult(correct, { message: correct ? "Correct!" : `It spells “${target.word}”.` });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">Unscramble the word</p>
      <ImageBox src={target.image} alt="hint" className="mx-auto h-44 w-full max-w-xs" />

      <div className="flex min-h-12 flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-2">
        {placed.length === 0 && <span className="text-sm text-slate-400">Tap letters below…</span>}
        {placed.map((key) => {
          const tile = letters.find((l) => l.key === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => removeTile(key)}
              className="h-11 w-11 rounded-lg bg-indigo-600 text-lg font-bold uppercase text-white shadow-sm"
            >
              {tile.ch}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {letters.map((tile) => (
          <button
            key={tile.key}
            type="button"
            disabled={placedKeys.has(tile.key) || done}
            onClick={() => addTile(tile)}
            className="h-11 w-11 rounded-lg border-2 border-slate-200 bg-white text-lg font-bold uppercase text-slate-700 transition hover:border-indigo-400 disabled:opacity-30"
          >
            {tile.ch}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={done || placed.length !== letters.length}
        className="mx-auto rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
      >
        Check
      </button>
    </div>
  );
}

export default {
  id: "unscramble",
  name: "Unscramble",
  needs: 1,
  usesLLM: false,
  Component: Unscramble,
};
