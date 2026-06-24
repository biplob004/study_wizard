"""Progress routes: record what a learner studied and aggregate it for the dashboard.

Every route requires a signed-in user (``auth.current_user``).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import auth, db
from ..schemas import LearnedRequest, PracticeRequest, ProgressSummary
from ..vocabulary import load_raw

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.post("/learned")
def mark_learned(req: LearnedRequest, user: dict = Depends(auth.current_user)) -> dict[str, str]:
    """Record that the signed-in user studied a word in Learning mode."""
    db.record_learned_word(user["id"], req.word_id)
    return {"status": "ok"}


@router.post("/practice")
def save_practice(req: PracticeRequest, user: dict = Depends(auth.current_user)) -> dict[str, str]:
    """Record the score of a finished Practice session."""
    db.record_practice_result(user["id"], req.score, req.total)
    return {"status": "ok"}


@router.get("/summary", response_model=ProgressSummary)
def summary(user: dict = Depends(auth.current_user)) -> ProgressSummary:
    """Aggregate progress for the dashboard."""
    data = db.get_progress_summary(user["id"])
    return ProgressSummary(total_words=len(load_raw()), **data)
