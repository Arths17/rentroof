from __future__ import annotations

import sqlite3
from pathlib import Path
from threading import Lock

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / ".data"
DB_PATH = DATA_DIR / "rentproof.sqlite"
SCHEMA_PATH = PROJECT_ROOT / "db" / "migrations" / "001_init.sql"

_init_lock = Lock()
_initialized = False


def _ensure_initialized(connection: sqlite3.Connection) -> None:
    global _initialized

    if _initialized:
      return

    with _init_lock:
        if _initialized:
            return

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with SCHEMA_PATH.open("r", encoding="utf-8") as schema_file:
            connection.executescript(schema_file.read())
        connection.commit()
        _initialized = True


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    _ensure_initialized(connection)
    return connection


def query_all(sql: str, params: tuple | list = ()) -> list[sqlite3.Row]:
    with get_connection() as connection:
        cursor = connection.execute(sql, params)
        return cursor.fetchall()


def query_one(sql: str, params: tuple | list = ()) -> sqlite3.Row | None:
    with get_connection() as connection:
        cursor = connection.execute(sql, params)
        return cursor.fetchone()


def execute(sql: str, params: tuple | list = ()) -> int:
    with get_connection() as connection:
        cursor = connection.execute(sql, params)
        connection.commit()
        return cursor.lastrowid


def transaction(handler):
    with get_connection() as connection:
        try:
            result = handler(connection)
            connection.commit()
            return result
        except Exception:
            connection.rollback()
            raise
