"""Build and resolve browser JavaScript test manifests."""

from __future__ import annotations

import json
from collections.abc import Collection, Mapping, Sequence
from pathlib import Path

from js_testing.test_discovery import (
    discover_test_module_records,
    discover_test_modules,
)
from js_testing.test_metadata_store import TestMetadataStore


DEFAULT_TEST_TARGET = "all"
TEST_MANIFEST_FILENAME = "manifest.json"


def get_test_manifest_request(
    url_path: str,
    app_routes: Collection[str],
) -> tuple[str, str] | None:
    """Return the application route and target for a manifest request."""
    for route in app_routes:
        default_manifest_path = (
            f"{route}/tests/{TEST_MANIFEST_FILENAME}"
        )

        if url_path == default_manifest_path:
            return route, DEFAULT_TEST_TARGET

        prefix = f"{route}/tests/"
        suffix = f"/{TEST_MANIFEST_FILENAME}"

        if not (
            url_path.startswith(prefix)
            and url_path.endswith(suffix)
        ):
            continue

        target = url_path[
            len(prefix):
            -len(suffix)
        ]

        if not target or "/" in target:
            continue

        return route, target

    return None


def get_test_page_target(
    route: str,
    url_path: str,
) -> str | None:
    """Return the test target represented by a test-page URL."""
    test_root = f"{route}/tests"

    if url_path == test_root:
        return DEFAULT_TEST_TARGET

    prefix = f"{test_root}/"

    if not url_path.startswith(prefix):
        return None

    target = url_path.removeprefix(prefix)

    if not target or "/" in target:
        return None

    return target


def load_test_roots(
    manifest_path: Path,
) -> list[str]:
    """Load configured browser test roots from a target manifest."""
    with manifest_path.open(
        "r",
        encoding="utf-8",
    ) as manifest_file:
        manifest = json.load(manifest_file)

    if not isinstance(manifest, dict):
        raise TypeError(
            f"Test manifest must contain a JSON object: "
            f"{manifest_path}"
        )

    test_roots = manifest.get("roots")

    if not isinstance(test_roots, list):
        raise TypeError(
            f'Test manifest "roots" must be an array: '
            f"{manifest_path}"
        )

    if not test_roots:
        raise ValueError(
            f"Test manifest must contain at least one test root: "
            f"{manifest_path}"
        )

    for test_root in test_roots:
        if not isinstance(test_root, str) or not test_root:
            raise TypeError(
                f"Every test manifest root must be a non-empty string: "
                f"{manifest_path}"
            )

    return test_roots


def build_test_manifest(
    *,
    target: str,
    test_roots: Sequence[str],
    route_roots: Mapping[str, Path],
    metadata_store: TestMetadataStore | None = None,
) -> dict[str, object]:
    """Build a browser test manifest from configured test roots."""
    if metadata_store is None:
        modules = discover_test_modules(
            test_roots,
            route_roots,
        )

        return {
            "target": target,
            "roots": list(test_roots),
            "modules": modules,
        }

    module_records = discover_test_module_records(
        test_roots,
        route_roots,
    )

    modules = [module.url for module in module_records]

    module_metadata = {
        module.url: {
            "changedAt": metadata_store.observe(module.path).changed_at.isoformat(),
        }
        for module in module_records
    }

    return {
        "target": target,
        "roots": list(test_roots),
        "modules": modules,
        "moduleMetadata": module_metadata,
    }
