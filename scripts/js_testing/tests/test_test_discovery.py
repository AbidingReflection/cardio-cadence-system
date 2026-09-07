"""Tests for JavaScript test-module discovery."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.js_testing.test_discovery import discover_test_modules


class DiscoverTestModulesTests(unittest.TestCase):
    """Tests for discover_test_modules()."""

    def test_discovers_test_files_recursively(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"
            nested_root = tests_root / "nested"

            nested_root.mkdir(parents=True)

            (tests_root / "alpha.test.js").touch()
            (nested_root / "beta.test.js").touch()

            modules = discover_test_modules(
                ["/tests"],
                {
                    "/tests": tests_root,
                },
            )

            self.assertEqual(
                modules,
                [
                    "/tests/alpha.test.js",
                    "/tests/nested/beta.test.js",
                ],
            )

    def test_ignores_non_test_javascript_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"
            tests_root.mkdir()

            (tests_root / "alpha.test.js").touch()
            (tests_root / "helper.js").touch()
            (tests_root / "alpha.spec.js").touch()
            (tests_root / "notes.txt").touch()

            modules = discover_test_modules(
                ["/tests"],
                {
                    "/tests": tests_root,
                },
            )

            self.assertEqual(
                modules,
                [
                    "/tests/alpha.test.js",
                ],
            )

    def test_sorts_files_by_relative_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"

            (tests_root / "zeta").mkdir(parents=True)
            (tests_root / "alpha").mkdir()

            (tests_root / "zeta" / "second.test.js").touch()
            (tests_root / "alpha" / "third.test.js").touch()
            (tests_root / "first.test.js").touch()

            modules = discover_test_modules(
                ["/tests"],
                {
                    "/tests": tests_root,
                },
            )

            self.assertEqual(
                modules,
                [
                    "/tests/alpha/third.test.js",
                    "/tests/first.test.js",
                    "/tests/zeta/second.test.js",
                ],
            )

    def test_preserves_configured_root_order(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            first_root = root / "first"
            second_root = root / "second"

            first_root.mkdir()
            second_root.mkdir()

            (first_root / "zeta.test.js").touch()
            (second_root / "alpha.test.js").touch()

            modules = discover_test_modules(
                [
                    "/second",
                    "/first",
                ],
                {
                    "/first": first_root,
                    "/second": second_root,
                },
            )

            self.assertEqual(
                modules,
                [
                    "/second/alpha.test.js",
                    "/first/zeta.test.js",
                ],
            )

    def test_deduplicates_modules_from_overlapping_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            packages_root = root / "packages"
            graph_root = packages_root / "graph"

            graph_root.mkdir(parents=True)

            (graph_root / "graph.test.js").touch()

            modules = discover_test_modules(
                [
                    "/packages",
                    "/packages/graph",
                ],
                {
                    "/packages": packages_root,
                },
            )

            self.assertEqual(
                modules,
                [
                    "/packages/graph/graph.test.js",
                ],
            )

    def test_uses_most_specific_matching_route(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            project_root = root / "project"
            packages_root = root / "packages"

            project_root.mkdir()
            packages_root.mkdir()

            (packages_root / "graph").mkdir()
            (packages_root / "graph" / "graph.test.js").touch()

            modules = discover_test_modules(
                [
                    "/packages/graph",
                ],
                {
                    "/": project_root,
                    "/packages": packages_root,
                },
            )

            self.assertEqual(
                modules,
                [
                    "/packages/graph/graph.test.js",
                ],
            )

    def test_rejects_relative_browser_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            with self.assertRaisesRegex(
                ValueError,
                "absolute browser path",
            ):
                discover_test_modules(
                    ["tests"],
                    {
                        "/tests": root,
                    },
                )

    def test_rejects_unmapped_browser_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            with self.assertRaisesRegex(
                ValueError,
                "No filesystem route is configured",
            ):
                discover_test_modules(
                    ["/unknown/tests"],
                    {
                        "/packages": root,
                    },
                )

    def test_rejects_missing_test_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            with self.assertRaisesRegex(
                FileNotFoundError,
                "Test root does not exist",
            ):
                discover_test_modules(
                    ["/tests/missing"],
                    {
                        "/tests": root,
                    },
                )

    def test_rejects_test_root_that_is_not_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            file_path = root / "not-a-directory"
            file_path.touch()

            with self.assertRaisesRegex(
                NotADirectoryError,
                "Test root is not a directory",
            ):
                discover_test_modules(
                    ["/tests/not-a-directory"],
                    {
                        "/tests": root,
                    },
                )

    def test_allows_empty_test_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            tests_root = root / "tests"
            tests_root.mkdir()

            modules = discover_test_modules(
                ["/tests"],
                {
                    "/tests": tests_root,
                },
            )

            self.assertEqual(modules, [])


if __name__ == "__main__":
    unittest.main()
