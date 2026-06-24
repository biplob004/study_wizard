// A course's modules (e.g. "Learn Vocabulary"). Tapping an available module opens it.
import PageHeader from "../components/PageHeader";
import SelectionCard from "../components/SelectionCard";

const ACCENTS = ["from-indigo-500 to-cyan-400", "from-fuchsia-500 to-amber-400", "from-emerald-500 to-teal-400"];

export default function CourseScreen({ course, onOpenModule }) {
  const modules = course.modules ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <PageHeader emoji={course.emoji} title={course.title} subtitle={course.blurb} />

      {modules.length === 0 ? (
        <p className="text-center text-slate-500">No modules yet — check back soon.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, i) => (
            <SelectionCard
              key={module.id}
              emoji={module.emoji}
              title={module.title}
              blurb={module.blurb}
              cta="Open"
              accent={ACCENTS[i % ACCENTS.length]}
              disabled={!module.available}
              onClick={() => onOpenModule(module)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
