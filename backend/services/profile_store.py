import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "users.db"

BASE_THRESHOLD = 100
SENSITIVITY_THRESHOLDS = {
    "is_asthmatic": 50,
    "is_elderly": 75,
    "has_children": 75,
}


def _connect():
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with closing(_connect()) as connection:
        with connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    password_hash TEXT,
                    is_asthmatic INTEGER NOT NULL DEFAULT 0,
                    is_elderly INTEGER NOT NULL DEFAULT 0,
                    has_children INTEGER NOT NULL DEFAULT 0,
                    custom_threshold INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(users)")
            }
            if "password_hash" not in columns:
                connection.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")


def compute_threshold(health_profile: dict) -> int:
    custom_threshold = health_profile.get("custom_threshold")
    if custom_threshold is not None:
        return int(custom_threshold)

    thresholds = [BASE_THRESHOLD]
    thresholds.extend(
        threshold
        for profile_key, threshold in SENSITIVITY_THRESHOLDS.items()
        if health_profile.get(profile_key)
    )
    return min(thresholds)


def _health_profile_from_row(row: sqlite3.Row) -> dict:
    return {
        "is_asthmatic": bool(row["is_asthmatic"]),
        "is_elderly": bool(row["is_elderly"]),
        "has_children": bool(row["has_children"]),
        "custom_threshold": row["custom_threshold"],
    }


def create_user(username: str, email: str, password_hash: str) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    with closing(_connect()) as connection:
        with connection:
            cursor = connection.execute(
                """
                INSERT INTO users (
                    username, email, password_hash, is_asthmatic, is_elderly,
                    has_children, custom_threshold, created_at, updated_at
                ) VALUES (?, ?, ?, 0, 0, 0, NULL, ?, ?)
                ON CONFLICT(username) DO NOTHING
                """,
                (username, email, password_hash, now, now),
            )
            return cursor.rowcount == 1


def get_password_hash(username: str) -> str | None:
    with closing(_connect()) as connection:
        row = connection.execute(
            "SELECT password_hash FROM users WHERE username = ?", (username,)
        ).fetchone()
    return row["password_hash"] if row is not None else None


def update_health_profile(username: str, health_profile: dict) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    with closing(_connect()) as connection:
        with connection:
            cursor = connection.execute(
                """
                UPDATE users SET
                    is_asthmatic = ?,
                    is_elderly = ?,
                    has_children = ?,
                    custom_threshold = ?,
                    updated_at = ?
                WHERE username = ?
                """,
                (
                    int(health_profile.get("is_asthmatic", False)),
                    int(health_profile.get("is_elderly", False)),
                    int(health_profile.get("has_children", False)),
                    health_profile.get("custom_threshold"),
                    now,
                    username,
                ),
            )
            return cursor.rowcount == 1


def get_user(username: str) -> dict | None:
    with closing(_connect()) as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()

    if row is None:
        return None

    user = dict(row)
    user.pop("password_hash", None)
    user["health_profile"] = _health_profile_from_row(row)
    user["personal_threshold"] = compute_threshold(user["health_profile"])
    return user


init_db()
