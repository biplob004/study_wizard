// Tracks how long the learner keeps THIS tab as the foreground, focused window,
// AND is actively interacting with it (mouse, keyboard, scroll, touch). When the
// page is open but the learner goes idle (no activity for IDLE_TIMEOUT_MS), the
// counter pauses until the next interaction resumes it.
//
// Only course screens enable the tracker — the home/dashboard route isn't
// counted. The current route's `path` is included in each heartbeat so the
// backend can bucket time by location, making it easy to navigate per-page stats.
//
// We tick a counter once a second, but only while the page is visible, focused,
// AND not idle. The accumulated seconds are flushed periodically and whenever the
// tab loses focus or is hidden, bucketed by the learner's local calendar day.
import { useEffect, useRef } from "react";
import { recordFocusTime } from "../api/client";
import { localDayKey } from "./time";

const FLUSH_INTERVAL_MS = 20_000;
const IDLE_TIMEOUT_MS = 60_000; // pause counting after 60s of no interaction

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

/**
 * Run the focus-time tracker for as long as `enabled` is true.
 *
 * @param {boolean} enabled  - only count while this is true (course screens only)
 * @param {string}  path     - the current route path, bucketed per heartbeat
 */
export function useTimeTracker(enabled, path) {
  // Keep the latest path in a ref so the tick/flush closures see updates without
  // having to re-create the whole effect on every navigation.
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (!enabled) return undefined;

    let pending = 0; // focused seconds counted but not yet sent
    let lastActivity = Date.now(); // timestamp of the most recent interaction

    const isIdle = () => Date.now() - lastActivity > IDLE_TIMEOUT_MS;
    const isActive = () =>
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      !isIdle();

    const noteActivity = () => {
      lastActivity = Date.now();
    };

    const tick = setInterval(() => {
      if (isActive()) pending += 1;
    }, 1000);

    const flush = () => {
      if (pending <= 0) return;
      const seconds = pending;
      pending = 0;
      // On failure, put the seconds back so the next flush retries them.
      recordFocusTime(localDayKey(), seconds, pathRef.current).catch(() => {
        pending += seconds;
      });
    };

    const onHidden = () => {
      // Flush the moment we stop counting (tab hidden or window blurred).
      if (!isActive()) flush();
    };

    const onIdle = () => {
      // Stopped interacting — flush whatever was counted so far.
      if (isIdle()) flush();
    };

    const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    const idleTimer = setInterval(onIdle, IDLE_TIMEOUT_MS);

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, noteActivity, { passive: true });
    }
    window.addEventListener("blur", onHidden);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(tick);
      clearInterval(flushTimer);
      clearInterval(idleTimer);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, noteActivity);
      }
      window.removeEventListener("blur", onHidden);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled]);
}