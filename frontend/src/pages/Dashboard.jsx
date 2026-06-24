// Home screen for a signed-in learner: a progress overview, then the course catalog.
import { useEffect, useState } from "react";
import { getCourses, getProgressSummary } from "../api/client";
import { useAuth } from "../auth/context";
import PageHeader from "../components/PageHeader";
import SelectionCard from "../components/SelectionCard";

const ACCENTS = ["from-indigo-500 to-cyan-400", "from-fuchsia-500 to-amber-400", "from-emerald-500 to-teal-400"];

export default function Dashboard({ onOpenCourse }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getCourses(), getProgressSummary()])
      .then(([c, s]) => {
        setCourses(c);
        setSummary(s);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <PageHeader
        align="left"
        title={`Welcome back, ${user?.display_name}! 👋`}
        subtitle="Pick up where you left off, or start something new."
      />

      <ProgressOverview summary={summary} error={error} />

      <h2 className="mb-4 mt-10 text-lg font-bold text-slate-800">Courses</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course, i) => (
          <SelectionCard
            key={course.id}
            emoji={course.emoji}
            title={course.title}
            blurb={course.blurb}
            cta="Open course"
            accent={ACCENTS[i % ACCENTS.length]}
            disabled={!course.available}
            onClick={() => onOpenCourse(course)}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressOverview({ summary, error }) {
  if (error) {
    return (
      <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
        Couldn’t load your progress. Make sure the backend is running.
      </p>
    );
  }

  const pct = summary && summary.total_words ? Math.round((summary.words_learned / summary.total_words) * 100) : 0;

  return (
    <section className="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Words learned" value={summary ? `${summary.words_learned}/${summary.total_words}` : "—"} />
        <Stat label="Practice sessions" value={summary ? summary.practice_sessions : "—"} />
        <Stat label="Best score" value={summary ? `${summary.best_score_pct}%` : "—"} />
        <Stat label="Stars earned" value={summary ? `⭐ ${summary.total_stars}` : "—"} />
      </div>
      <div className="mt-5">
        <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
          <span>Vocabulary progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
