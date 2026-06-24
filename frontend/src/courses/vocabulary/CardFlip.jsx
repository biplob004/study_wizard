// Card Flip memory game activity.
//
// Each round:
//  1. Four cards are dealt face-down, then revealed for 4 seconds.
//  2. The cards flip back face-down.
//  3. A target word is shown; the learner taps the card they think matches.
//  4. Feedback is given and the next round begins.
// After TOTAL_ROUNDS rounds a summary is shown (mirrors Practice's flow).
import { useEffect, useState } from "react";
import { getCourseContent, recordPractice } from "../../api/client";
import { sample, shuffle } from "../../lib/random";
import SessionHeader from "../../components/SessionHeader";
import FeedbackBanner from "../../components/FeedbackBanner";
import ImageBox from "../../components/ImageBox";

const COURSE_ID = "vocabulary";
const TOTAL_ROUNDS = 10;
const MEMORIZE_MS = 4000;

export default function CardFlip({ onFinish }) {
  const [phase, setPhase] = useState("loading"); // loading | error | playing | summary
  const [pool, setPool] = useState([]);
  const [round, setRound] = useState(null); // { cards, target, key }
  const [roundNo, setRoundNo] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [shownRef] = useState(() => ({ current: new Set() }));

  function start(data = pool) {
    setScore(0);
    setStreak(0);
    setRoundNo(1);
    setFeedback(null);
    shownRef.current = new Set();
    setPhase("playing");
    setRound(makeRound(data, shownRef));
  }

  useEffect(() => {
    let cancelled = false;
    getCourseContent(COURSE_ID)
      .then((data) => {
        if (cancelled) return;
        setPool(data);
        if (data.length < 4) {
          setPhase("error");
          return;
        }
        start(data);
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nextRound() {
    if (roundNo >= TOTAL_ROUNDS) {
      setPhase("summary");
      recordPractice(COURSE_ID, {
        score,
        total: TOTAL_ROUNDS,
        itemIds: [...shownRef.current],
        activity: "card-flip",
      }).catch(() => {});
      return;
    }
    setRoundNo((n) => n + 1);
    setRound(makeRound(pool, shownRef));
  }

  function handleResult(correct, detail = {}) {
    if (feedback) return;
    setFeedback({ correct, message: detail.message });
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  if (phase === "loading") return <Centered>Loading vocabulary…</Centered>;

  if (phase === "error") {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-lg font-semibold text-rose-600">Couldn't load the cards.</p>
          <p className="mt-1 text-sm text-slate-500">
            Make sure the backend is running and has at least four vocabulary entries.
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
          <h2 className="text-2xl font-extrabold text-slate-800">Card Flip complete!</h2>
          <p className="mt-2 text-slate-500">
            You scored <span className="font-bold text-indigo-600">{score}</span> / {TOTAL_ROUNDS} ({pct}%).
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => start()}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              Play again
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

  const { cards, target, key } = round;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur sm:p-8">
        <SessionHeader
          round={roundNo}
          total={TOTAL_ROUNDS}
          score={score}
          streak={streak}
          exerciseName="Card Flip"
        />
        <Round key={key} cards={cards} target={target} onResult={handleResult} />
        {feedback && (
          <div className="mt-6">
            <FeedbackBanner
              correct={feedback.correct}
              message={feedback.message}
              onNext={nextRound}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function makeRound(pool, shownRef) {
  const cards = sample(pool, 4);
  cards.forEach((c) => shownRef.current.add(c.id));
  const target = cards[Math.floor(Math.random() * cards.length)];
  const shuffled = shuffle(cards);
  return { cards: shuffled, target, key: `${target.id}-${Date.now()}` };
}

// A single round: memorize the face-up cards, then pick the target.
function Round({ cards, target, onResult }) {
  // reveal -> memorize -> flip-down -> pick -> locked
  const [stage, setStage] = useState("reveal");
  const [picked, setPicked] = useState(null);
  const [countdown, setCountdown] = useState(MEMORIZE_MS);

  // Brief reveal animation, then start the memorize countdown.
  useEffect(() => {
    const t = setTimeout(() => setStage("memorize"), 500);
    return () => clearTimeout(t);
  }, []);

  // Countdown during the memorize phase, then flip the cards down.
  useEffect(() => {
    if (stage !== "memorize") return undefined;
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, MEMORIZE_MS - (Date.now() - start));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        setStage("flip-down");
      }
    }, 50);
    return () => clearInterval(id);
  }, [stage]);

  // After the flip-down animation, let the user pick.
  useEffect(() => {
    if (stage !== "flip-down") return undefined;
    const t = setTimeout(() => setStage("pick"), 600);
    return () => clearTimeout(t);
  }, [stage]);

  function choose(card) {
    if (stage !== "pick" || picked) return;
    setPicked(card);
    const correct = card.id === target.id;
    onResult(correct, {
      message: correct ? "Correct — nice memory!" : `That was “${target.word}”.`,
    });
  }

  function faceUp() {
    if (stage === "reveal" || stage === "memorize") return true;
    if (stage === "pick" || stage === "locked") return false;
    // flip-down transition: keep them up briefly then flip
    return false;
  }

  const showTarget = stage === "pick" || stage === "locked" || picked !== null;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-lg font-semibold text-slate-700">
        {showTarget ? (
          <>
            Find the card for: <span className="text-indigo-600">{target.word}</span>
          </>
        ) : (
          <>
            Memorize the cards!{" "}
            <span className="text-indigo-600">{Math.ceil(countdown / 1000)}s</span>
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const up = faceUp();
          const isTarget = card.id === target.id;
          const isPicked = picked?.id === card.id;
          const revealed = picked !== null;

          return (
            <button
              key={card.id}
              type="button"
              disabled={stage !== "pick" || picked !== null}
              onClick={() => choose(card)}
              className={`group relative overflow-hidden rounded-2xl ring-2 transition disabled:cursor-not-allowed ${
                revealed
                  ? isTarget
                    ? "ring-emerald-500 ring-4"
                    : isPicked
                    ? "ring-rose-400 ring-4"
                    : "ring-slate-200 opacity-60"
                  : "ring-slate-200 hover:ring-indigo-400"
              }`}
            >
              <div className="relative aspect-square w-full">
                {/* Face up: image + word */}
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white p-2 transition-all duration-500 ${
                    up || revealed ? "opacity-100" : "rotate-y-180 opacity-0"
                  }`}
                >
                  <ImageBox src={card.image} alt={card.word} className="h-24 w-full" />
                  <span className="text-sm font-semibold capitalize text-slate-700">
                    {card.word}
                  </span>
                </div>
                {/* Face down: the card back */}
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-cyan-400 transition-all duration-500 ${
                    up || revealed ? "rotate-y-180 opacity-0" : "opacity-100"
                  }`}
                >
                  <span className="text-4xl">🃏</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-slate-600">
      {children}
    </div>
  );
}
