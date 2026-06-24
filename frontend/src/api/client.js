// Thin client for the backend. The frontend owns no data — it fetches the
// vocabulary dataset and judges free-text answers entirely over HTTP.

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/** Fetch the vocabulary dataset. Each item's `image` is already a full URL. */
export async function getVocabulary() {
  const res = await fetch(`${API_BASE}/api/vocabulary`);
  if (!res.ok) throw new Error(`Failed to load vocabulary (${res.status})`);
  return res.json();
}

/**
 * Ask the backend (Gemini) to judge a free-text answer.
 * @returns {Promise<{correct: boolean, feedback: string, normalized: string}>}
 */
export async function checkAnswer({ exerciseType, expected, sentence, userAnswer }) {
  const res = await fetch(`${API_BASE}/api/check-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exercise_type: exerciseType,
      expected,
      sentence: sentence ?? null,
      user_answer: userAnswer,
    }),
  });
  if (!res.ok) throw new Error(`Answer check failed (${res.status})`);
  return res.json();
}
