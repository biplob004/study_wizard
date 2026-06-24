"""Loads and validates the vocabulary dataset that this course owns.

The dataset (``data/vocabulary.json``) and the media files (``data/images/``,
``data/audio/``) live inside this course's package, so the course is fully
self-contained and other courses can't interfere with it.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("courses.vocabulary")

DATA_DIR = Path(__file__).resolve().parent / "data"
VOCABULARY_FILE = DATA_DIR / "vocabulary.json"
IMAGES_DIR = DATA_DIR / "images"
AUDIO_DIR = DATA_DIR / "audio"

AUDIO_FORMAT = "mp3"

REQUIRED_FIELDS = ("id", "word", "sentence", "category", "image")


def load_raw() -> list[dict[str, Any]]:
    """Read and validate the raw dataset from disk."""
    if not VOCABULARY_FILE.exists():
        logger.error("vocabulary.json not found at %s", VOCABULARY_FILE)
        return []

    try:
        raw = json.loads(VOCABULARY_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        logger.error("vocabulary.json is not valid JSON: %s", exc)
        return []

    if not isinstance(raw, list):
        logger.error("vocabulary.json must contain a JSON array")
        return []

    valid: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, entry in enumerate(raw):
        if not isinstance(entry, dict):
            logger.warning("Skipping row %s: not an object", index)
            continue
        missing = [f for f in REQUIRED_FIELDS if not entry.get(f)]
        if missing:
            logger.warning("Skipping row %s: missing fields %s", index, missing)
            continue
        if entry["id"] in seen_ids:
            logger.warning("Skipping row %s: duplicate id %r", index, entry["id"])
            continue
        seen_ids.add(entry["id"])

        if not (IMAGES_DIR / entry["image"]).exists():
            logger.warning(
                "Image file missing for %r: expected data/images/%s",
                entry["id"],
                entry["image"],
            )

        entry.setdefault("altWords", [])
        valid.append(entry)

    logger.info("Loaded %s vocabulary entries", len(valid))
    return valid


def get_dataset(base_url: str) -> list[dict[str, Any]]:
    """Return the dataset with media fields rewritten to full static URLs."""
    base = base_url.rstrip("/")
    dataset = []
    for entry in load_raw():
        item = dict(entry)
        item["image"] = f"{base}/static/courses/vocabulary/images/{entry['image']}"
        item["audio"] = f"{base}/static/courses/vocabulary/audio/{entry['id']}.{AUDIO_FORMAT}"
        dataset.append(item)
    return dataset


def find_entry(key: str) -> dict[str, Any] | None:
    """Look up a single raw entry by id or word (used by the answer checker fallback)."""
    needle = key.strip().lower()
    for entry in load_raw():
        if entry["id"].lower() == needle or entry["word"].lower() == needle:
            return entry
    return None


def total_items() -> int:
    """How many vocabulary entries exist (for progress denominators)."""
    return len(load_raw())
