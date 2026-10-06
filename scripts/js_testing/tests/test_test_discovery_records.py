"""Tests for rich JavaScript test-module discovery records."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.js_testing.test_discovery import discover_test_module_records


class DiscoverTestModuleRecordsTests(unittest.TestCase):
    """Tests for discover_test_module_records()."""

    def test_returns_browser_url_and_filesystem_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"
            tests_root.mkdir()

            test_file = tests_root / "alpha.test.js"
            test_file.touch()

            modules = discover_test_module_records(
                ["/tests"],
                {
                    "/tests": tests_root,
                },
            )

            self.assertEqual(len(modules), 1)
            self.assertEqual(modules[0].url, "/tests/alpha.test.js")
            self.assertEqual(modules[0].path, test_file.resolve())

    def test_deduplicates_records_from_overlapping_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            packages_root = root / "packages"
            graph_root = packages_root / "graph"

            graph_root.mkdir(parents=True)

            test_file = graph_root / "graph.test.js"
            test_file.touch()

            modules = discover_test_module_records(
                [
                    "/packages",
                    "/packages/graph",
                ],
                {
                    "/packages": packages_root,
                },
            )

            self.assertEqual(len(modules), 1)
            self.assertEqual(modules[0].url, "/packages/graph/graph.test.js")
            self.assertEqual(modules[0].path, test_file.resolve())


if __name__ == "__main__":
    unittest.main()
