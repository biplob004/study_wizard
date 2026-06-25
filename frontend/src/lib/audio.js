// Plays a vocabulary word out loud. Prefers the pre-generated clip served by the
// backend (item.audio); if that file is missing or playback fails, it falls back to
// the browser's built-in speech synthesis so learners still hear something.

let currentAudio = null;

function stopCurrent() {
  if (currentAudio) {
    const a = currentAudio;
    currentAudio = null;
    a.pause();
    a.src = "";
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

function speak(text) {
  stopCurrent();
  if (typeof window === "undefined" || !window.speechSynthesis) return;
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

  stopCurrent();

  if (item.audio) {
    const audio = new Audio(item.audio);
    currentAudio = audio;
    let finished = false;
    const stop = () => {
      if (finished) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
      audio.pause();
      audio.src = "";
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
    // Only fall back to TTS when the file genuinely fails to load — not when
    // we ourselves abort playback by pausing/cleaning up.
    audio.addEventListener("error", () => {
      if (currentAudio !== audio) return;
      stop();
      speak(item.word);
    }, { once: true });
    audio.addEventListener("ended", stop, { once: true });
    audio.play().catch((err) => {
      // Ignore AbortError from intentional pause/cleanup; only speak on real errors.
      if (err?.name === "AbortError") return;
      if (currentAudio !== audio) return;
      stop();
      speak(item.word);
    });
    return stop;
  }

  speak(item.word);
  return stopCurrent;
}