"""Resolve Cardio Cadence application routes and redirects."""

from __future__ import annotations

from collections.abc import Collection, Mapping
from pathlib import Path

APP_ALIASES = {
    "/designer": "/protocol-designer",
    "/controller": "/cadence-controller",
    "/analyzer": "/workout-analyzer",
}


def select_root(
    url_path: str,
    *,
    data_root: Path,
    packages_root: Path,
    app_roots: Mapping[str, Path],
    test_page_path: Path,
    invalid_root: Path,
) -> tuple[Path, str]:
    """Return the filesystem root and relative path for a browser URL."""
    if url_path == "/data":
        return data_root, ""

    if url_path.startswith("/data/"):
        return (
            data_root,
            url_path.removeprefix("/data/"),
        )

    if url_path == "/packages":
        return packages_root, ""

    if url_path.startswith("/packages/"):
        return (
            packages_root,
            url_path.removeprefix("/packages/"),
        )

    for route, app_root in app_roots.items():
        if is_test_page_route(route, url_path):
            return (
                test_page_path.parent,
                test_page_path.name,
            )

        if url_path == route:
            return app_root, ""

        if url_path.startswith(f"{route}/"):
            return (
                app_root,
                url_path.removeprefix(f"{route}/"),
            )

    return invalid_root, url_path.lstrip("/")


def get_redirect_target(
    url_path: str,
    query: str,
    app_routes: Collection[str],
) -> str | None:
    """Return the canonical redirect target for a browser URL."""
    if url_path == "/":
        return with_query(
            "/protocol-designer/",
            query,
        )

    for route in app_routes:
        if url_path == route:
            return with_query(
                f"{route}/",
                query,
            )

        if url_path == f"{route}/tests/":
            return with_query(
                f"{route}/tests",
                query,
            )

        test_prefix = f"{route}/tests/"

        if url_path.startswith(test_prefix) and url_path.endswith("/"):
            target = url_path[len(test_prefix) : -1]

            if target and "/" not in target:
                return with_query(
                    f"{route}/tests/{target}",
                    query,
                )

    for alias, canonical_route in APP_ALIASES.items():
        if url_path == alias:
            return with_query(
                f"{canonical_route}/",
                query,
            )

        if url_path.startswith(f"{alias}/"):
            suffix = url_path.removeprefix(alias)

            return with_query(
                f"{canonical_route}{suffix}",
                query,
            )

    return None


def is_test_page_route(
    app_route: str,
    url_path: str,
) -> bool:
    """Return whether a URL represents a test-page route for an app."""
    test_root = f"{app_route}/tests"

    if url_path == test_root:
        return True

    prefix = f"{test_root}/"

    if not url_path.startswith(prefix):
        return False

    target = url_path.removeprefix(prefix)

    return bool(target) and "/" not in target


def with_query(
    target: str,
    query: str,
) -> str:
    """Append an existing query string to a redirect target."""
    if not query:
        return target

    return f"{target}?{query}"
