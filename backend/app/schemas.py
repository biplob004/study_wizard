"""Pydantic schemas shared across the API.

Course-scoped progress schemas carry a ``course_id`` so records for one course
never leak into another. The auth schemas are unchanged.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# --- Answer checking (optional, used by courses that judge free text) -------

class CheckRequest(BaseModel):
    exercise_type: str = Field(description="e.g. 'type-answer' or 'fill-blank'")
    expected: str = Field(description="The target answer the learner should have produced")
    sentence: str | None = Field(
        default=None,
        description="Optional sentence/context, e.g. the fill-in-the-blank prompt",
    )
    user_answer: str = Field(description="What the learner typed")


class AnswerCheck(BaseModel):
    correct: bool = Field(description="True if the answer is an acceptable match")
    feedback: str = Field(description="One short, encouraging sentence for the learner")
    normalized: str = Field(description="The expected answer in its canonical form")


# --- Auth -------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(default="", max_length=60)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


# --- Per-course progress ----------------------------------------------------

class LearnedRequest(BaseModel):
    item_id: str = Field(description="The course item id the learner studied")


class PracticeRequest(BaseModel):
    score: int = Field(ge=0, description="Rounds answered correctly")
    total: int = Field(gt=0, description="Total rounds in the session")
    item_ids: list[str] = Field(
        default_factory=list,
        description="The item ids shown during this session, for exposure tracking",
    )
    activity: str = Field(
        default="practice",
        description="Which activity produced this result (e.g. 'practice', 'card-flip')",
    )


class CourseProgress(BaseModel):
    course_id: str
    items_learned: int
    total_items: int
    practice_sessions: int
    total_stars: int
    best_score_pct: int
    card_flip_sessions: int = 0
    card_flip_stars: int = 0
    card_flip_best_pct: int = 0


class OverallProgressItem(BaseModel):
    course_id: str
    items_learned: int
