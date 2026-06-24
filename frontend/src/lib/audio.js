// Plays a vocabulary word out loud. Prefers the pre-generated clip served by the
// backend (item.audio); if that file is missing or playback fails, it falls back to
// the browser's built-in speech synthesis so learners still hear something.

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

/**
 * Play the audio for a vocabulary item.
 * @param {{word: string, audio?: string}} item
 * @returns {() => void} a cleanup function that stops whatever is playing.
 */
export function playWord(item) {
  if (!item) return () => {};

  if (item.audio) {
    const audio = new Audio(item.audio);
    // If the clip 404s or can't decode, speak the word instead.
    audio.addEventListener("error", () => speak(item.word), { once: true });
    audio.play().catch(() => speak(item.word));
    return () => {
      audio.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }

  speak(item.word);
  return () => window.speechSynthesis?.cancel();
}
