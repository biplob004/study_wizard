// Exercise 3 — Match words ↔ images.
// Tap a word, then tap its image. Correct pairs lock in green; a wrong attempt
// flashes red. The round is correct only if completed with no mistakes.
import { useMemo, useState } from "react";
import ImageBox from "../components/ImageBox";
import { shuffle } from "../lib/random";

function MatchPairs({ items, onResult }) {
  const words = useMemo(() => shuffle(items), [items]);
  const images = useMemo(() => shuffle(items), [items]);

  const [selectedWord, setSelectedWord] = useState(null);
  const [matched, setMatched] = useState(() => new Set());
  const [wrongImage, setWrongImage] = useState(null);
  const [hadError, setHadError] = useState(false);

  function selectWord(item) {
    if (matched.has(item.id)) return;
    setSelectedWord(item.id);
    setWrongImage(null);
  }

  function selectImage(item) {
    if (!selectedWord || matched.has(item.id)) return;
    if (item.id === selectedWord) {
      const next = new Set(matched);
      next.add(item.id);
      setMatched(next);
      setSelectedWord(null);
      if (next.size === items.length) {
        onResult(!hadError, {
          message: hadError ? "All matched — watch the slips next time." : "All matched!",
        });
      }
    } else {
      setHadError(true);
      setWrongImage(item.id);
      setTimeout(() => setWrongImage(null), 450);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-lg font-semibold text-slate-700">Match each word to its picture</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2.5">
          {words.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={matched.has(w.id)}
              onClick={() => selectWord(w)}
              className={`rounded-xl border-2 px-3 py-3 font-medium transition ${
                matched.has(w.id)
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : selectedWord === w.id
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white hover:border-indigo-400"
              }`}
            >
              {w.word}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {images.map((im) => (
            <button
              key={im.id}
              type="button"
              disabled={matched.has(im.id)}
              onClick={() => selectImage(im)}
              className={`overflow-hidden rounded-xl ring-2 transition ${
                matched.has(im.id)
                  ? "ring-emerald-500 ring-4"
                  : wrongImage === im.id
                    ? "animate-shake ring-rose-400 ring-4"
                    : "ring-slate-200 hover:ring-indigo-400"
              }`}
            >
              <ImageBox src={im.image} alt={im.word} className="h-24 w-full" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default {
  id: "match-pairs",
  name: "Match the pairs",
  needs: 4,
  usesLLM: false,
  Component: MatchPairs,
};
