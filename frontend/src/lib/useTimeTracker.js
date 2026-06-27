// Focus-time tracker. One rule:
//   accrue a second while the tab is the visible, focused, non-idle window;
//   flush the accrued seconds to the backend every 20s (or when the tab loses
//   focus / is hidden / unmounts), bucketed by the learner's local day.
//
// WHICH PAGES ARE TRACKED (and the time bucket — always the full pathname so
// time-on-page matches the URL the learner sees):
//   add/remove a prefix below to control what counts. The per-item id (?id=1)
//   is intentionally NOT part of the bucket.
const TRACKED_PREFIXES = [
  "/courses/", // every course page (course overview + activities)
];

/** Returns the time bucket for `pathname`, or `null` when the page isn't tracked. */
export function trackedPath(pathname) {
  if (typeof pathname !== "string") return null;
  return TRACKED_PREFIXES.some((p) => pathname.startsWith(p)) ? pathname : null;
}

import { useEffect } from "react";
import { recordFocusTime } from "../api/client";
import { localDayKey } from "./time";

const TICK_MS = 1000;
const FLUSH_INTERVAL_MS = 20_000;
const IDLE_TIMEOUT_MS = 60_000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

export function useTimeTracker(path) {
  useEffect(() => {
    if (!path) return undefined;

    let pending = 0;
    let lastActivity = Date.now();
    let lastFlush = Date.now();

    const isIdle = () => Date.now() - lastActivity > IDLE_TIMEOUT_MS;
    const isActive = () =>
      document.visibilityState === "visible" && document.hasFocus() && !isIdle();

    const flush = () => {
      lastFlush = Date.now();
      if (pending <= 0) return;
      const seconds = pending;
      pending = 0;
      recordFocusTime(localDayKey(), seconds, path).catch(() => {
        pending += seconds; // retry on the next flush
      });
    };

    const noteActivity = () => {
      lastActivity = Date.now();
    };

    // One interval: accrue while active, flush pending on schedule.
    const tick = setInterval(() => {
      if (isActive()) pending += 1;
      if (pending > 0 && Date.now() - lastFlush >= FLUSH_INTERVAL_MS) flush();
    }, TICK_MS);

    // Flush immediately when the tab stops being the focused, visible window.
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, noteActivity, { passive: true });
    }
    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(tick);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, noteActivity);
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [path]);
}