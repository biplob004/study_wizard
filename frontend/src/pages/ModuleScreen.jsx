// A module's activities. For "Learn Vocabulary" that's Learn (self-paced gallery)
// and Practice (scored exercises). Replaces the old standalone mode picker.
import PageHeader from "../components/PageHeader";
import SelectionCard from "../components/SelectionCard";

const ACTIVITIES = {
  learn: {
    emoji: "📖",
    title: "Learn",
    blurb: "Browse the words at your own pace. See each picture, hear it spoken, and flip through cards.",
    cta: "Start learning",
    accent: "from-indigo-500 to-cyan-400",
  },
  practice: {
    emoji: "🎯",
    title: "Practice",
    blurb: "Test yourself with mixed exercises and keep a streak going. Your score is saved.",
    cta: "Start practicing",
    accent: "from-fuchsia-500 to-amber-400",
  },
};

export default function ModuleScreen({ course, module, onStart }) {
  const activities = module.activities ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <PageHeader
        emoji={module.emoji}
        title={module.title}
        subtitle={`${course.title} · choose how you want to study`}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {activities.map((id) => {
          const a = ACTIVITIES[id];
          if (!a) return null;
          return (
            <SelectionCard
              key={id}
              emoji={a.emoji}
              title={a.title}
              blurb={a.blurb}
              cta={a.cta}
              accent={a.accent}
              onClick={() => onStart(id)}
            />
          );
        })}
      </div>
    </div>
  );
}
