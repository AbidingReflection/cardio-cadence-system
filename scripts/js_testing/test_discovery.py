"""Discover browser JavaScript test modules from configured test roots."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

TEST_FILE_SUFFIX = ".test.js"


@dataclass(frozen=True)
class DiscoveredTestModule:
    """One discovered browser test module and its filesystem path."""

    url: str
    path: Path


def discover_test_modules(
    test_roots: Sequence[str],
    route_roots: Mapping[str, Path],
) -> list[str]:
    """Return browser module URLs discovered beneath configured test roots.

    Test roots are processed in the order provided. Files within each root are
    sorted alphabetically by relative path. Duplicate module URLs are omitted
    while preserving their first occurrence.
    """
    return [
        module.url
        for module in discover_test_module_records(
            test_roots,
            route_roots,
        )
    ]


def discover_test_module_records(
    test_roots: Sequence[str],
    route_roots: Mapping[str, Path],
) -> list[DiscoveredTestModule]:
    """Return discovered test-module URLs with their filesystem paths.

    Test roots are processed in the order provided. Files within each root are
    sorted alphabetically by relative path. Duplicate module URLs are omitted
    while preserving their first occurrence.
    """
    modules: list[DiscoveredTestModule] = []
    seen_modules: set[str] = set()

    for test_root in test_roots:
        filesystem_root = _resolve_test_root(
            test_root,
            route_roots,
        )

        discovered_modules = _discover_modules_in_root(
            test_root,
            filesystem_root,
        )

        for module in discovered_modules:
            if module.url in seen_modules:
                continue

            seen_modules.add(module.url)
            modules.append(module)

    return modules


def _resolve_test_root(
    test_root: str,
    route_roots: Mapping[str, Path],
) -> Path:
    """Resolve a browser-facing test root to its filesystem directory."""
    if not test_root.startswith("/"):
        raise ValueError(
            f'Test root must be an absolute browser path: "{test_root}".'
        )

    matching_route = _find_matching_route(
        test_root,
        route_roots,
    )

    if matching_route is None:
        raise ValueError(
            f'No filesystem route is configured for test root "{test_root}".'
        )

    route_root = route_roots[matching_route].resolve()

    relative_path = test_root.removeprefix(matching_route).lstrip("/")
    filesystem_root = (route_root / relative_path).resolve()

    if not _is_within(filesystem_root, route_root):
        raise ValueError(
            f'Test root resolves outside its allowed route: "{test_root}".'
        )

    if not filesystem_root.exists():
        raise FileNotFoundError(
            f'Test root does not exist: "{test_root}" '
            f"({filesystem_root})."
        )

    if not filesystem_root.is_dir():
        raise NotADirectoryError(
            f'Test root is not a directory: "{test_root}" '
            f"({filesystem_root})."
        )

    return filesystem_root


def _find_matching_route(
    test_root: str,
    route_roots: Mapping[str, Path],
) -> str | None:
    """Return the most specific configured route matching a browser path."""
    matches = [
        route
        for route in route_roots
        if (
            test_root == route
            or test_root.startswith(f"{route}/")
        )
    ]

    if not matches:
        return None

    return max(matches, key=len)


def _discover_modules_in_root(
    test_root: str,
    filesystem_root: Path,
) -> list[DiscoveredTestModule]:
    """Return sorted test-module records beneath one filesystem root."""
    relative_files = sorted(
        (
            path.relative_to(filesystem_root)
            for path in filesystem_root.rglob(f"*{TEST_FILE_SUFFIX}")
            if path.is_file()
        ),
        key=lambda path: path.as_posix(),
    )

    browser_root = test_root.rstrip("/")

    return [
        DiscoveredTestModule(
            url=f"{browser_root}/{relative_path.as_posix()}",
            path=(filesystem_root / relative_path).resolve(),
        )
        for relative_path in relative_files
    ]


def _is_within(
    path: Path,
    root: Path,
) -> bool:
    """Return whether a resolved path is contained by a resolved root."""
    try:
        path.relative_to(root)
    except ValueError:
        return False

    return True
