import { useState } from "react";
import PracticeSession from "./session/PracticeSession";
import LearningMode from "./learning/LearningMode";
import ModePicker from "./components/ModePicker";

export default function App() {
  const [mode, setMode] = useState(null); // null = pick a mode | "learning" | "practice"

  if (!mode) return <ModePicker onPick={setMode} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setMode(null)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:text-indigo-600"
      >
        ← Home
      </button>
      {mode === "learning" ? <LearningMode /> : <PracticeSession />}
    </>
  );
}
