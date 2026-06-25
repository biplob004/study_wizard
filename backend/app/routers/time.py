"""Focus-time routes.

Tracks how long the signed-in learner keeps the site as the foreground, focused
tab. The frontend only counts seconds while ``document`` is visible and focused,
then flushes them here; this module persists the daily buckets and serves the
recent history the dashboard charts.
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from .. import auth, db
from ..schemas import FocusDay, FocusHeartbeat, FocusPathDay

router = APIRouter(prefix="/api/time", tags=["time"])


@router.post("/heartbeat")
def heartbeat(
    req: FocusHeartbeat, user: dict = Depends(auth.current_user)
) -> dict[str, str]:
    """Add focused seconds to the learner's bucket for their local day + path."""
    if req.seconds > 0:
        db.add_focus_time(user["id"], req.day, req.seconds, req.path)
    return {"status": "ok"}


@router.get("/daily", response_model=list[FocusDay])
def daily(
    days: int = Query(default=56, ge=1, le=366),
    user: dict = Depends(auth.current_user),
) -> list[FocusDay]:
    """Daily focused seconds (summed across all routes) over roughly the last
    ``days`` days (oldest first).

    The frontend derives today / yesterday / the 7-day strip and the weekly
    average from this, using the learner's local clock.
    """
    since = (date.today() - timedelta(days=days)).isoformat()
    return [FocusDay(**row) for row in db.get_focus_time(user["id"], since)]


@router.get("/by-path", response_model=list[FocusPathDay])
def by_path(
    days: int = Query(default=56, ge=1, le=366),
    user: dict = Depends(auth.current_user),
) -> list[FocusPathDay]:
    """Focused seconds per route path over roughly the last ``days`` days
    (oldest first). Lets the dashboard show navigable per-page time breakdowns.
    """
    since = (date.today() - timedelta(days=days)).isoformat()
    return [FocusPathDay(**row) for row in db.get_focus_time_by_path(user["id"], since)]


@router.get("/paths", response_model=list[str])
def paths(
    user: dict = Depends(auth.current_user),
) -> list[str]:
    """Distinct route paths the learner has logged focused time on, for navigation."""
    return db.get_focus_paths(user["id"])
