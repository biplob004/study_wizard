"""LLM generation of example sentences (English) with devanagari-Hindi translation + description.

Uses LangChain + Gemini with structured output (same pattern as ``llm.py``), so the
JSON parsing is handled for us. Translation and description are written in **devanagari
Hindi** to match the dataset's
existing ``meaning`` style and stay easy to read for learners.

``generate`` writes a brand-new sentence for a word; ``describe`` translates/describes
an existing sentence as-is. Both raise ``SentenceGenError`` if the model is unavailable
or errors — the caller maps that to an HTTP error. No silent fallback: a sentence
without a real translation/description isn't useful here.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

from pydantic import BaseModel, Field

logger = logging.getLogger("courses.vocabulary.sentence_gen")

GEMINI_MODEL = "gemini-3.1-flash-lite"


class SentenceGenError(RuntimeError):
    """Raised when sentence generation is unavailable or fails."""


class GeneratedSentence(BaseModel):
    sentence: str = Field(description="A short, simple English sentence using the word")
    translation: str = Field(description="The sentence in simple devanagari Hindi along with common english words as-is.")
    description: str = Field(description="A short, simple devanagari-Hindi + common english words as-is explanation of the word and sentence")


# Shared output rules, kept short and plain.
_RULES = (
    "Write the translation and description in Hindi devanagari and in mix english for common english words"
    "- translation: the sentence in simple, natural Hindi english mix.\n"
    "- description: simple Hindi for a beginner, in this order: 1. explain the word meaning and its use, 2. explain the sentence meaning"
)

GENERATE_SYSTEM = (
    "You are a friendly Hindi-speaking English tutor for beginners. "
    "Write ONE short, simple English sentence using the WORD, different from any "
    "EXISTING sentences listed.\n" + _RULES
)

DESCRIBE_SYSTEM = (
    "You are a friendly Hindi-speaking English tutor for beginners. "
    "Keep the given SENTENCE exactly as-is.\n" + _RULES
)


@lru_cache(maxsize=1)
def _get_llm():
    if not os.getenv("GOOGLE_API_KEY"):
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        model = ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=0.9)
        return model.with_structured_output(GeneratedSentence)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to initialize Gemini model for sentence generation")
        return None


def _invoke(system: str, human: str, word: str) -> GeneratedSentence:
    llm = _get_llm()
    if llm is None:
        raise SentenceGenError("Sentence generation is unavailable (GOOGLE_API_KEY not set).")
    try:
        result = llm.invoke([("system", system), ("human", human)])
        if isinstance(result, GeneratedSentence):
            return result
        return GeneratedSentence.model_validate(result)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Sentence generation failed for word %r", word)
        raise SentenceGenError(str(exc)) from exc


def generate(word: str, existing_sentences: list[str]) -> GeneratedSentence:
    """Generate one new sentence (+ Hindi translation & description) for `word`."""
    existing = "\n".join(f"- {s}" for s in existing_sentences) or "(none)"
    human = f"WORD: {word}\nEXISTING sentences (avoid repeating these):\n{existing}"
    return _invoke(GENERATE_SYSTEM, human, word)


def describe(word: str, sentence: str) -> GeneratedSentence:
    """Translate + describe an existing English `sentence` (keeps the sentence as-is)."""
    human = f"WORD: {word}\nSENTENCE: {sentence}"
    result = _invoke(DESCRIBE_SYSTEM, human, word)
    # Trust our own static sentence text over whatever the model echoes back.
    return result.model_copy(update={"sentence": sentence})
