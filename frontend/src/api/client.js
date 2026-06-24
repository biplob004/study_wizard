// Thin client for the backend. The frontend owns no data — it fetches the vocabulary
// dataset, the course catalog, judges free-text answers, and reads/writes the signed-in
// learner's progress, all over HTTP.

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "edu.authToken";

// --- Token storage ---------------------------------------------------------

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// --- Core request helper ---------------------------------------------------

/**
 * Make a JSON request. Attaches the bearer token when `auth` is true, and throws an
 * Error carrying the backend's `detail` message on a non-2xx response.
 */
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

// --- Content ---------------------------------------------------------------

/** Fetch a course's content dataset. Each item's `image` and `audio` are full URLs. */
export function getCourseContent(courseId) {
  return request(`/api/courses/${courseId}/content`);
}

/** Fetch the course catalog shown on the landing/dashboard. */
export function getCourses() {
  return request("/api/courses");
}

/** Ask the backend (Gemini) to judge a free-text answer for a course. */
export function checkAnswer(courseId, { exerciseType, expected, sentence, userAnswer }) {
  return request(`/api/courses/${courseId}/check-answer`, {
    method: "POST",
    body: {
      exercise_type: exerciseType,
      expected,
      sentence: sentence ?? null,
      user_answer: userAnswer,
    },
  });
}

// --- Auth ------------------------------------------------------------------

export function register({ email, password, displayName }) {
  return request("/api/auth/register", {
    method: "POST",
    body: { email, password, display_name: displayName ?? "" },
  });
}

export function login({ email, password }) {
  return request("/api/auth/login", { method: "POST", body: { email, password } });
}

export function getMe() {
  return request("/api/auth/me", { auth: true });
}

export function logout() {
  return request("/api/auth/logout", { method: "POST", auth: true });
}

// --- Progress --------------------------------------------------------------
// Per-course progress is namespaced under /api/courses/{courseId}/progress.
// The cross-course overview lives at /api/progress/summary.

/** Mark an item as studied in a course's Learn mode (fire-and-forget friendly). */
export function recordLearned(courseId, itemId) {
  return request(`/api/courses/${courseId}/progress/learned`, {
    method: "POST",
    auth: true,
    body: { item_id: itemId },
  });
}

/** Save the score of a finished Practice session for a course. */
export function recordPractice(courseId, { score, total, itemIds }) {
  return request(`/api/courses/${courseId}/progress/practice`, {
    method: "POST",
    auth: true,
    body: { score, total, item_ids: itemIds ?? [] },
  });
}

/** Aggregated progress for a single course. */
export function getCourseProgress(courseId) {
  return request(`/api/courses/${courseId}/progress/summary`, { auth: true });
}

/** Map item_id -> times shown in past practice sessions (for biasing sampling). */
export function getPracticeExposures(courseId) {
  return request(`/api/courses/${courseId}/progress/exposures`, { auth: true });
}

/** Per-course progress overview for the dashboard (one row per course). */
export function getProgressSummary() {
  return request("/api/progress/summary", { auth: true });
}
