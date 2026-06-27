// Example-sentences panel for a vocabulary card.
//
// Lists a word's sentences (global, shared by all users), lets the learner generate
// more (up to 10), and plays audio. Tapping a sentence reveals its Hindi translation
// and description and three play buttons (sentence / translation / description); the
// translation & description audio are synthesized lazily on first play, then cached.
//
// Exposes playFirst() so the parent can auto-play the first sentence after the word.
// The parent gives this component a `key` of the word id, so it remounts (with fresh
// state) whenever the open word changes.
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getSentences, generateSentence, getSentenceAudio } from "../../api/client";
import { playAudioUrl } from "../../lib/audio";

const COURSE_ID = "vocabulary";
const MAX_SENTENCES = 10;

const Sentences = forwardRef(function Sentences({ item }, ref) {
  const [sentences, setSentences] = useState([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [busyKey, setBusyKey] = useState(null); // `${id}:${kind}` while fetching audio

  const stopRef = useRef(() => {});
  const latestRef = useRef([]); // latest sentences, for the imperative playFirst()
  const pendingFirstRef = useRef(false);

  useEffect(() => {
    latestRef.current = sentences;
  }, [sentences]);

  const play = useCallback((url) => {
    stopRef.current();
    stopRef.current = playAudioUrl(url);
  }, []);

  // Play the first sentence's audio. Called by the parent after the word finishes;
  // if sentences haven't loaded yet, remember and play as soon as they arrive.
  const playFirst = useCallback(() => {
    const first = latestRef.current[0];
    if (!first) {
      pendingFirstRef.current = true;
      return;
    }
    play(first.sentenceAudio);
  }, [play]);

  useImperativeHandle(ref, () => ({ playFirst }), [playFirst]);

  // Load once on mount (the parent remounts us via `key` when the word changes).
  useEffect(() => {
    let alive = true;
    getSentences(COURSE_ID, item.id)
      .then((data) => {
        if (!alive) return;
        const list = data.sentences || [];
        latestRef.current = list;
        setSentences(list);
        setCanGenerate(Boolean(data.canGenerate));
        setStatus("ready");
        if (pendingFirstRef.current) {
          pendingFirstRef.current = false;
          if (list[0]) play(list[0].sentenceAudio);
        }
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
      stopRef.current();
    };
  }, [item.id, play]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError("");
    try {
      const created = await generateSentence(COURSE_ID, item.id);
      setSentences((prev) => {
        const next = [...prev, created];
        setCanGenerate(next.length < MAX_SENTENCES);
        return next;
      });
      setExpandedId(created.id);
    } catch (err) {
      setError(err.message || "Couldn’t generate a sentence.");
      if (/at most/i.test(err.message || "")) setCanGenerate(false);
    } finally {
      setGenerating(false);
    }
  };

  // Play a given clip for a sentence, fetching+caching its audio if needed.
  const playKind = async (sentence, kind) => {
    setError("");
    if (kind === "sentence" && sentence.sentenceAudio) {
      play(sentence.sentenceAudio);
      return;
    }
    const key = `${sentence.id}:${kind}`;
    setBusyKey(key);
    try {
      const { audio } = await getSentenceAudio(COURSE_ID, item.id, sentence.id, kind);
      play(audio);
    } catch (err) {
      setError(err.message || "Couldn’t play that audio.");
    } finally {
      setBusyKey((k) => (k === key ? null : k));
    }
  };

  if (status === "loading") {
    return <p className="mt-4 text-center text-sm text-slate-400">Loading sentences…</p>;
  }
  if (status === "error") {
    return <p className="mt-4 text-center text-sm text-rose-500">Couldn’t load sentences.</p>;
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sentences ({sentences.length}/{MAX_SENTENCES})
        </h3>
        {canGenerate && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100 transition hover:bg-indigo-100 disabled:opacity-60"
          >
            {generating ? "Generating…" : "＋ Generate"}
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-center text-xs text-rose-500">{error}</p>}

      <ul className="space-y-2">
        {sentences.map((s) => {
          const open = expandedId === s.id;
          return (
            <li
              key={s.id}
              className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-100"
            >
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : s.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <span>{s.sentence}</span>
                <span className="text-slate-300">{open ? "▾" : "▸"}</span>
              </button>

              {open && (
                <div className="border-t border-slate-100 px-3 py-2">
                  {s.translation && (
                    <p className="text-sm text-slate-600">{s.translation}</p>
                  )}
                  {s.description && (
                    <p className="mt-1 text-xs text-slate-500">{s.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <PlayBtn
                      label="🔊 Sentence"
                      busy={busyKey === `${s.id}:sentence`}
                      onClick={() => playKind(s, "sentence")}
                    />
                    <PlayBtn
                      label="🔊 हिंदी"
                      busy={busyKey === `${s.id}:translation`}
                      onClick={() => playKind(s, "translation")}
                    />
                    <PlayBtn
                      label="🔊 Description"
                      busy={busyKey === `${s.id}:description`}
                      onClick={() => playKind(s, "description")}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

function PlayBtn({ label, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
    >
      {busy ? "…" : label}
    </button>
  );
}

export default Sentences;
