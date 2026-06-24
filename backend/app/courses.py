"""The course catalog.

A small, static description of what a learner can study. Today there's one live course
("Learn Basic English") with one module ("Learn Vocabulary") that offers the Learn and Practice
activities; the rest are placeholders marked ``available: false`` so the UI can show what's coming.

Kept on the backend so the frontend stays data-free and the word count stays in sync with the
vocabulary dataset.
"""

from __future__ import annotations

from typing import Any

from .vocabulary import load_raw


def get_catalog() -> list[dict[str, Any]]:
    """Return the course catalog, with the vocabulary module's word count filled in live."""
    word_count = len(load_raw())
    return [
        {
            "id": "basic-english",
            "title": "Learn Basic English",
            "emoji": "🇬🇧",
            "blurb": "Everyday words and simple sentences to get you started.",
            "available": True,
            "modules": [
                {
                    "id": "vocabulary",
                    "title": "Learn Vocabulary",
                    "emoji": "🗂️",
                    "blurb": f"{word_count} essential words with pictures and audio.",
                    "wordCount": word_count,
                    "available": True,
                    "activities": ["learn", "practice"],
                },
                {
                    "id": "grammar",
                    "title": "Learn Grammar",
                    "emoji": "✏️",
                    "blurb": "Build correct sentences — coming soon.",
                    "available": False,
                    "activities": [],
                },
            ],
        },
        {
            "id": "basic-spanish",
            "title": "Learn Basic Spanish",
            "emoji": "🇪🇸",
            "blurb": "Start speaking Spanish — coming soon.",
            "available": False,
            "modules": [],
        },
    ]
