"""Text-to-speech for generated sentences, with on-disk caching.

Three kinds of audio per sentence, each in its own committed directory so a clip is
generated once and then reused for every user, forever — all synthesized with Sarvam
AI (``bulbul:v3``):

    sentence     -> data/sentence_audio/s<id>.wav     (English, en-IN)
    translation  -> data/translation_audio/s<id>.wav  (Hindi,  hi-IN)
    description  -> data/desc_audio/s<id>.wav          (Hindi,  hi-IN)

``audio_for`` returns the static URL. If the file already exists it is returned
as-is with no API call; otherwise it is synthesized, saved, and returned.

Sarvam is called via the standard library only (no extra dependency).
"""

from __future__ import annotations

import base64
import json
import logging
import os
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .data import DATA_DIR

logger = logging.getLogger("courses.vocabulary.tts")

URL_BASE = "/static/courses/vocabulary"

SARVAM_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_MODEL = "bulbul:v3"
SARVAM_SPEAKER = "priya"


class TTSError(RuntimeError):
    """Raised when audio synthesis is unavailable or fails."""


@dataclass(frozen=True)
class _Kind:
    field: str          # which sentence field holds the text
    directory: Path     # where the file is written
    ext: str            # file extension (without dot)
    lang: str           # Sarvam target_language_code (BCP-47)


SENTENCE_AUDIO_DIR = DATA_DIR / "sentence_audio"
TRANSLATION_AUDIO_DIR = DATA_DIR / "translation_audio"
DESC_AUDIO_DIR = DATA_DIR / "desc_audio"

KINDS: dict[str, _Kind] = {
    "sentence": _Kind("sentence", SENTENCE_AUDIO_DIR, "wav", "en-IN"),
    "translation": _Kind("translation", TRANSLATION_AUDIO_DIR, "wav", "hi-IN"),
    "description": _Kind("description", DESC_AUDIO_DIR, "wav", "hi-IN"),
}

# Mount subpath -> directory, consumed by VocabularyCourse.extra_static.
STATIC_DIRS: dict[str, Path] = {
    "sentence_audio": SENTENCE_AUDIO_DIR,
    "translation_audio": TRANSLATION_AUDIO_DIR,
    "desc_audio": DESC_AUDIO_DIR,
}


def _url_for(kind: str, filename: str) -> str:
    subpath = next(sp for sp, d in STATIC_DIRS.items() if d == KINDS[kind].directory)
    return f"{URL_BASE}/{subpath}/{filename}"


def cached_url(sentence_id: int, kind: str) -> str | None:
    """The static URL for an already-synthesized clip, or None if it doesn't exist yet."""
    spec = KINDS.get(kind)
    if spec is None:
        return None
    filename = f"s{sentence_id}.{spec.ext}"
    if (spec.directory / filename).exists():
        return _url_for(kind, filename)
    return None


def audio_for(sentence_row: dict[str, Any], kind: str) -> str:
    """Return the static URL for a sentence's audio, generating + caching if missing."""
    if kind not in KINDS:
        raise TTSError(f"Unknown audio kind: {kind!r}")
    spec = KINDS[kind]

    text = (sentence_row.get(spec.field) or "").strip()
    if not text:
        raise TTSError(f"No {spec.field} text to synthesize for sentence {sentence_row.get('id')}")

    filename = f"s{sentence_row['id']}.{spec.ext}"
    out_path = spec.directory / filename
    if out_path.exists():
        return _url_for(kind, filename)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        _synth_sarvam(text, spec.lang, out_path)
    except TTSError:
        raise
    except Exception as exc:  # noqa: BLE001
        out_path.unlink(missing_ok=True)
        logger.exception("TTS failed for sentence %s (%s)", sentence_row.get("id"), kind)
        raise TTSError(str(exc)) from exc

    return _url_for(kind, filename)


def _synth_sarvam(text: str, lang: str, out_path: Path) -> None:
    """Synthesize speech with Sarvam AI (bulbul:v3) and write the WAV bytes to `out_path`."""
    key = os.getenv("SARVAMAI_API_KEY")
    if not key:
        raise TTSError("Audio unavailable (SARVAMAI_API_KEY not set).")

    payload = json.dumps(
        {
            "text": text,
            "target_language_code": lang,
            "model": SARVAM_MODEL,
            "speaker": SARVAM_SPEAKER,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        SARVAM_URL,
        data=payload,
        headers={"Content-Type": "application/json", "api-subscription-key": key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    audios = body.get("audios") or []
    if not audios:
        raise TTSError("Sarvam returned no audio.")
    out_path.write_bytes(base64.b64decode(audios[0]))
