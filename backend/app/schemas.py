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
