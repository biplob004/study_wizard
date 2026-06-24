// The Vocabulary course plugin.
//
// Maps the vocabulary course id to the React components that render each of its
// activities. The backend `/api/courses` endpoint supplies the catalog metadata
// (title, emoji, blurb, modules, word counts); this module supplies the UI.
import Learn from "./Learn";
import Practice from "./Practice";

export default {
  id: "vocabulary",
  activities: {
    learn: {
      id: "learn",
      emoji: "📖",
      title: "Learn",
      blurb: "Browse the words at your own pace. See each picture, hear it spoken, and flip through cards.",
      cta: "Start learning",
      accent: "from-indigo-500 to-cyan-400",
      Component: Learn,
    },
    practice: {
      id: "practice",
      emoji: "🎯",
      title: "Practice",
      blurb: "Test yourself with mixed exercises and keep a streak going. Your score is saved.",
      cta: "Start practicing",
      accent: "from-fuchsia-500 to-amber-400",
      Component: Practice,
    },
  },
};
