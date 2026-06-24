// Persistent top bar shown while signed in: a back button (when you can go back),
// the app name, and the current user with a logout action.
import { useAuth } from "../auth/context";

export default function TopBar({ canGoBack, onBack, onHome }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onHome}
            className="flex items-center gap-2 rounded-lg px-1 text-sm font-extrabold text-slate-800"
          >
            <span className="text-lg">🧙‍♂️</span>
            <span className="hidden sm:inline">AI Study Wizard</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">
            Hi, <span className="font-semibold text-slate-700">{user?.display_name}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
