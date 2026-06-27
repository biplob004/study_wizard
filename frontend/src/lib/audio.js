// Plays vocabulary audio from a pre-generated clip served by the backend (an audio
// URL). If the clip is missing or fails to load, playback is simply silent — there
// is no browser speech-synthesis fallback, so learners only ever hear the real clip.
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
}

/**
 * Play an audio clip from a URL. Missing URL or a load error is a no-op (silent).
 * @param {string|null|undefined} url  The clip URL (may be missing).
 * @param {{onEnded?: () => void}} [opts]
 *   onEnded: called once when playback finishes (or immediately if there's nothing to play).
 * @returns {() => void} a cleanup function that stops whatever is playing.
 */
export function playAudioUrl(url, { onEnded } = {}) {
  stopCurrent();

  if (!url) {
    onEnded?.();
    return stopCurrent;
  }

  const audio = new Audio(url);
  currentAudio = audio;
  let finished = false;
  const stop = (fireEnded) => {
    if (finished) return;
    finished = true;
    if (currentAudio === audio) currentAudio = null;
    audio.pause();
    audio.src = "";
    if (fireEnded) onEnded?.();
  };
  // A genuine load error ends playback silently (no TTS fallback).
  audio.addEventListener("error", () => {
    if (currentAudio !== audio) return;
    stop(true);
  }, { once: true });
  audio.addEventListener("ended", () => stop(true), { once: true });
  audio.play().catch((err) => {
    if (err?.name === "AbortError") return; // intentional pause/cleanup
    if (currentAudio !== audio) return;
    stop(true);
  });
  return () => stop(false);
}

/**
 * Play the audio for a vocabulary word.
 * @param {{word: string, audio?: string}} item
 * @param {{onEnded?: () => void}} [opts]
 * @returns {() => void} a cleanup function that stops whatever is playing.
 */
export function playWord(item, { onEnded } = {}) {
  if (!item) return () => {};
  return playAudioUrl(item.audio, { onEnded });
}
