"""SQLite storage for accounts and per-course learning progress.

The database file lives at ``data/app.db`` (at the backend root), so it persists
across restarts and is bind-mounted in Docker. Everything here is plain
``sqlite3`` from the standard library — no ORM, no extra dependencies.

Tables:
- ``users``            — one row per account (email + PBKDF2 password hash).
- ``sessions``         — bearer tokens; one row per active login.
- ``learned_items``    — items a user has studied in a course's Learn mode,
                         scoped by (user_id, course_id, item_id).
- ``practice_results`` — the score of each finished Practice session for a
                         course, scoped by (user_id, course_id).

The ``course_id`` column isolates each course's progress so records for
Vocabulary never intermingle with Grammar, etc.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    display_name  TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    salt          TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learned_items (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  TEXT    NOT NULL,
    item_id    TEXT    NOT NULL,
    learned_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, course_id, item_id)
);

CREATE TABLE IF NOT EXISTS practice_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  TEXT    NOT NULL,
    activity   TEXT    NOT NULL DEFAULT 'practice',
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS practice_exposures (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id    TEXT    NOT NULL,
    item_id      TEXT    NOT NULL,
    times_shown  INTEGER NOT NULL DEFAULT 0,
    last_shown   TEXT,
    PRIMARY KEY (user_id, course_id, item_id)
);

CREATE TABLE IF NOT EXISTS focus_time (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     TEXT    NOT NULL,   -- the learner's LOCAL calendar day, 'YYYY-MM-DD'
    seconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
"""


def init_db() -> None:
    """Create the database file and tables if they don't exist yet."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)


def _migrate(conn: sqlite3.Connection) -> None:
    """Add columns introduced after the initial schema (safe if already present)."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(practice_results)").fetchall()}
    if "activity" not in cols:
        conn.execute("ALTER TABLE practice_results ADD COLUMN activity TEXT NOT NULL DEFAULT 'practice'")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open a connection with row access by name and foreign keys enforced."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# --- Users & sessions -------------------------------------------------------

def create_user(email: str, display_name: str, password_hash: str, salt: str) -> dict[str, Any]:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, display_name, password_hash, salt) VALUES (?, ?, ?, ?)",
            (email, display_name, password_hash, salt),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row) if row else None


def create_session(token: str, user_id: int) -> None:
    with connect() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))


def get_user_by_token(token: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?",
            (token,),
        ).fetchone()
    return dict(row) if row else None


def delete_session(token: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# --- Per-course progress ----------------------------------------------------

def record_learned_item(user_id: int, course_id: str, item_id: str) -> None:
    """Mark an item as studied in a course. Idempotent."""
    with connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO learned_items (user_id, course_id, item_id) VALUES (?, ?, ?)",
            (user_id, course_id, item_id),
        )


def record_practice_result(
    user_id: int, course_id: str, score: int, total: int, activity: str = "practice"
) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO practice_results (user_id, course_id, activity, score, total) VALUES (?, ?, ?, ?, ?)",
            (user_id, course_id, activity, score, total),
        )


def record_practice_exposures(user_id: int, course_id: str, item_ids: list[str]) -> None:
    """Bump the times-shown counter for each item the learner saw this session."""
    if not item_ids:
        return
    with connect() as conn:
        for item_id in item_ids:
            conn.execute(
                """
                INSERT INTO practice_exposures (user_id, course_id, item_id, times_shown, last_shown)
                VALUES (?, ?, ?, 1, datetime('now'))
                ON CONFLICT(user_id, course_id, item_id)
                DO UPDATE SET times_shown = times_shown + 1, last_shown = datetime('now')
                """,
                (user_id, course_id, item_id),
            )


def get_practice_exposures(user_id: int, course_id: str) -> dict[str, int]:
    """Map item_id -> times shown in past practice sessions for this course."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT item_id, times_shown FROM practice_exposures WHERE user_id = ? AND course_id = ?",
            (user_id, course_id),
        ).fetchall()
    return {row["item_id"]: row["times_shown"] for row in rows}


def get_course_progress(user_id: int, course_id: str, *, total_items: int) -> dict[str, Any]:
    """Aggregate a user's progress for a single course."""
    with connect() as conn:
        items_learned = conn.execute(
            "SELECT COUNT(*) AS n FROM learned_items WHERE user_id = ? AND course_id = ?",
            (user_id, course_id),
        ).fetchone()["n"]
        practice = conn.execute(
            """
            SELECT COUNT(*) AS sessions,
                   COALESCE(SUM(score), 0) AS stars,
                   COALESCE(MAX(score * 100.0 / total), 0) AS best_pct
            FROM practice_results WHERE user_id = ? AND course_id = ? AND activity = 'practice'
            """,
            (user_id, course_id),
        ).fetchone()
        card_flip = conn.execute(
            """
            SELECT COUNT(*) AS sessions,
                   COALESCE(SUM(score), 0) AS stars,
                   COALESCE(MAX(score * 100.0 / total), 0) AS best_pct
            FROM practice_results WHERE user_id = ? AND course_id = ? AND activity = 'card-flip'
            """,
            (user_id, course_id),
        ).fetchone()
    return {
        "course_id": course_id,
        "items_learned": items_learned,
        "total_items": total_items,
        "practice_sessions": practice["sessions"],
        "total_stars": practice["stars"],
        "best_score_pct": round(practice["best_pct"]),
        "card_flip_sessions": card_flip["sessions"],
        "card_flip_stars": card_flip["stars"],
        "card_flip_best_pct": round(card_flip["best_pct"]),
    }


def get_overall_progress(user_id: int) -> list[dict[str, Any]]:
    """Per-course items-learned counts (the only thing the dashboard needs)."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT course_id,
                   COUNT(DISTINCT item_id) AS items_learned
            FROM learned_items WHERE user_id = ?
            GROUP BY course_id
            """,
            (user_id,),
        ).fetchall()
    return [
        {"course_id": r["course_id"], "items_learned": r["items_learned"]}
        for r in rows
    ]


# --- Focus time -------------------------------------------------------------
# Time the learner spent with the site as the foreground, focused tab. The
# frontend ticks a counter only while the tab is visible and focused, then
# flushes the elapsed seconds here, bucketed by the learner's local calendar day.

def add_focus_time(user_id: int, day: str, seconds: int) -> None:
    """Add focused seconds to a learner's daily bucket (creating it if needed)."""
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO focus_time (user_id, day, seconds)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, day)
            DO UPDATE SET seconds = seconds + excluded.seconds
            """,
            (user_id, day, seconds),
        )


def get_focus_time(user_id: int, since_day: str) -> list[dict[str, Any]]:
    """Daily focused seconds for a learner on or after ``since_day`` (oldest first)."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT day, seconds FROM focus_time
            WHERE user_id = ? AND day >= ?
            ORDER BY day ASC
            """,
            (user_id, since_day),
        ).fetchall()
    return [{"day": r["day"], "seconds": r["seconds"]} for r in rows]
