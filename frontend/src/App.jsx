// App root: gate everything behind auth, then drive real URL routing so a
// refresh keeps you on the same page:
//   /            or  /dashboard                  → Landing (home + dashboard)
//   /courses/:courseId                            → CourseScreen
//   /courses/:courseId/:activityId                → an activity (learn/practice/...)
import { useCallback } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/context";
import LoginPage from "./auth/LoginPage";
import TopBar from "./components/TopBar";
import { CatalogProvider } from "./catalog/CatalogContext";
import Landing from "./pages/Landing";
import CourseScreen from "./pages/CourseScreen";
import { getCoursePlugin } from "./courses/registry";
import { useTimeTracker, trackedPath } from "./lib/useTimeTracker";

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
  return (
    <CatalogProvider>
      <BrowserRouter>
        <ShellLayout />
      </BrowserRouter>
    </CatalogProvider>
  );
}

function ShellLayout() {
  const location = useLocation();
  // Which pages are tracked (and the time bucket = the pathname) is configured
  // in one place: lib/trackingConfig.js. Returning null means "don't track".
  useTimeTracker(trackedPath(location.pathname));

  return (
    <div className="min-h-screen">
      <TopBar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Landing />} />
          <Route path="/courses/:courseId" element={<CourseRoute />} />
          <Route path="/courses/:courseId/:activityId" element={<ActivityRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ActivityRoute() {
  const { courseId, activityId } = useParams();
  const navigate = useNavigate();
  const goHome = useCallback(() => navigate("/"), [navigate]);
  const plugin = getCoursePlugin(courseId);
  const activity = plugin?.activities?.[activityId];
  if (!activity) return <Navigate to={`/courses/${courseId}`} replace />;
  const Activity = activity.Component;
  return <Activity key={`${courseId}/${activityId}`} onFinish={goHome} />;
}

// Remount CourseScreen per course so per-course state (progress, etc.) resets
// cleanly when navigating between courses, without setState-in-effect.
function CourseRoute() {
  const { courseId } = useParams();
  return <CourseScreen key={courseId ?? ""} />;
}