"""Persist metadata for discovered JavaScript test files."""

from __future__ import annotations

import hashlib
import sqlite3
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class TestFileMetadata:
    """Persisted metadata for one JavaScript test file."""

    path: Path
    content_hash: str
    changed_at: datetime


class TestMetadataStore:
    """Tracks test-file content changes in SQLite."""

    def __init__(
        self,
        database_path: Path,
        *,
        now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ) -> None:
        self._database_path = database_path
        self._now = now

        self._initialize_database()

    def observe(self, path: Path) -> TestFileMetadata:
        """Record the current file contents and return persisted metadata."""
        resolved_path = path.resolve()
        content_hash = _hash_file(resolved_path)

        with sqlite3.connect(self._database_path) as connection:
            row = connection.execute(
                """
                SELECT content_hash, changed_at
                FROM test_files
                WHERE path = ?
                """,
                (str(resolved_path),),
            ).fetchone()

            if row is None:
                changed_at = self._now()

                connection.execute(
                    """
                    INSERT INTO test_files (
                        path,
                        content_hash,
                        changed_at
                    )
                    VALUES (?, ?, ?)
                    """,
                    (
                        str(resolved_path),
                        content_hash,
                        changed_at.isoformat(),
                    ),
                )

                return TestFileMetadata(
                    path=resolved_path,
                    content_hash=content_hash,
                    changed_at=changed_at,
                )

            stored_hash, stored_changed_at = row

            if stored_hash == content_hash:
                return TestFileMetadata(
                    path=resolved_path,
                    content_hash=stored_hash,
                    changed_at=datetime.fromisoformat(stored_changed_at),
                )

            changed_at = self._now()

            connection.execute(
                """
                UPDATE test_files
                SET content_hash = ?,
                    changed_at = ?
                WHERE path = ?
                """,
                (
                    content_hash,
                    changed_at.isoformat(),
                    str(resolved_path),
                ),
            )

            return TestFileMetadata(
                path=resolved_path,
                content_hash=content_hash,
                changed_at=changed_at,
            )

    def _initialize_database(self) -> None:
        """Create the metadata schema when it does not already exist."""
        self._database_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with sqlite3.connect(self._database_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS test_files (
                    path TEXT PRIMARY KEY,
                    content_hash TEXT NOT NULL,
                    changed_at TEXT NOT NULL
                )
                """
            )


def _hash_file(path: Path) -> str:
    """Return the SHA-256 hash of one file's current contents."""
    hasher = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(64 * 1024), b""):
            hasher.update(chunk)

    return hasher.hexdigest()
