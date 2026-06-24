// Landing + Dashboard merged: a welcoming hero for the Education Site with an
// embedded per-course progress overview and the course catalog. Logged-in users
// see their stats and a "Continue" path; the page is the home screen.
import { useEffect, useState } from "react";
import { getCourses, getProgressSummary } from "../api/client";
import { useAuth } from "../auth/context";
import SelectionCard from "../components/SelectionCard";

const ACCENTS = [
  "from-indigo-500 to-cyan-400",
  "from-fuchsia-500 to-amber-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-orange-400",
  "from-violet-500 to-blue-400",
];

export default function Landing({ onOpenCourse }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]); // [{course_id, ...}]
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getCourses(), getProgressSummary()])
      .then(([c, p]) => {
        setCourses(c);
        setProgress(p);
      })
      .catch(() => setError(true));
  }, []);

  const progressById = new Map(progress.map((p) => [p.course_id, p]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Hero user={user} />

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          Couldn’t load your courses. Make sure the backend is running.
        </p>
      ) : (
        <ProgressOverview progress={progress} />
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold text-slate-800">Courses</h2>
          <span className="text-sm text-slate-400">{courses.length} available</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => {
            const p = progressById.get(course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={p}
                accent={ACCENTS[i % ACCENTS.length]}
                onOpen={() => onOpenCourse(course)}
              />
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Hero({ user }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-8 text-white shadow-2xl sm:p-12">
      <div className="relative z-10 max-w-2xl">
        <div className="mb-3 text-5xl">🎓</div>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Welcome{user?.display_name ? `, ${user.display_name}` : ""}! Learn anything, one step at a time.
        </h1>
        <p className="mt-3 text-indigo-100">
          Pick a course, learn at your own pace, and track your progress. Vocabulary,
          Comprehensive Reading, Grammar and more — all in one place.
        </p>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 text-[12rem] opacity-20">📚</div>
      <div className="pointer-events-none absolute -bottom-12 -left-8 text-[9rem] opacity-10">✨</div>
    </section>
  );
}

function ProgressOverview({ progress }) {
  if (!progress || progress.length === 0) {
    return (
      <section className="mt-8 rounded-3xl bg-white/80 p-6 text-center shadow-xl ring-1 ring-slate-100 backdrop-blur">
        <div className="mb-2 text-4xl">🚀</div>
        <p className="font-semibold text-slate-700">Ready to begin?</p>
        <p className="mt-1 text-sm text-slate-500">
          Pick a course below to start your learning journey.
        </p>
      </section>
    );
  }

  const activeCourses = progress.filter((p) => (p.items_learned || 0) > 0).length;

  return (
    <section className="mt-8 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat label="Courses started" value={activeCourses} />
      </div>
    </section>
  );
}

function CourseCard({ course, progress, accent, onOpen }) {
  const itemsLearned = progress?.items_learned || 0;
  const totalItems = course.modules?.reduce((s, m) => s + (m.wordCount || 0), 0) || 0;
  const pct = totalItems ? Math.min(100, Math.round((itemsLearned / totalItems) * 100)) : 0;
  const inProgress = itemsLearned > 0;

  return (
    <SelectionCard
      emoji={course.emoji}
      title={course.title}
      blurb={course.blurb}
      cta={inProgress ? "Continue" : "Start"}
      accent={accent}
      disabled={!course.available}
      badge={inProgress ? `${pct}%` : undefined}
      onClick={onOpen}
    >
      {inProgress && totalItems > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${accent}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </SelectionCard>
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

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-100 pt-6 text-center text-sm text-slate-400">
      <p>🧙‍♂️ AI Study Wizard · Learn smarter, not harder.</p>
    </footer>
  );
}
