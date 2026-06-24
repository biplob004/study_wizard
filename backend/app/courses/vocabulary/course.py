"""The Vocabulary course plugin.

Defines the course metadata, serves its dataset, judges free-text answers, and
records per-course progress — all under ``/api/courses/vocabulary``.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from app import auth, db
from app.courses import Course
from app.schemas import (
    AnswerCheck,
    CheckRequest,
    CourseProgress,
    LearnedRequest,
    PracticeRequest,
)

from . import data
from .llm import check_answer

COURSE_ID = "vocabulary"


class VocabularyCourse(Course):
    id = COURSE_ID
    title = "Vocabulary"
    emoji = "📚"
    blurb = "Everyday words with pictures and audio — learn, then practice."
    available = True

    # Media directories (mounted at /static/courses/vocabulary/{images,audio}).
    images_dir = data.IMAGES_DIR
    audio_dir = data.AUDIO_DIR

    @property
    def modules(self) -> list[dict[str, Any]]:
        word_count = data.total_items()
        return [
            {
                "id": "words",
                "title": "Learn Words",
                "emoji": "🗂️",
                "blurb": f"{word_count} essential words with pictures and audio.",
                "wordCount": word_count,
                "available": True,
                "activities": ["learn", "practice"],
            }
        ]

    def catalog_entry(self) -> dict[str, Any]:
        entry = super().catalog_entry()
        entry["modules"] = self.modules
        return entry

    def router(self) -> APIRouter:
        r = APIRouter(tags=["vocabulary"])

        @r.get("/content")
        def content(request: Request) -> list[dict]:
            """The vocabulary dataset with image/audio as full static URLs."""
            return data.get_dataset(str(request.base_url))

        @r.post("/check-answer", response_model=AnswerCheck)
        def check(req: CheckRequest) -> AnswerCheck:
            return check_answer(req)

        @r.post("/progress/learned")
        def mark_learned(
            req: LearnedRequest, user: dict = Depends(auth.current_user)
        ) -> dict[str, str]:
            db.record_learned_item(user["id"], COURSE_ID, req.item_id)
            return {"status": "ok"}

        @r.post("/progress/practice")
        def save_practice(
            req: PracticeRequest, user: dict = Depends(auth.current_user)
        ) -> dict[str, str]:
            db.record_practice_result(user["id"], COURSE_ID, req.score, req.total)
            db.record_practice_exposures(user["id"], COURSE_ID, req.item_ids)
            return {"status": "ok"}

        @r.get("/progress/summary", response_model=CourseProgress)
        def progress_summary(user: dict = Depends(auth.current_user)) -> CourseProgress:
            data_ = db.get_course_progress(
                user["id"], COURSE_ID, total_items=data.total_items()
            )
            return CourseProgress(**data_)

        @r.get("/progress/exposures")
        def exposures(user: dict = Depends(auth.current_user)) -> dict[str, int]:
            """Map item_id -> times shown in past practice (for biasing future sampling)."""
            return db.get_practice_exposures(user["id"], COURSE_ID)

        return r


course = VocabularyCourse()
