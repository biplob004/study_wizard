// The signed-out landing page: a friendly intro plus a combined login / register form.
import { useState } from "react";
import { useAuth } from "./context";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 text-6xl">🧙‍♂️</div>
          <h1 className="text-3xl font-extrabold text-slate-800">AI Study Wizard</h1>
          <p className="mt-2 text-slate-500">
            Learn and practice at your own pace — and track your progress.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur sm:p-8"
        >
          <h2 className="mb-5 text-center text-lg font-bold text-slate-800">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          {isRegister && (
            <Field
              label="Name"
              type="text"
              value={form.displayName}
              onChange={set("displayName")}
              placeholder="What should we call you?"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder={isRegister ? "At least 6 characters" : "Your password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={6}
            required
          />

          {error && (
            <p className="mt-1 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-indigo-600 hover:underline"
            >
              {isRegister ? "Log in" : "Create one"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}
