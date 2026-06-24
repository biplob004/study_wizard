// Orchestrates a Vocabulary Practice session: loads data from the backend,
// serves random exercises, and tracks score/streak across a fixed number of rounds.
import { useCallback, useEffect, useRef, useState } from "react";
import { getCourseContent, getPracticeExposures, recordPractice } from "../../api/client";
import { availableExercises } from "../../exercises/registry";
import { pickOne, weightedSample } from "../../lib/random";
import SessionHeader from "../../components/SessionHeader";
import FeedbackBanner from "../../components/FeedbackBanner";

const COURSE_ID = "vocabulary";
const TOTAL_ROUNDS = 15;

// Weight for an item given how many times it's been shown before. Less-exposed
// items get a higher weight so sessions spread across the whole dataset.
const EXPOSURE_DECAY = 0.5;
const weightFor = (timesShown) => 1 / (1 + timesShown * EXPOSURE_DECAY);

export default function Practice({ onFinish }) {
  const [phase, setPhase] = useState("loading"); // loading | error | playing | summary
  const [pool, setPool] = useState([]);
  const [round, setRound] = useState(null); // { exercise, items, key }
  const [roundNo, setRoundNo] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, message }
  // Exposure map (item_id -> times shown) and the set of items shown this session.
  const exposuresRef = useRef({});
  const shownRef = useRef(new Set());

  // Build a sampler that down-weights previously-asked items but still allows
  // repeats when the pool is small or an item's needs can't otherwise be met.
  const pickItems = useCallback((data, needs) => {
    const exposures = exposuresRef.current;
    const weightOf = (item) => weightFor(exposures[item.id] ?? 0);
    const chosen = weightedSample(data, needs, weightOf);
    chosen.forEach((it) => shownRef.current.add(it.id));
    return chosen;
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCourseContent(COURSE_ID), getPracticeExposures(COURSE_ID)])
      .then(([data, exposures]) => {
        if (cancelled) return;
        setPool(data);
        exposuresRef.current = exposures || {};
        if (!availableExercises(data.length).length) {
          setPhase("error");
          return;
        }
        start(data);
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const nextRound = useCallback(() => {
    const options = availableExercises(pool.length).filter(
      (ex) => !round || ex.id !== round.exercise.id || availableExercises(pool.length).length === 1,
    );
    const exercise = pickOne(options.length ? options : availableExercises(pool.length));
    const items = pickItems(pool, exercise.needs);
    setRound({ exercise, items, key: `${exercise.id}-${Date.now()}` });
    setFeedback(null);
  }, [pool, round, pickItems]);

  function start(data = pool) {
    setScore(0);
    setStreak(0);
    setRoundNo(1);
    setFeedback(null);
    shownRef.current = new Set();
    setPhase("playing");
    const exercise = pickOne(availableExercises(data.length));
    const items = pickItems(data, exercise.needs);
    setRound({ exercise, items, key: `${exercise.id}-${Date.now()}` });
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
      // Save the score plus the items shown this session (for exposure tracking).
      recordPractice(COURSE_ID, {
        score,
        total: TOTAL_ROUNDS,
        itemIds: [...shownRef.current],
      }).catch(() => {});
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
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={start}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              Practice again
            </button>
            {onFinish && (
              <button
                onClick={onFinish}
                className="rounded-xl border border-slate-200 px-8 py-3 text-lg font-semibold text-slate-600 transition hover:text-indigo-600"
              >
                Back to dashboard
              </button>
            )}
          </div>
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
