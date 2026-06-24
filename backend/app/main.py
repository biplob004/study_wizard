"""FastAPI app for the Vocabulary Practice backend.

Responsibilities:
- Own the data: serve the vocabulary dataset and the image files.
- Judge free-text answers with the LLM (with a deterministic fallback).
"""

from __future__ import annotations

import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from scripts.playground.routes import router as playground_router

from .llm import check_answer
from .schemas import AnswerCheck, CheckRequest
from .vocabulary import AUDIO_DIR, IMAGES_DIR, get_dataset

# The .env lives at the project root (one level above backend/), so load it explicitly
# rather than relying on the current working directory.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Vocabulary Practice API", version="1.0.0")

# The Vite dev server origins (5173 default; 5174/5175 are common fallbacks when
# the default port is busy). Add your deployed frontend origin here too.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):(5173|5174|5175)",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the user-provided images. created at import time so it always exists.
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=IMAGES_DIR), name="images")

# Serve the generated spoken-word audio clips (see scripts/audio_gen/generate.py).
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# Experimental endpoints (e.g. Gemini image generation) live in the playground package.
app.include_router(playground_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/vocabulary")
def vocabulary(request: Request) -> list[dict]:
    """Return the dataset with image filenames rewritten to full static URLs."""
    return get_dataset(str(request.base_url))


@app.post("/api/check-answer", response_model=AnswerCheck)
def check(req: CheckRequest) -> AnswerCheck:
    """Judge a learner's free-text answer (used by type-answer and fill-blank)."""
    return check_answer(req)
