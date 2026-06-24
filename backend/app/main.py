"""FastAPI app for the Education Site backend.

The app owns shared concerns (accounts, the cross-course progress overview, the
course catalog) and mounts each course plugin's router and static media under
``/api/courses/{id}`` and ``/static/courses/{id}`` respectively. Adding a course
is a drop-in operation (see ``app/courses/__init__.py``).
"""

from __future__ import annotations

import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import db
from .courses import all_courses, catalog, mount_course_routers
from .routers import auth as auth_router
from .routers import progress as progress_router
from .routers import time as time_router

# The .env lives at the project root (one level above backend/).
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Education Site API", version="2.0.0")

db.init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):(5173|5174|5175)",
    allow_methods=["*"],
    allow_headers=["*"],
)


def _mount_course_static() -> None:
    """Mount each course's images/ and audio/ directories, when present."""
    for course in all_courses():
        if course.images_dir:
            course.images_dir.mkdir(parents=True, exist_ok=True)
            app.mount(
                f"/static/courses/{course.id}/images",
                StaticFiles(directory=course.images_dir),
                name=f"{course.id}-images",
            )
        if course.audio_dir:
            course.audio_dir.mkdir(parents=True, exist_ok=True)
            app.mount(
                f"/static/courses/{course.id}/audio",
                StaticFiles(directory=course.audio_dir),
                name=f"{course.id}-audio",
            )


# Shared routers.
app.include_router(auth_router.router)       # /api/auth/*     — accounts & sessions
app.include_router(progress_router.router)   # /api/progress/* — cross-course overview
app.include_router(time_router.router)       # /api/time/*     — focus-time tracking

# Course catalog and per-course routers + static media.
mount_course_routers(app)
_mount_course_static()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/courses")
def courses() -> list[dict]:
    """The course catalog shown on the landing/dashboard."""
    return catalog()
