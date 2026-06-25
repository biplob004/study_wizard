"""SQLite storage for accounts, per-course progress, and cross-cutting features.

The database file lives at ``data/app.db`` (at the backend root), so it persists
across restarts and is bind-mounted in Docker. Everything here is plain
``sqlite3`` from the standard library — no ORM, no extra dependencies.

Tables:
- ``users``             — one row per account (email + PBKDF2 password hash).
- ``sessions``          — bearer tokens; one row per active login.
- ``learned_items``     — items a user has studied in a course's Learn mode,
                          scoped by (user_id, course_id, item_id).
- ``practice_results``  — the score of each finished Practice/Card-flip session
                          for a course, scoped by (user_id, course_id).
- ``practice_exposures``— per-item times-shown counter for a course's practice.
- ``focus_time``        — focused-tab seconds, bucketed by (user, day, route).
- ``task_habits``       — a user's recurring habit definitions (per-user).
- ``task_entries``      — a user's per-day habit check-offs (per-user, no course).

The ``course_id`` column isolates each course's progress so records for
Vocabulary never intermingle with Grammar, etc. Tasks & habits and focus-time
are cross-cutting (not course-scoped) — they live under their own routes.
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
    path    TEXT    NOT NULL DEFAULT '',  -- route path, e.g. /course/vocab/practice
    seconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day, path)
);

CREATE TABLE IF NOT EXISTS task_entries (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     TEXT    NOT NULL,   -- 'YYYY-MM-DD'
    text    TEXT    NOT NULL,
    points  INTEGER NOT NULL DEFAULT 0,
    status  TEXT    NOT NULL DEFAULT 'pending',  -- 'done' | 'skipped' | 'pending'
    PRIMARY KEY (user_id, day, text)
);

CREATE TABLE IF NOT EXISTS task_habits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT    NOT NULL,
    points     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""

# Valid task check-off statuses (after legacy "failed" is normalized to "skipped").
_TASK_STATUSES = ("done", "skipped", "pending")


def init_db() -> None:
    """Create the database file and tables if they don't exist yet."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)


def _has_column(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """True if `column` exists on `table` (used by migrations)."""
    cols = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    return column in cols


def _migrate(conn: sqlite3.Connection) -> None:
    """Apply schema changes introduced after the initial release (idempotent)."""
    # practice_results.activity was added to distinguish practice vs card-flip.
    if not _has_column(conn, "practice_results", "activity"):
        conn.execute(
            "ALTER TABLE practice_results ADD COLUMN activity TEXT NOT NULL DEFAULT 'practice'"
        )

    # task_entries was originally course-scoped (NOT NULL course_id) when the
    # tracker was a course plugin; it's now cross-cutting (user-only). Recreate
    # it without course_id so fresh saves don't hit the NOT NULL constraint.
    if _has_column(conn, "task_entries", "course_id"):
        conn.execute("DROP TABLE task_entries")
        conn.execute(SCHEMA)

    # focus_time was originally bucketed by (user_id, day); it now also buckets
    # by route `path` so per-page stats are navigable. Recreate the table (which
    # also updates the primary key) — prior rows are re-saved under path=''.
    if not _has_column(conn, "focus_time", "path"):
        old_rows = conn.execute(
            "SELECT user_id, day, seconds FROM focus_time"
        ).fetchall()
        conn.execute("DROP TABLE focus_time")
        conn.execute(SCHEMA)
        conn.executemany(
            "INSERT INTO focus_time (user_id, day, path, seconds) VALUES (?, ?, '', ?)",
            [(r["user_id"], r["day"], r["seconds"]) for r in old_rows],
        )


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


def _row(row: sqlite3.Row, *columns: str) -> dict[str, Any]:
    """Pick `columns` from a Row into a plain dict (or return the whole row)."""
    return {c: row[c] for c in columns} if columns else dict(row)


# --- Users & sessions ------------------------------------------------------

def create_user(email: str, display_name: str, password_hash: str, salt: str) -> dict[str, Any]:
    """Insert a new account and return its full row."""
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, display_name, password_hash, salt) VALUES (?, ?, ?, ?)",
            (email, display_name, password_hash, salt),
        )
        return _row(conn.execute(
            "SELECT * FROM users WHERE id = ?", (cur.lastrowid,)
        ).fetchone())


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Look up an account by email (case-sensitive, as stored)."""
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return _row(row) if row else None


def create_session(token: str, user_id: int) -> None:
    """Issue a new bearer token for a user."""
    with connect() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))


def get_user_by_token(token: str) -> dict[str, Any] | None:
    """Resolve the user a bearer token belongs to (or None if unknown/expired)."""
    with connect() as conn:
        row = conn.execute(
            """
            SELECT u.* FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
    return _row(row) if row else None


def delete_session(token: str) -> None:
    """Invalidate a bearer token (logout)."""
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# --- Per-course progress ---------------------------------------------------

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
    """Append a finished-session score (practice or card-flip) for a course."""
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO practice_results (user_id, course_id, activity, score, total)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, course_id, activity, score, total),
        )


def record_practice_exposures(user_id: int, course_id: str, item_ids: list[str]) -> None:
    """Bump the times-shown counter for each item the learner saw this session."""
    if not item_ids:
        return
    with connect() as conn:
        conn.executemany(
            """
            INSERT INTO practice_exposures (user_id, course_id, item_id, times_shown, last_shown)
            VALUES (?, ?, ?, 1, datetime('now'))
            ON CONFLICT(user_id, course_id, item_id)
            DO UPDATE SET times_shown = times_shown + 1, last_shown = datetime('now')
            """,
            [(user_id, course_id, item_id) for item_id in item_ids],
        )


def get_practice_exposures(user_id: int, course_id: str) -> dict[str, int]:
    """Map item_id -> times shown in past practice sessions for this course."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT item_id, times_shown FROM practice_exposures
            WHERE user_id = ? AND course_id = ?
            """,
            (user_id, course_id),
        ).fetchall()
    return {row["item_id"]: row["times_shown"] for row in rows}


def get_course_progress(user_id: int, course_id: str, *, total_items: int) -> dict[str, Any]:
    """Aggregate a user's progress for a single course (practice + card-flip)."""
    with connect() as conn:
        items_learned = conn.execute(
            "SELECT COUNT(*) AS n FROM learned_items WHERE user_id = ? AND course_id = ?",
            (user_id, course_id),
        ).fetchone()["n"]
        # One grouped query covers both activities — far cheaper than the two
        # near-identical scans the old version ran.
        rows = conn.execute(
            """
            SELECT activity,
                   COUNT(*)          AS sessions,
                   COALESCE(SUM(score), 0)         AS stars,
                   COALESCE(MAX(score * 100.0 / total), 0) AS best_pct
            FROM practice_results
            WHERE user_id = ? AND course_id = ?
            GROUP BY activity
            """,
            (user_id, course_id),
        ).fetchall()
    by_activity = {row["activity"]: row for row in rows}
    practice = by_activity.get("practice")
    card_flip = by_activity.get("card-flip")
    return {
        "course_id": course_id,
        "items_learned": items_learned,
        "total_items": total_items,
        "practice_sessions": practice["sessions"] if practice else 0,
        "total_stars": practice["stars"] if practice else 0,
        "best_score_pct": round(practice["best_pct"]) if practice else 0,
        "card_flip_sessions": card_flip["sessions"] if card_flip else 0,
        "card_flip_stars": card_flip["stars"] if card_flip else 0,
        "card_flip_best_pct": round(card_flip["best_pct"]) if card_flip else 0,
    }


def get_overall_progress(user_id: int) -> list[dict[str, Any]]:
    """Per-course items-learned counts (the only thing the dashboard needs)."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT course_id, COUNT(DISTINCT item_id) AS items_learned
            FROM learned_items WHERE user_id = ?
            GROUP BY course_id
            """,
            (user_id,),
        ).fetchall()
    return [_row(r, "course_id", "items_learned") for r in rows]


# --- Focus time ------------------------------------------------------------
# Time the learner spent with the site as the foreground, focused tab. The
# frontend ticks a counter only while the tab is visible and focused, then
# flushes the elapsed seconds here, bucketed by the learner's local calendar day
# and the route path they were on.

def add_focus_time(user_id: int, day: str, seconds: int, path: str = "") -> None:
    """Add focused seconds to a learner's (day, path) bucket (creating it)."""
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO focus_time (user_id, day, path, seconds)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, day, path)
            DO UPDATE SET seconds = seconds + excluded.seconds
            """,
            (user_id, day, path or "", seconds),
        )


def get_focus_time(user_id: int, since_day: str) -> list[dict[str, Any]]:
    """Daily focused seconds (summed across all routes) on or after `since_day`."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT day, SUM(seconds) AS seconds FROM focus_time
            WHERE user_id = ? AND day >= ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (user_id, since_day),
        ).fetchall()
    return [{"day": r["day"], "seconds": r["seconds"] or 0} for r in rows]


def get_focus_time_by_path(user_id: int, since_day: str) -> list[dict[str, Any]]:
    """Focused seconds per route path on or after `since_day` (oldest first)."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT day, path, SUM(seconds) AS seconds FROM focus_time
            WHERE user_id = ? AND day >= ?
            GROUP BY day, path
            ORDER BY day ASC, path ASC
            """,
            (user_id, since_day),
        ).fetchall()
    return [
        {"day": r["day"], "path": r["path"], "seconds": r["seconds"] or 0}
        for r in rows
    ]


def get_focus_paths(user_id: int) -> list[str]:
    """Distinct route paths the learner has logged focused time on."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT DISTINCT path FROM focus_time WHERE user_id = ? ORDER BY path ASC",
            (user_id,),
        ).fetchall()
    return [r["path"] for r in rows]


# --- Tasks & habits ---------------------------------------------------------
# Per-user, per-day habit check-offs for the Tasks & Habits tracker (a
# cross-cutting feature like focus-time, not a course). The habit *definitions*
# are also per-user — each learner owns and edits their own list, stored in the
# ``task_habits`` table; per-day check-offs live in ``task_entries``. The
# per-day points total is *not* stored — it is derived by the frontend from the
# current habit list, so editing/deleting a habit automatically fixes past days.

def _habit_row(row: sqlite3.Row) -> dict[str, Any]:
    """Project a task_habits row to the {text, points} shape the API exposes."""
    return {"text": row["text"], "points": row["points"]}


def get_task_habits(user_id: int) -> list[dict[str, Any]]:
    """A user's recurring habit definitions, oldest first (insertion order)."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, text, points FROM task_habits WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()
    return [_habit_row(r) for r in rows]


def add_task_habit(user_id: int, text: str, points: int) -> dict[str, Any]:
    """Append a habit for a user and return the new habit row."""
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO task_habits (user_id, text, points) VALUES (?, ?, ?)",
            (user_id, text, points),
        )
        row = conn.execute(
            "SELECT id, text, points FROM task_habits WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return _habit_row(row)


def delete_task_habit_by_index(user_id: int, index: int) -> list[dict[str, Any]]:
    """Delete a user's habit at the given 0-based index (oldest-first).

    Indexes refer to the position in the list returned by ``get_task_habits``,
    so the frontend's positional delete keeps working. Out-of-range indexes are
    ignored (no error). The habit's past per-day check-offs are also dropped so
    totals and streaks recompute cleanly — a re-added habit with the same name
    starts fresh rather than inheriting the old history. Returns the updated
    habit list.
    """
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, text FROM task_habits WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()
        if 0 <= index < len(rows):
            conn.execute("DELETE FROM task_habits WHERE id = ?", (rows[index]["id"],))
            conn.execute(
                "DELETE FROM task_entries WHERE user_id = ? AND text = ?",
                (user_id, rows[index]["text"]),
            )
        habits = conn.execute(
            "SELECT id, text, points FROM task_habits WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()
    return [_habit_row(r) for r in habits]


def get_task_state(user_id: int) -> list[dict[str, Any]]:
    """A user's per-day task records as ``[{date, tasks}]`` (oldest first).

    ``dayPoints`` is deliberately NOT included — it is a derived value (the sum
    of points of `done` tasks whose habit still exists), computed by the
    frontend from the habit list. Keeping it out of storage means editing or
    deleting a habit automatically fixes past day totals.
    """
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT day, text, points, status FROM task_entries
            WHERE user_id = ?
            ORDER BY day ASC, rowid ASC
            """,
            (user_id,),
        ).fetchall()
    by_day: dict[str, dict[str, Any]] = {}
    for r in rows:
        day = by_day.setdefault(r["day"], {"date": r["day"], "tasks": []})
        day["tasks"].append(
            {"text": r["text"], "points": r["points"], "status": r["status"]}
        )
    return list(by_day.values())


def save_task_state(user_id: int, data: list[Any]) -> None:
    """Replace a user's task records with the given per-day entries.

    Only rows whose habit is in a non-default state or carries a custom points
    override are worth keeping; defaults (pending + base points) are dropped so
    the table stays compact. The legacy ``"failed"`` status is normalized to
    ``"skipped"`` for backward compatibility.
    """
    pending_rows: list[tuple[int, str, str, int, str]] = []
    for day in data:
        ds = _field(day, "date")
        if not ds:
            continue
        for t in _field(day, "tasks") or []:
            text = _field(t, "text")
            if not text:
                continue
            status = _field(t, "status") or "pending"
            if status == "failed":
                status = "skipped"
            if status not in _TASK_STATUSES:
                status = "pending"
            try:
                points = int(_field(t, "points") or 0)
            except (TypeError, ValueError):
                points = 0
            pending_rows.append((user_id, ds, text, points, status))

    with connect() as conn:
        conn.execute("DELETE FROM task_entries WHERE user_id = ?", (user_id,))
        conn.executemany(
            """
            INSERT OR REPLACE INTO task_entries (user_id, day, text, points, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            pending_rows,
        )


def _field(obj: Any, name: str, default: Any = None) -> Any:
    """Read `name` off a pydantic model (attribute) or a plain dict."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)