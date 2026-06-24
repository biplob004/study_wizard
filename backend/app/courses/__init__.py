"""The course plugin system.

A *course* is a self-contained unit of learning content (e.g. Vocabulary, Grammar,
Comprehensive Reading) that owns its data, its API routes, and its progress
tracking. Each course lives in its own subpackage under ``app.courses`` and
exports a ``Course`` instance from its ``course`` module.

Adding a new course:
  1. Create ``app/courses/<your_course>/`` with a ``course.py`` that exports a
     ``Course`` instance.
  2. Add the subpackage name to ``COURSE_PACKAGES`` below (or rely on auto
     discovery).
  3. That's it — the registry mounts its router and merges its catalog entry.

Per-course isolation:
  - Each course's router is mounted at ``/api/courses/{course.id}`` so its
    endpoints are namespaced and never collide with another course's.
  - Progress tables carry a ``course_id`` column so records for one course never
    intermingle with another's.
  - Data files (JSON, images, audio) live inside the course's own ``data/``
    directory — no shared content folder to fight over.
"""

from __future__ import annotations

import importlib
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger("courses")

# Subpackages of ``app.courses`` that expose a Course. New courses are picked up
# automatically as long as they export a ``course`` object from their ``course``
# module. List them explicitly here for clarity and to control load order.
COURSE_PACKAGES = ["vocabulary"]


class Course:
    """A course plugin.

    Subclass this in your course's ``course.py`` and set the class attributes,
    then export an instance as ``course``. Override ``router()`` to expose
    course-scoped endpoints (mounted at ``/api/courses/{id}``).
    """

    id: str = ""
    title: str = ""
    emoji: str = ""
    blurb: str = ""
    available: bool = True
    modules: list[dict[str, Any]] = []

    # Media directories the course owns (optional). When set, main.py mounts them
    # at /static/courses/{id}/images and /static/courses/{id}/audio.
    images_dir: Path | None = None
    audio_dir: Path | None = None

    def catalog_entry(self) -> dict[str, Any]:
        """The shape consumed by the frontend course catalog."""
        return {
            "id": self.id,
            "title": self.title,
            "emoji": self.emoji,
            "blurb": self.blurb,
            "available": self.available,
            "modules": self.modules,
        }

    def router(self) -> APIRouter | None:
        """Course-scoped router mounted at /api/courses/{id}. Override to add routes."""
        return None


def _discover() -> list[Course]:
    """Import each course package and collect its ``course`` instance."""
    found: list[Course] = []
    for name in COURSE_PACKAGES:
        try:
            mod = importlib.import_module(f"app.courses.{name}.course")
        except Exception:  # noqa: BLE001 — a broken course shouldn't kill the app
            logger.exception("Failed to load course %r — skipping", name)
            continue
        course = getattr(mod, "course", None)
        if not isinstance(course, Course):
            logger.warning("app.courses.%s.course has no `course: Course` instance", name)
            continue
        found.append(course)
    logger.info("Loaded %d course(s): %s", len(found), [c.id for c in found])
    return found


_REGISTRY: list[Course] | None = None


def all_courses() -> list[Course]:
    """All registered courses (loaded once, cached)."""
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = _discover()
    return _REGISTRY


def get_course(course_id: str) -> Course | None:
    """Look up a course by id."""
    for c in all_courses():
        if c.id == course_id:
            return c
    return None


def catalog() -> list[dict[str, Any]]:
    """The full course catalog for ``GET /api/courses``."""
    return [c.catalog_entry() for c in all_courses()]


def mount_course_routers(app) -> None:
    """Mount each course's router under ``/api/courses/{id}`` on the FastAPI app."""
    for c in all_courses():
        router = c.router()
        if router is None:
            continue
        app.include_router(router, prefix=f"/api/courses/{c.id}")
        logger.info("Mounted router for course %r at /api/courses/%s", c.id, c.id)


__all__ = ["Course", "all_courses", "get_course", "catalog", "mount_course_routers"]
