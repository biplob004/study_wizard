// A large, tappable answer option. `state` drives the color once answered:
//   "idle" | "selected" | "correct" | "wrong"
export default function OptionButton({ children, onClick, state = "idle", disabled }) {
  const styles = {
    idle: "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50",
    selected: "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200",
    correct: "border-emerald-500 bg-emerald-50 text-emerald-800",
    wrong: "border-rose-400 bg-rose-50 text-rose-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border-2 px-4 py-3 text-left text-base font-medium text-slate-700 transition disabled:cursor-not-allowed ${styles[state]}`}
    >
      {children}
    </button>
  );
}
