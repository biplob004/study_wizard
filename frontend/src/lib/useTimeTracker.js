// Tracks how long the learner keeps THIS tab as the foreground, focused window.
//
// We tick a counter once a second, but only while the page is both visible
// (not a background tab) and focused (this window/tab has OS focus). The
// accumulated seconds are flushed to the backend periodically and whenever the
// tab loses focus or is hidden, bucketed by the learner's local calendar day.
import { useEffect } from "react";
import { recordFocusTime } from "../api/client";
import { localDayKey } from "./time";

const FLUSH_INTERVAL_MS = 20_000;

/** Run the focus-time tracker for as long as `enabled` is true. */
export function useTimeTracker(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    let pending = 0; // focused seconds counted but not yet sent

    const isActive = () =>
      document.visibilityState === "visible" && document.hasFocus();

    const tick = setInterval(() => {
      if (isActive()) pending += 1;
    }, 1000);

    const flush = () => {
      if (pending <= 0) return;
      const seconds = pending;
      pending = 0;
      // On failure, put the seconds back so the next flush retries them.
      recordFocusTime(localDayKey(), seconds).catch(() => {
        pending += seconds;
      });
    };

    const onHidden = () => {
      // Flush the moment we stop counting (tab hidden or window blurred).
      if (!isActive()) flush();
    };

    const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    window.addEventListener("blur", onHidden);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(tick);
      clearInterval(flushTimer);
      window.removeEventListener("blur", onHidden);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled]);
}
