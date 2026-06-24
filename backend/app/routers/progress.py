"""Progress routes.

Per-course progress is recorded and aggregated under
``/api/courses/{course_id}/progress/*`` and lives on the course's own router
(see ``app.courses.vocabulary.router``). This module only exposes the
cross-course overview used by the dashboard.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import auth, db
from ..courses import all_courses
from ..schemas import OverallProgressItem

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/summary", response_model=list[OverallProgressItem])
def summary(user: dict = Depends(auth.current_user)) -> list[OverallProgressItem]:
    """Per-course progress for the signed-in user (one row per course)."""
    raw = {row["course_id"]: row for row in db.get_overall_progress(user["id"])}
    out: list[OverallProgressItem] = []
    for course in all_courses():
        r = raw.get(course.id)
        out.append(
            OverallProgressItem(
                course_id=course.id,
                items_learned=r["items_learned"] if r else 0,
            )
        )
    return out
