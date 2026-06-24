// App root: gate everything behind auth, then drive a simple navigation stack
//   Dashboard → Course → Module → (Learn | Practice)
// A shared TopBar gives back/home/logout on every signed-in screen.
import { useCallback, useState } from "react";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/context";
import LoginPage from "./auth/LoginPage";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import CourseScreen from "./pages/CourseScreen";
import ModuleScreen from "./pages/ModuleScreen";
import LearningMode from "./learning/LearningMode";
import PracticeSession from "./session/PracticeSession";

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>
    );
  }
  if (!user) return <LoginPage />;
  return <AppShell />;
}

function AppShell() {
  // A stack of routes; the last one is what's shown. Pushing navigates deeper.
  const [stack, setStack] = useState([{ name: "home" }]);
  const route = stack[stack.length - 1];

  const push = useCallback((entry) => setStack((s) => [...s, entry]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const home = useCallback(() => setStack([{ name: "home" }]), []);

  return (
    <div className="min-h-screen">
      <TopBar canGoBack={stack.length > 1} onBack={back} onHome={home} />
      <main>
        <Screen route={route} push={push} home={home} />
      </main>
    </div>
  );
}

function Screen({ route, push, home }) {
  switch (route.name) {
    case "home":
      return <Dashboard onOpenCourse={(course) => push({ name: "course", course })} />;
    case "course":
      return (
        <CourseScreen
          course={route.course}
          onOpenModule={(module) => push({ name: "module", course: route.course, module })}
        />
      );
    case "module":
      return (
        <ModuleScreen
          course={route.course}
          module={route.module}
          onStart={(activity) => push({ name: activity, module: route.module })}
        />
      );
    case "learn":
      return <LearningMode />;
    case "practice":
      return <PracticeSession onFinish={home} />;
    default:
      return null;
  }
}
