"""Tasks & Habits routes.

A cross-cutting daily habit/task tracker (merged from the standalone HabitFlow
app) — not a course. Like focus-time, it lives under ``/api/tasks`` and is
scoped to the signed-in user only (no ``course_id``). Both the habit
*definitions* and the per-day check-offs are per-user rows in SQLite (tables
``task_habits`` and ``task_entries``). A new account starts with an empty habit
list; the learner adds their own via the API.

- ``GET    /api/tasks/state``           — the learner's full tracker state (habits + days)
- ``POST   /api/tasks/state``           — save the learner's per-day check-offs
- ``POST   /api/tasks/recurring``       — add a recurring habit (per-user, in SQLite)
- ``DELETE /api/tasks/recurring/{idx}`` — remove a recurring habit (per-user, in SQLite)
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends

from .. import auth, db
from ..schemas import TaskHabitRequest, TaskState

logger = logging.getLogger("tasks")

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/state")
def get_state(user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    """The learner's tracker state: their recurring habits + per-day records."""
    habits = db.get_task_habits(user["id"])
    return {
        "recurring": [{"text": h["text"], "points": h["points"]} for h in habits],
        "data": db.get_task_state(user["id"]),
    }


@router.post("/state")
def save_state(
    req: TaskState, user: dict = Depends(auth.current_user)
) -> dict[str, str]:
    """Persist the learner's per-day check-offs (recurring is config, ignored)."""
    db.save_task_state(user["id"], req.data)
    return {"status": "ok"}


@router.post("/recurring")
def add_recurring(
    req: TaskHabitRequest, user: dict = Depends(auth.current_user)
) -> dict[str, Any]:
    """Add a recurring habit for the signed-in user (persists to SQLite).

    Returns the updated habit list so the client can refresh in place.
    """
    db.add_task_habit(user["id"], req.text.strip(), req.points)
    habits = db.get_task_habits(user["id"])
    logger.info("Added habit %r (%s pts) for user %s", req.text, req.points, user["id"])
    return {"recurring": [{"text": h["text"], "points": h["points"]} for h in habits]}


@router.delete("/recurring/{index}")
def delete_recurring(
    index: int, user: dict = Depends(auth.current_user)
) -> dict[str, Any]:
    """Remove a recurring habit from the signed-in user's list (SQLite).

    Its per-day check-offs are also removed so totals and streaks recompute
    cleanly — a re-added habit with the same name starts fresh.
    """
    habits = db.delete_task_habit_by_index(user["id"], index)
    return {"recurring": [{"text": h["text"], "points": h["points"]} for h in habits]}