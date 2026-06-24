"""LangChain + Gemini answer judging, with a deterministic fallback.

The LLM is optional: client-side exercises work without any API key. Only the free-text exercises
(``type-answer`` and ``fill-blank``) call this module, and if ``GOOGLE_API_KEY`` is unset or the LLM
errors, we fall back to a tolerant string match so the app still functions.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

from .schemas import AnswerCheck, CheckRequest
from .vocabulary import find_entry

logger = logging.getLogger("llm")

SYSTEM_PROMPT = (
    "You are a friendly vocabulary tutor for language learners. "
    "Given the EXPECTED word (and optional sentence context) and the learner's ANSWER, decide whether "
    "the answer is an acceptable match. Be tolerant of synonyms, verb tense, plurals, capitalization, "
    "and minor spelling mistakes/typos. Reject answers that name a different concept. "
    "Reply with a short, encouraging one-sentence feedback and set 'normalized' to the expected word."
)


@lru_cache(maxsize=1)
def _get_llm():
    """Build the structured-output Gemini model once, or return None if unavailable."""
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("GOOGLE_API_KEY not set — falling back to string matching for answer checks")
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
        return model.with_structured_output(AnswerCheck)
    except Exception:  # noqa: BLE001 - any import/config failure should degrade gracefully
        logger.exception("Failed to initialize Gemini model — using fallback")
        return None


def _fallback(req: CheckRequest) -> AnswerCheck:
    """Deterministic check: case-insensitive match against expected word + its altWords."""
    answer = req.user_answer.strip().lower()
    accepted = {req.expected.strip().lower()}

    # Pull synonyms from the dataset when the expected word matches a known entry.
    entry = find_entry(req.expected)
    if entry:
        accepted.add(entry["word"].lower())
        accepted.update(w.lower() for w in entry.get("altWords", []))

    correct = bool(answer) and answer in accepted
    feedback = "Correct — nice work!" if correct else f"Not quite. The answer is “{req.expected}”."
    return AnswerCheck(correct=correct, feedback=feedback, normalized=req.expected)


def check_answer(req: CheckRequest) -> AnswerCheck:
    """Judge a free-text answer, using Gemini when available and the fallback otherwise."""
    llm = _get_llm()
    if llm is None:
        return _fallback(req)

    human = (
        f"EXPECTED: {req.expected}\n"
        f"SENTENCE: {req.sentence or '(none)'}\n"
        f"ANSWER: {req.user_answer}"
    )
    try:
        result = llm.invoke([("system", SYSTEM_PROMPT), ("human", human)])
        if isinstance(result, AnswerCheck):
            return result
        # Some versions return a dict-like; coerce defensively.
        return AnswerCheck.model_validate(result)
    except Exception:  # noqa: BLE001
        logger.exception("LLM answer check failed — using fallback")
        return _fallback(req)
