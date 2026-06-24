// App root: gate everything behind auth, then drive a simple navigation stack
//   Landing → Course → Module → (Learn | Practice | ...)
// A shared TopBar gives back/home/logout on every signed-in screen.
import { useCallback, useState } from "react";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/context";
import LoginPage from "./auth/LoginPage";
import TopBar from "./components/TopBar";
import Landing from "./pages/Landing";
import CourseScreen from "./pages/CourseScreen";
import { getCoursePlugin } from "./courses/registry";

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
      return <Landing onOpenCourse={(course) => push({ name: "course", course })} />;
    case "course":
      return (
        <CourseScreen
          course={route.course}
          onStartActivity={(activity) => push({ name: "activity", course: route.course, activity })}
        />
      );
    case "activity": {
      const plugin = getCoursePlugin(route.course.id);
      const activity = plugin?.activities?.[route.activity];
      if (!activity) return null;
      const Activity = activity.Component;
      return <Activity onFinish={home} />;
    }
    default:
      return null;
  }
}
