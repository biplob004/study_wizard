// Landing + Dashboard merged: a welcoming hero for the Education Site with an
// embedded per-course progress overview and the course catalog. Logged-in users
// see their stats and a "Continue" path; the page is the home screen.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProgressSummary, getDailyTime } from "../api/client";
import { useAuth } from "../auth/context";
import { useCatalog } from "../catalog/hooks";
import SelectionCard from "../components/SelectionCard";
import { buildTimeSummary, formatDuration } from "../lib/time";
import TaskTracker from "../tasks/TaskTracker";

const ACCENTS = [
  "from-indigo-500 to-cyan-400",
  "from-fuchsia-500 to-amber-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-orange-400",
  "from-violet-500 to-blue-400",
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courses, error: catalogError } = useCatalog();
  const [progress, setProgress] = useState([]); // [{course_id, ...}]
  const [timeRows, setTimeRows] = useState([]); // [{day, seconds}]
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getProgressSummary(), getDailyTime()])
      .then(([p, t]) => {
        setProgress(p);
        setTimeRows(t);
      })
      .catch(() => setError(true));
  }, []);

  const openCourse = (course) => navigate(`/courses/${course.id}`);

  const progressById = new Map(progress.map((p) => [p.course_id, p]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Hero user={user} />

      {error || catalogError ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          Couldn’t load your courses. Make sure the backend is running.
        </p>
      ) : (
        <ProgressOverview progress={progress} timeRows={timeRows} />
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold text-slate-800">Courses</h2>
          <span className="text-sm text-slate-400">{(courses ?? []).length} available</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((course, i) => {
            const p = progressById.get(course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={p}
                accent={ACCENTS[i % ACCENTS.length]}
                onOpen={() => openCourse(course)}
              />
            );
          })}
          {courses === null && !catalogError && (
            <p className="col-span-full text-center text-sm text-slate-400">Loading courses…</p>
          )}
        </div>
      </section>

      <section className="mt-12 rounded-3xl bg-white/60 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur">
        <TaskTracker />
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

function ProgressOverview({ progress, timeRows }) {
  const activeCourses = (progress || []).filter((p) => (p.items_learned || 0) > 0).length;

  return (
    <section className="mt-8 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Stat label="Courses started" value={activeCourses} />
        <TimePanel timeRows={timeRows} />
      </div>
    </section>
  );
}

// Time spent on the site, focused, over the last 7 days — shown to the right of
// the course count. Heights are relative to the busiest of the seven days.
function TimePanel({ timeRows }) {
  const { last7, today, weeklyAverage } = buildTimeSummary(timeRows);
  const chrono = [...last7].reverse(); // oldest → today, left to right
  const peak = Math.max(1, ...chrono.map((d) => d.seconds));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 px-4 py-3 ring-1 ring-indigo-100/60">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <span>⏱️</span>
          <span>Time on site · last 7 days</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold leading-none text-slate-800">
            {formatDuration(today)}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            today
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-1.5">
        {chrono.map((d) => {
          const h = Math.round((d.seconds / peak) * 100);
          const isToday = d.label === "Today";
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${formatDuration(d.seconds)}`}>
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[1.6rem] rounded-md transition-all ${
                    isToday
                      ? "bg-gradient-to-t from-indigo-600 to-cyan-400"
                      : d.seconds > 0
                        ? "bg-indigo-300"
                        : "bg-slate-200"
                  }`}
                  style={{ height: `${Math.max(d.seconds > 0 ? 6 : 3, h)}%` }}
                />
              </div>
              <span
                className={`text-[9px] font-semibold ${
                  d.isSunday ? "text-rose-400" : "text-slate-400"
                }`}
              >
                {d.label === "Today" ? "Today" : d.label === "Yesterday" ? "Yest" : d.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-indigo-100/70 pt-2 text-center">
        <span className="text-sm font-bold text-slate-700">{formatDuration(weeklyAverage)}</span>
        <span className="ml-1.5 text-xs font-medium text-slate-500">weekly avg · per day since Sunday</span>
      </div>
    </div>
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
