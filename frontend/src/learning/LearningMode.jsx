// Learning mode — a calm, self-paced way to study the vocabulary.
//
// Two views:
//  - Gallery: every word as a card (picture + name below); click one to open it.
//  - Card:    one large card with the picture and name; the word auto-plays on open
//             and on every prev/next move. Arrow keys work too.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVocabulary } from "../api/client";
import { playWord } from "../lib/audio";
import ImageBox from "../components/ImageBox";

export default function LearningMode() {
  const [phase, setPhase] = useState("loading"); // loading | error | ready
  const [items, setItems] = useState([]);
  const [openIndex, setOpenIndex] = useState(null); // null = gallery view
  const stopRef = useRef(() => {});

  useEffect(() => {
    getVocabulary()
      .then((data) => {
        setItems(data);
        setPhase(data.length ? "ready" : "error");
      })
      .catch(() => setPhase("error"));
  }, []);

  const play = useCallback((item) => {
    stopRef.current();
    stopRef.current = playWord(item);
  }, []);

  // Auto-play whenever a card is open and the index changes.
  useEffect(() => {
    if (openIndex == null) return undefined;
    play(items[openIndex]);
    return () => stopRef.current();
  }, [openIndex, items, play]);

  const open = (index) => setOpenIndex(index);
  const close = () => {
    stopRef.current();
    setOpenIndex(null);
  };
  const move = useCallback(
    (delta) => setOpenIndex((i) => (i == null ? i : (i + delta + items.length) % items.length)),
    [items.length],
  );

  // Keyboard navigation while a card is open.
  useEffect(() => {
    if (openIndex == null) return undefined;
    function onKey(e) {
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, move]);

  if (phase === "loading") return <Centered>Loading vocabulary…</Centered>;
  if (phase === "error") {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-lg font-semibold text-rose-600">Couldn’t load the words.</p>
          <p className="mt-1 text-sm text-slate-500">
            Make sure the backend is running at the URL in <code>VITE_API_BASE</code>.
          </p>
        </div>
      </Centered>
    );
  }

  if (openIndex != null) {
    return (
      <CardView
        item={items[openIndex]}
        index={openIndex}
        total={items.length}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        onReplay={() => play(items[openIndex])}
        onClose={close}
      />
    );
  }

  return <Gallery items={items} onOpen={open} />;
}

function Gallery({ items, onOpen }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-16">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">Learning mode</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tap a card to see it big and hear the word. {items.length} words to explore.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(index)}
            className="group flex flex-col overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-100 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-indigo-300"
          >
            <ImageBox src={item.image} alt={item.word} className="aspect-square w-full" />
            <span className="px-2 py-2 text-center text-sm font-semibold capitalize text-slate-700 group-hover:text-indigo-600">
              {item.word}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CardView({ item, index, total, onPrev, onNext, onReplay, onClose }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-8 pt-16">
      <div className="mb-4 flex items-center justify-between text-sm font-medium text-slate-500">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 transition hover:bg-white hover:text-indigo-600"
        >
          ← Gallery
        </button>
        <span>
          {index + 1} / {total}
        </span>
      </div>

      <div className="flex flex-1 flex-col rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur sm:p-8">
        <ImageBox src={item.image} alt={item.word} className="aspect-square w-full" />

        <div className="mt-5 flex items-center justify-center gap-3">
          <h2 className="text-3xl font-extrabold capitalize text-slate-800">{item.word}</h2>
          <button
            type="button"
            onClick={onReplay}
            title="Play the word"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg text-white shadow-sm transition hover:bg-indigo-700"
          >
            🔊
          </button>
        </div>
        {item.sentence && (
          <p className="mt-2 text-center text-slate-500">{item.sentence}</p>
        )}
        {item.category && (
          <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wide text-indigo-400">
            {item.category}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <button
            type="button"
            onClick={onPrev}
            className="flex-1 rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-slate-600">{children}</div>
  );
}
