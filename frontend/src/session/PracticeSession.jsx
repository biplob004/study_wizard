// Orchestrates a Vocabulary Practice session: loads data from the backend,
// serves random exercises, and tracks score/streak across a fixed number of rounds.
import { useCallback, useEffect, useState } from "react";
import { getVocabulary } from "../api/client";
import { availableExercises } from "../exercises/registry";
import { pickOne, sample } from "../lib/random";
import SessionHeader from "../components/SessionHeader";
import FeedbackBanner from "../components/FeedbackBanner";

const TOTAL_ROUNDS = 10;

export default function PracticeSession() {
  const [phase, setPhase] = useState("loading"); // loading | error | intro | playing | summary
  const [pool, setPool] = useState([]);
  const [round, setRound] = useState(null); // { exercise, items, key }
  const [roundNo, setRoundNo] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, message }

  useEffect(() => {
    getVocabulary()
      .then((data) => {
        setPool(data);
        setPhase(availableExercises(data.length).length ? "intro" : "error");
      })
      .catch(() => setPhase("error"));
  }, []);

  const nextRound = useCallback(() => {
    const options = availableExercises(pool.length).filter(
      (ex) => !round || ex.id !== round.exercise.id || availableExercises(pool.length).length === 1,
    );
    const exercise = pickOne(options.length ? options : availableExercises(pool.length));
    const items = sample(pool, exercise.needs);
    setRound({ exercise, items, key: `${exercise.id}-${Date.now()}` });
    setFeedback(null);
  }, [pool, round]);

  function start() {
    setScore(0);
    setStreak(0);
    setRoundNo(1);
    setFeedback(null);
    setPhase("playing");
    const exercise = pickOne(availableExercises(pool.length));
    setRound({ exercise, items: sample(pool, exercise.needs), key: `${exercise.id}-${Date.now()}` });
  }

  function handleResult(correct, detail = {}) {
    if (feedback) return; // guard against double submits
    setFeedback({ correct, message: detail.message });
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function advance() {
    if (roundNo >= TOTAL_ROUNDS) {
      setPhase("summary");
      return;
    }
    setRoundNo((n) => n + 1);
    nextRound();
  }

  if (phase === "loading") {
    return <Centered>Loading vocabulary…</Centered>;
  }

  if (phase === "error") {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-lg font-semibold text-rose-600">Couldn’t load the exercises.</p>
          <p className="mt-1 text-sm text-slate-500">
            Make sure the backend is running at the URL in <code>VITE_API_BASE</code> and has at least
            two vocabulary entries.
          </p>
        </div>
      </Centered>
    );
  }

  if (phase === "intro") {
    return (
      <Centered>
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">📚</div>
          <h1 className="text-3xl font-extrabold text-slate-800">Vocabulary Practice</h1>
          <p className="mt-3 text-slate-500">
            {TOTAL_ROUNDS} quick rounds, mixed exercise types. Look, listen, match and type your way
            through {pool.length} words.
          </p>
          <button
            onClick={start}
            className="mt-6 rounded-xl bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            Start practicing →
          </button>
        </div>
      </Centered>
    );
  }

  if (phase === "summary") {
    const pct = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <Centered>
        <div className="max-w-md text-center">
          <div className="mb-3 text-6xl">{pct >= 70 ? "🎉" : "💪"}</div>
          <h2 className="text-2xl font-extrabold text-slate-800">Session complete!</h2>
          <p className="mt-2 text-slate-500">
            You scored <span className="font-bold text-indigo-600">{score}</span> / {TOTAL_ROUNDS} ({pct}%).
          </p>
          <button
            onClick={start}
            className="mt-6 rounded-xl bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            Practice again
          </button>
        </div>
      </Centered>
    );
  }

  const { exercise, items, key } = round;
  const Exercise = exercise.Component;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur sm:p-8">
        <SessionHeader
          round={roundNo}
          total={TOTAL_ROUNDS}
          score={score}
          streak={streak}
          exerciseName={exercise.name}
        />
        <Exercise key={key} items={items} pool={pool} onResult={handleResult} />
        {feedback && (
          <div className="mt-6">
            <FeedbackBanner correct={feedback.correct} message={feedback.message} onNext={advance} />
          </div>
        )}
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-slate-600">{children}</div>
  );
}
