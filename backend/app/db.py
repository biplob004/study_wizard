"""SQLite storage for accounts and learning progress.

The database file lives at ``data/app.db`` (next to ``vocabulary.json``), so it persists across
restarts and is bind-mounted in Docker just like the rest of ``data/``. Everything here is plain
``sqlite3`` from the standard library — no ORM, no extra dependencies.

Tables:
- ``users``            — one row per account (email + PBKDF2 password hash).
- ``sessions``         — bearer tokens; one row per active login.
- ``learned_words``    — which vocabulary words a user has studied in Learning mode.
- ``practice_results`` — the score of each finished Practice session.
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

CREATE TABLE IF NOT EXISTS learned_words (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id    TEXT    NOT NULL,
    learned_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, word_id)
);

CREATE TABLE IF NOT EXISTS practice_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


def init_db() -> None:
    """Create the database file and tables if they don't exist yet."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open a connection with row access by name and foreign keys enforced.

    Used as a context manager so the connection commits on success and always closes.
    """
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
    """Insert a new user; raises sqlite3.IntegrityError if the email is taken."""
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
    """Resolve a bearer token to its user, or None if the token is unknown."""
    with connect() as conn:
        row = conn.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?",
            (token,),
        ).fetchone()
    return dict(row) if row else None


def delete_session(token: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# --- Progress ---------------------------------------------------------------

def record_learned_word(user_id: int, word_id: str) -> None:
    """Mark a word as studied. Idempotent — re-studying keeps the first timestamp."""
    with connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO learned_words (user_id, word_id) VALUES (?, ?)",
            (user_id, word_id),
        )


def record_practice_result(user_id: int, score: int, total: int) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO practice_results (user_id, score, total) VALUES (?, ?, ?)",
            (user_id, score, total),
        )


def get_progress_summary(user_id: int) -> dict[str, Any]:
    """Aggregate a user's progress for the dashboard."""
    with connect() as conn:
        words_learned = conn.execute(
            "SELECT COUNT(*) AS n FROM learned_words WHERE user_id = ?", (user_id,)
        ).fetchone()["n"]
        practice = conn.execute(
            """
            SELECT COUNT(*) AS sessions,
                   COALESCE(SUM(score), 0) AS stars,
                   COALESCE(MAX(score * 100.0 / total), 0) AS best_pct
            FROM practice_results WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
    return {
        "words_learned": words_learned,
        "practice_sessions": practice["sessions"],
        "total_stars": practice["stars"],
        "best_score_pct": round(practice["best_pct"]),
    }
