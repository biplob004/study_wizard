// Plays vocabulary audio. Prefers a pre-generated clip served by the backend (an
// audio URL); if that file is missing or playback fails, it falls back to the
// browser's built-in speech synthesis so learners still hear something.
//
// Only one clip plays at a time (starting a new one stops the current).

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

function speak(text, onEnded) {
  stopCurrent();
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnded?.();
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9;
  if (onEnded) utter.addEventListener("end", onEnded, { once: true });
  window.speechSynthesis.speak(utter);
}

/**
 * Play an audio clip from a URL, falling back to browser TTS on failure.
 * @param {string|null|undefined} url  The clip URL (may be missing).
 * @param {{fallbackText?: string, onEnded?: () => void}} [opts]
 *   fallbackText: spoken via TTS if the URL is absent or fails to load.
 *   onEnded:      called once when playback finishes (audio or TTS).
 * @returns {() => void} a cleanup function that stops whatever is playing.
 */
export function playAudioUrl(url, { fallbackText = "", onEnded } = {}) {
  stopCurrent();

  if (url) {
    const audio = new Audio(url);
    currentAudio = audio;
    let finished = false;
    const stop = (fireEnded) => {
      if (finished) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
      audio.pause();
      audio.src = "";
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      if (fireEnded) onEnded?.();
    };
    // Fall back to TTS only on a genuine load error — not when we abort playback.
    audio.addEventListener("error", () => {
      if (currentAudio !== audio) return;
      stop(false);
      if (fallbackText) speak(fallbackText, onEnded);
      else onEnded?.();
    }, { once: true });
    audio.addEventListener("ended", () => stop(true), { once: true });
    audio.play().catch((err) => {
      if (err?.name === "AbortError") return; // intentional pause/cleanup
      if (currentAudio !== audio) return;
      stop(false);
      if (fallbackText) speak(fallbackText, onEnded);
      else onEnded?.();
    });
    return () => stop(false);
  }

  if (fallbackText) speak(fallbackText, onEnded);
  else onEnded?.();
  return stopCurrent;
}

/**
 * Play the audio for a vocabulary word.
 * @param {{word: string, audio?: string}} item
 * @param {{onEnded?: () => void}} [opts]
 * @returns {() => void} a cleanup function that stops whatever is playing.
 */
export function playWord(item, { onEnded } = {}) {
  if (!item) return () => {};
  return playAudioUrl(item.audio, { fallbackText: item.word, onEnded });
}
