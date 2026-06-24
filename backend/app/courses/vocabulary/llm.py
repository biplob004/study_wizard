"""LangChain + Gemini answer judging for the vocabulary course, with fallback.

Only free-text exercises call this module. If ``GOOGLE_API_KEY`` is unset or the
LLM errors, we fall back to a tolerant string match so the app still functions.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

from app.schemas import AnswerCheck, CheckRequest

from .data import find_entry

logger = logging.getLogger("courses.vocabulary.llm")

SYSTEM_PROMPT = (
    "You are a friendly vocabulary tutor for language learners. "
    "Given the EXPECTED word (and optional sentence context) and the learner's ANSWER, decide whether "
    "the answer is an acceptable match. Be tolerant of synonyms, verb tense, plurals, capitalization, "
    "and minor spelling mistakes/typos. Reject answers that name a different concept. "
    "Reply with a short, encouraging one-sentence feedback and set 'normalized' to the expected word."
)


@lru_cache(maxsize=1)
def _get_llm():
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("GOOGLE_API_KEY not set — falling back to string matching for answer checks")
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
        return model.with_structured_output(AnswerCheck)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to initialize Gemini model — using fallback")
        return None


def _fallback(req: CheckRequest) -> AnswerCheck:
    answer = req.user_answer.strip().lower()
    accepted = {req.expected.strip().lower()}

    entry = find_entry(req.expected)
    if entry:
        accepted.add(entry["word"].lower())
        accepted.update(w.lower() for w in entry.get("altWords", []))

    correct = bool(answer) and answer in accepted
    feedback = "Correct — nice work!" if correct else f"Not quite. The answer is “{req.expected}”."
    return AnswerCheck(correct=correct, feedback=feedback, normalized=req.expected)


def check_answer(req: CheckRequest) -> AnswerCheck:
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
        return AnswerCheck.model_validate(result)
    except Exception:  # noqa: BLE001
        logger.exception("LLM answer check failed — using fallback")
        return _fallback(req)
