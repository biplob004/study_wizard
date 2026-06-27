"""Storage for the per-word example sentences this course generates on demand.

Sentences live in ``data/sentences.json`` (a sibling of ``vocabulary.json``) so
they are committed to git and shipped to everyone — once any learner generates a
sentence it is reused for all users, with no regeneration. This is deliberately a
plain JSON file (not SQLite): the dataset is small, append-mostly, and text in git
gives readable diffs. ``app.db`` stays reserved for per-user accounts/progress.

Each record:
    {"id": int, "word_id": str, "sentence": str, "translation": str, "description": str}

``id`` is unique across all words and is used to name the audio files (see tts.py).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from .data import DATA_DIR

logger = logging.getLogger("courses.vocabulary.store")

SENTENCES_FILE = DATA_DIR / "sentences.json"

MAX_PER_WORD = 10


def _load() -> list[dict[str, Any]]:
    """Read all sentence records (missing/invalid file -> empty list)."""
    if not SENTENCES_FILE.exists():
        return []
    try:
        raw = json.loads(SENTENCES_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("sentences.json is not readable JSON: %s", exc)
        return []
    return raw if isinstance(raw, list) else []


def _save(records: list[dict[str, Any]]) -> None:
    """Persist all records atomically (temp file + os.replace) to avoid corruption."""
    SENTENCES_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = SENTENCES_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, SENTENCES_FILE)


def list_for_word(word_id: str) -> list[dict[str, Any]]:
    """All sentence records for a word, in creation order."""
    return [r for r in _load() if r.get("word_id") == word_id]


def count_for_word(word_id: str) -> int:
    """How many sentences a word already has."""
    return len(list_for_word(word_id))


def get(sentence_id: int) -> dict[str, Any] | None:
    """Look up a single sentence record by its id."""
    for r in _load():
        if r.get("id") == sentence_id:
            return r
    return None


def update(sentence_id: int, **fields: str) -> dict[str, Any] | None:
    """Patch fields on an existing sentence record; returns the updated record."""
    records = _load()
    updated: dict[str, Any] | None = None
    for r in records:
        if r.get("id") == sentence_id:
            r.update(fields)
            updated = r
            break
    if updated is not None:
        _save(records)
    return updated


def add(word_id: str, sentence: str, translation: str, description: str) -> dict[str, Any]:
    """Append a new sentence for a word and return the stored record (with its id)."""
    records = _load()
    new_id = max((r.get("id", 0) for r in records), default=0) + 1
    record = {
        "id": new_id,
        "word_id": word_id,
        "sentence": sentence,
        "translation": translation,
        "description": description,
    }
    records.append(record)
    _save(records)
    return record
