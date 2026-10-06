"""Tests for browser JavaScript test manifest generation."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from scripts.js_testing.test_manifest import build_test_manifest
from scripts.js_testing.test_metadata_store import TestMetadataStore


class BuildTestManifestTests(unittest.TestCase):
    """Tests for build_test_manifest()."""

    def test_builds_manifest_from_discovered_test_modules(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"
            tests_root.mkdir()

            (tests_root / "alpha.test.js").touch()
            (tests_root / "beta.test.js").touch()

            manifest = build_test_manifest(
                target="all",
                test_roots=["/tests"],
                route_roots={
                    "/tests": tests_root,
                },
            )

            self.assertEqual(
                manifest,
                {
                    "target": "all",
                    "roots": ["/tests"],
                    "modules": [
                        "/tests/alpha.test.js",
                        "/tests/beta.test.js",
                    ],
                },
            )

    def test_includes_content_change_metadata_for_discovered_modules(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"
            tests_root.mkdir()

            test_file = tests_root / "alpha.test.js"
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

            metadata_store = TestMetadataStore(
                root / "test-metadata.sqlite3",
                now=lambda: changed_at,
            )

            manifest = build_test_manifest(
                target="all",
                test_roots=["/tests"],
                route_roots={
                    "/tests": tests_root,
                },
                metadata_store=metadata_store,
            )

            self.assertEqual(
                manifest["modules"],
                [
                    "/tests/alpha.test.js",
                ],
            )

            self.assertEqual(
                manifest["moduleMetadata"],
                {
                    "/tests/alpha.test.js": {
                        "changedAt": changed_at.isoformat(),
                    },
                },
            )


if __name__ == "__main__":
    unittest.main()
