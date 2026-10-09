"""Tests for JavaScript test-file metadata persistence."""

from __future__ import annotations

from datetime import datetime, timezone

from scripts.js_testing import test_metadata_store


def test_records_new_test_file_metadata(tmp_path) -> None:
    test_file = tmp_path / "example.test.js"
    test_file.write_text(
        'test("example", "works", () => {});\n',
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

    store = test_metadata_store.TestMetadataStore(
        tmp_path / "test-metadata.sqlite3",
        now=lambda: changed_at,
    )

    metadata = store.observe(test_file)

    assert metadata.path == test_file.resolve()
    assert metadata.changed_at == changed_at
    assert metadata.content_hash


def test_preserves_changed_at_when_content_is_unchanged(tmp_path) -> None:
    test_file = tmp_path / "example.test.js"
    test_file.write_text(
        'test("example", "works", () => {});\n',
        encoding="utf-8",
    )

    initial_changed_at = datetime(
        2026,
        10,
        6,
        8,
        0,
        tzinfo=timezone.utc,
    )
    later_changed_at = datetime(
        2026,
        10,
        6,
        9,
        0,
        tzinfo=timezone.utc,
    )

    current_time = initial_changed_at

    store = test_metadata_store.TestMetadataStore(
        tmp_path / "test-metadata.sqlite3",
        now=lambda: current_time,
    )

    initial_metadata = store.observe(test_file)

    current_time = later_changed_at
    repeated_metadata = store.observe(test_file)

    assert repeated_metadata.content_hash == initial_metadata.content_hash
    assert repeated_metadata.changed_at == initial_changed_at


def test_updates_changed_at_when_content_changes(tmp_path) -> None:
    test_file = tmp_path / "example.test.js"
    test_file.write_text(
        'test("example", "works", () => {});\n',
        encoding="utf-8",
    )

    initial_changed_at = datetime(
        2026,
        10,
        6,
        8,
        0,
        tzinfo=timezone.utc,
    )
    updated_changed_at = datetime(
        2026,
        10,
        6,
        9,
        0,
        tzinfo=timezone.utc,
    )

    current_time = initial_changed_at

    store = test_metadata_store.TestMetadataStore(
        tmp_path / "test-metadata.sqlite3",
        now=lambda: current_time,
    )

    initial_metadata = store.observe(test_file)

    test_file.write_text(
        'test("example", "changed", () => {});\n',
        encoding="utf-8",
    )
    current_time = updated_changed_at

    updated_metadata = store.observe(test_file)

    assert updated_metadata.content_hash != initial_metadata.content_hash
    assert updated_metadata.changed_at == updated_changed_at


def test_persists_metadata_across_store_instances(tmp_path) -> None:
    test_file = tmp_path / "example.test.js"
    test_file.write_text(
        'test("example", "works", () => {});\n',
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
    database_path = tmp_path / "test-metadata.sqlite3"

    first_store = test_metadata_store.TestMetadataStore(
        database_path,
        now=lambda: changed_at,
    )
    initial_metadata = first_store.observe(test_file)

    second_store = test_metadata_store.TestMetadataStore(
        database_path,
        now=lambda: datetime(
            2026,
            10,
            6,
            9,
            0,
            tzinfo=timezone.utc,
        ),
    )
    persisted_metadata = second_store.observe(test_file)

    assert persisted_metadata == initial_metadata
