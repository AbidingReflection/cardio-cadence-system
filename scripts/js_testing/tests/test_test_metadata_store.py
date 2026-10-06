"""Tests for JavaScript test-file metadata persistence."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from scripts.js_testing.test_metadata_store import TestMetadataStore


class TestMetadataStoreTests(unittest.TestCase):
    """Tests for TestMetadataStore."""

    def test_records_new_test_file_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            database_path = root / "test-metadata.sqlite3"
            test_file = root / "alpha.test.js"
            test_file.write_text(
                'test("alpha", "works", () => {});\n',
                encoding="utf-8",
            )

            changed_at = datetime(
                2026,
                10,
                6,
                8,
                0,
                tzinfo=timezone.utc,
            )

            store = TestMetadataStore(
                database_path,
                now=lambda: changed_at,
            )

            metadata = store.observe(test_file)

            self.assertEqual(metadata.path, test_file.resolve())
            self.assertEqual(metadata.changed_at, changed_at)

    def test_preserves_changed_at_when_content_is_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            database_path = root / "test-metadata.sqlite3"
            test_file = root / "alpha.test.js"
            test_file.write_text(
                'test("alpha", "works", () => {});\n',
                encoding="utf-8",
            )

            first_changed_at = datetime(
                2026,
                10,
                6,
                8,
                0,
                tzinfo=timezone.utc,
            )

            second_observed_at = datetime(
                2026,
                10,
                6,
                9,
                30,
                tzinfo=timezone.utc,
            )

            times = iter(
                [
                    first_changed_at,
                    second_observed_at,
                ]
            )

            store = TestMetadataStore(
                database_path,
                now=lambda: next(times),
            )

            first_metadata = store.observe(test_file)
            second_metadata = store.observe(test_file)

            self.assertEqual(first_metadata.changed_at, first_changed_at)
            self.assertEqual(second_metadata.changed_at, first_changed_at)

    def test_updates_changed_at_when_content_changes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            database_path = root / "test-metadata.sqlite3"
            test_file = root / "alpha.test.js"

            test_file.write_text(
                'test("alpha", "first", () => {});\n',
                encoding="utf-8",
            )

            first_changed_at = datetime(
                2026,
                10,
                6,
                8,
                0,
                tzinfo=timezone.utc,
            )

            second_changed_at = datetime(
                2026,
                10,
                6,
                9,
                30,
                tzinfo=timezone.utc,
            )

            times = iter(
                [
                    first_changed_at,
                    second_changed_at,
                ]
            )

            store = TestMetadataStore(
                database_path,
                now=lambda: next(times),
            )

            first_metadata = store.observe(test_file)

            test_file.write_text(
                'test("alpha", "second", () => {});\n',
                encoding="utf-8",
            )

            second_metadata = store.observe(test_file)

            self.assertEqual(first_metadata.changed_at, first_changed_at)
            self.assertEqual(second_metadata.changed_at, second_changed_at)

    def test_persists_metadata_across_store_instances(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            database_path = root / "test-metadata.sqlite3"
            test_file = root / "alpha.test.js"
            test_file.write_text(
                'test("alpha", "works", () => {});\n',
                encoding="utf-8",
            )

            first_changed_at = datetime(
                2026,
                10,
                6,
                8,
                0,
                tzinfo=timezone.utc,
            )

            first_store = TestMetadataStore(
                database_path,
                now=lambda: first_changed_at,
            )

            first_metadata = first_store.observe(test_file)

            later_time = datetime(
                2026,
                10,
                6,
                10,
                0,
                tzinfo=timezone.utc,
            )

            second_store = TestMetadataStore(
                database_path,
                now=lambda: later_time,
            )

            second_metadata = second_store.observe(test_file)

            self.assertEqual(second_metadata.changed_at, first_metadata.changed_at)


if __name__ == "__main__":
    unittest.main()
