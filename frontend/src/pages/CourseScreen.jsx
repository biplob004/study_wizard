// A course's home: shows the course's own tracking details plus its activities
// (Learn / Practice) directly — no extra module nesting in between.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseProgress } from "../api/client";
import { useCourse } from "../catalog/hooks";
import { getCoursePlugin } from "../courses/registry";
import PageHeader from "../components/PageHeader";
import SelectionCard from "../components/SelectionCard";

const ACCENTS = ["from-indigo-500 to-cyan-400", "from-fuchsia-500 to-amber-400", "from-emerald-500 to-teal-400"];

export default function CourseScreen() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = useCourse(courseId);
  const [progress, setProgress] = useState(null);

  // Collect all activity ids across the course's modules (preserving order).
  const activityIds = (course?.modules ?? [])
    .filter((m) => m.available)
    .flatMap((m) => m.activities ?? []);

  useEffect(() => {
    if (!course) return;
    getCourseProgress(course.id)
      .then(setProgress)
      .catch(() => setProgress(null));
  }, [course]);

  if (course === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center text-slate-400">
        Loading course…
      </div>
    );
  }
  if (course === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center text-slate-500">
        <p>This course doesn’t exist.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const plugin = getCoursePlugin(course.id);
  const startActivity = (id) => navigate(`/courses/${course.id}/${id}`);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <PageHeader emoji={course.emoji} title={course.title} subtitle={course.blurb} />

      <CourseProgressPanel course={course} progress={progress} />

      <h2 className="mb-4 mt-10 text-lg font-bold text-slate-800">Activities</h2>
      {activityIds.length === 0 ? (
        <p className="text-center text-slate-500">No activities yet — check back soon.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activityIds.map((id, i) => {
            const activity = plugin?.activities?.[id];
            if (!activity) return null;
            return (
              <SelectionCard
                key={id}
                emoji={activity.emoji}
                title={activity.title}
                blurb={activity.blurb}
                cta={activity.cta}
                accent={ACCENTS[i % ACCENTS.length]}
                onClick={() => startActivity(id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseProgressPanel({ course, progress }) {
  if (!progress) {
    return (
      <section className="rounded-3xl bg-white/80 p-6 text-center shadow-xl ring-1 ring-slate-100 backdrop-blur">
        <p className="text-sm text-slate-400">Loading your progress…</p>
      </section>
    );
  }

  const {
    items_learned,
    total_items,
    practice_sessions,
    total_stars,
    best_score_pct,
    card_flip_sessions = 0,
    card_flip_stars = 0,
    card_flip_best_pct = 0,
  } = progress;
  const pct = total_items ? Math.round((items_learned / total_items) * 100) : 0;
  const started = items_learned > 0 || practice_sessions > 0 || card_flip_sessions > 0;

  if (!started) {
    return (
      <section className="rounded-3xl bg-white/80 p-6 text-center shadow-xl ring-1 ring-slate-100 backdrop-blur">
        <div className="mb-2 text-4xl">🚀</div>
        <p className="font-semibold text-slate-700">Not started yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Pick an activity below to begin your {course.title} journey.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Items learned" value={`${items_learned}/${total_items}`} />
        <Stat label="Practice sessions" value={practice_sessions} />
        <Stat label="Best score" value={`${best_score_pct}%`} />
        <Stat label="Stars earned" value={`⭐ ${total_stars}`} />
      </div>

      {card_flip_sessions > 0 && (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-700">
            <span className="text-lg">🃏</span> Card Flip memory game
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Games played" value={card_flip_sessions} />
            <Stat label="Best score" value={`${card_flip_best_pct}%`} />
            <Stat label="Stars earned" value={`⭐ ${card_flip_stars}`} />
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
          <span>{course.title} progress</span>
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
