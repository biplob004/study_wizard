"""Pydantic schemas for the API and the structured LLM output."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CheckRequest(BaseModel):
    """A learner's free-text answer to be judged."""

    exercise_type: str = Field(description="e.g. 'type-answer' or 'fill-blank'")
    expected: str = Field(description="The target word the learner should have produced")
    sentence: str | None = Field(
        default=None,
        description="Optional sentence/context, e.g. the fill-in-the-blank prompt",
    )
    user_answer: str = Field(description="What the learner typed")


class AnswerCheck(BaseModel):
    """Structured judgement returned by the LLM (and by the fallback)."""

    correct: bool = Field(description="True if the answer is an acceptable match")
    feedback: str = Field(description="One short, encouraging sentence for the learner")
    normalized: str = Field(description="The expected answer in its canonical form")


# --- Auth ------------------------------------------------------------------

class RegisterRequest(BaseModel):
    """A new account. ``email`` is plain str (no email-validator dependency)."""

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
    """Returned by register and login: the bearer token plus the user."""

    token: str
    user: UserOut


# --- Progress --------------------------------------------------------------

class LearnedRequest(BaseModel):
    word_id: str = Field(description="The vocabulary id the learner studied")


class PracticeRequest(BaseModel):
    score: int = Field(ge=0, description="Rounds answered correctly")
    total: int = Field(gt=0, description="Total rounds in the session")


class ProgressSummary(BaseModel):
    words_learned: int
    total_words: int
    practice_sessions: int
    total_stars: int
    best_score_pct: int
