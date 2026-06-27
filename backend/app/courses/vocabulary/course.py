"""The Vocabulary course plugin.

Defines the course metadata, serves its dataset, judges free-text answers, and
records per-course progress — all under ``/api/courses/vocabulary``.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app import auth, db
from app.courses import Course
from app.schemas import (
    AnswerCheck,
    AudioRequest,
    CheckRequest,
    CourseProgress,
    LearnedRequest,
    PracticeRequest,
)

from . import data, sentence_gen, store, tts
from .llm import check_answer
from .sentence_gen import SentenceGenError
from .tts import TTSError

COURSE_ID = "vocabulary"


def _shape(record: dict[str, Any]) -> dict[str, Any]:
    """API shape for a sentence: text fields + the English (Sarvam) audio URL.

    The English sentence clip is generated up front (cache-aware, so it's a one-time
    cost) and always returned when synthesis succeeds — that keeps the frontend from
    falling back to the browser's built-in voice for a missing file. Translation/
    description audio stays lazy (synthesized on first play via the /audio endpoint)."""
    try:
        sentence_audio = tts.audio_for(record, "sentence")
    except TTSError:
        sentence_audio = tts.cached_url(record["id"], "sentence")
    return {
        "id": record["id"],
        "sentence": record["sentence"],
        "translation": record.get("translation", ""),
        "description": record.get("description", ""),
        "sentenceAudio": sentence_audio,
    }


def _seed_first_sentence(word_id: str) -> dict[str, Any] | None:
    """Create sentence #1 for a word from the static dataset sentence (once).

    Enriches it with a Hindi translation/description when the LLM is available, and
    pre-synthesizes the English audio so it can auto-play. Both enrichment and audio
    are best-effort: failures still leave a usable text sentence."""
    entry = data.find_entry(word_id)
    if not entry or not entry.get("sentence"):
        return None

    translation, description = "", ""
    try:
        gen = sentence_gen.describe(entry["word"], entry["sentence"])
        translation, description = gen.translation, gen.description
    except SentenceGenError:
        pass  # keep the static sentence text; translation/description fill in later

    record = store.add(word_id, entry["sentence"], translation, description)
    try:
        tts.audio_for(record, "sentence")
    except TTSError:
        pass  # frontend falls back to browser speech synthesis
    return record


def _list_payload(word_id: str) -> dict[str, Any]:
    """The {sentences, canGenerate} payload for a word, seeding sentence #1 if empty."""
    records = store.list_for_word(word_id)
    if not records:
        seeded = _seed_first_sentence(word_id)
        records = [seeded] if seeded else []
    return {
        "sentences": [_shape(r) for r in records],
        "canGenerate": len(records) < store.MAX_PER_WORD,
    }


class VocabularyCourse(Course):
    id = COURSE_ID
    title = "Vocabulary"
    emoji = "📚"
    blurb = "Everyday words with pictures and audio — learn, then practice."
    available = True

    # Media directories (mounted at /static/courses/vocabulary/{images,audio}).
    images_dir = data.IMAGES_DIR
    audio_dir = data.AUDIO_DIR

    # Per-sentence generated audio, each in its own committed directory.
    extra_static = tts.STATIC_DIRS

    @property
    def modules(self) -> list[dict[str, Any]]:
        word_count = data.total_items()
        return [
            {
                "id": "words",
                "title": "Learn Words",
                "emoji": "🗂️",
                "blurb": f"{word_count} essential words with pictures and audio.",
                "wordCount": word_count,
                "available": True,
                "activities": ["learn", "practice", "card-flip"],
            }
        ]

    def catalog_entry(self) -> dict[str, Any]:
        entry = super().catalog_entry()
        entry["modules"] = self.modules
        return entry

    def router(self) -> APIRouter:
        r = APIRouter(tags=["vocabulary"])

        @r.get("/content")
        def content() -> list[dict]:
            """The vocabulary dataset with image/audio as root-relative static URLs."""
            return data.get_dataset()

        @r.post("/check-answer", response_model=AnswerCheck)
        def check(req: CheckRequest) -> AnswerCheck:
            return check_answer(req)

        @r.post("/progress/learned")
        def mark_learned(
            req: LearnedRequest, user: dict = Depends(auth.current_user)
        ) -> dict[str, str]:
            db.record_learned_item(user["id"], COURSE_ID, req.item_id)
            return {"status": "ok"}

        @r.post("/progress/practice")
        def save_practice(
            req: PracticeRequest, user: dict = Depends(auth.current_user)
        ) -> dict[str, str]:
            db.record_practice_result(user["id"], COURSE_ID, req.score, req.total, req.activity)
            db.record_practice_exposures(user["id"], COURSE_ID, req.item_ids)
            return {"status": "ok"}

        @r.get("/progress/summary", response_model=CourseProgress)
        def progress_summary(user: dict = Depends(auth.current_user)) -> CourseProgress:
            data_ = db.get_course_progress(
                user["id"], COURSE_ID, total_items=data.total_items()
            )
            return CourseProgress(**data_)

        @r.get("/progress/exposures")
        def exposures(user: dict = Depends(auth.current_user)) -> dict[str, int]:
            """Map item_id -> times shown in past practice (for biasing future sampling)."""
            return db.get_practice_exposures(user["id"], COURSE_ID)

        # --- Example sentences (global, generated on demand) -----------------

        @r.get("/sentences/{word_id}")
        def list_sentences(word_id: str) -> dict[str, Any]:
            """A word's sentences (seeding the first one if it has none yet)."""
            return _list_payload(word_id)

        @r.post("/sentences/{word_id}/generate")
        def generate_sentence(
            word_id: str, user: dict = Depends(auth.current_user)
        ) -> dict[str, Any]:
            """Generate one new sentence for a word (max 10), saved globally."""
            entry = data.find_entry(word_id)
            if not entry:
                raise HTTPException(status_code=404, detail="Unknown word.")
            existing = store.list_for_word(word_id)
            if len(existing) >= store.MAX_PER_WORD:
                raise HTTPException(
                    status_code=409, detail=f"A word can have at most {store.MAX_PER_WORD} sentences."
                )
            try:
                gen = sentence_gen.generate(entry["word"], [r["sentence"] for r in existing])
            except SentenceGenError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc

            record = store.add(word_id, gen.sentence, gen.translation, gen.description)
            try:
                tts.audio_for(record, "sentence")  # pre-synthesize so it can auto-play
            except TTSError:
                pass
            return _shape(record)

        @r.post("/sentences/{word_id}/{sentence_id}/audio")
        def sentence_audio(
            word_id: str,
            sentence_id: int,
            req: AudioRequest,
            user: dict = Depends(auth.current_user),
        ) -> dict[str, str]:
            """Return a clip's URL, synthesizing + caching it on first request."""
            record = store.get(sentence_id)
            if not record or record.get("word_id") != word_id:
                raise HTTPException(status_code=404, detail="Unknown sentence.")

            # Backfill missing Hindi text (e.g. a sentence seeded while the LLM was
            # unavailable) so there is something to synthesize.
            if req.kind in ("translation", "description") and not record.get(req.kind):
                entry = data.find_entry(word_id)
                try:
                    gen = sentence_gen.describe(entry["word"], record["sentence"])
                except SentenceGenError as exc:
                    raise HTTPException(status_code=503, detail=str(exc)) from exc
                record = store.update(
                    sentence_id, translation=gen.translation, description=gen.description
                ) or record

            try:
                url = tts.audio_for(record, req.kind)
            except TTSError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            return {"audio": url}

        return r


course = VocabularyCourse()
