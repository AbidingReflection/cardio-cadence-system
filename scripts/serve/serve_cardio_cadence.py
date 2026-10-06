#!/usr/bin/env python3
"""Serve the Cardio Cadence System web applications locally."""

from __future__ import annotations

import argparse
import http.server
import json
import os
import posixpath
import sys
import urllib.parse
from pathlib import Path


SCRIPTS_ROOT = Path(__file__).resolve().parents[1]

if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from js_testing.test_manifest import (
    DEFAULT_TEST_TARGET,
    build_test_manifest,
    get_test_manifest_request,
    load_test_roots,
)
from js_testing.test_metadata_store import TestMetadataStore

from serve.routing import (
    APP_ROUTES,
    get_redirect_target,
    select_root,
)


# DEFAULT_HOST = "127.0.0.1"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8080

TEST_PAGE_RELATIVE_PATH = Path(
    "js-testing",
    "page",
    "tests.html",
)

TEST_MANIFESTS_RELATIVE_PATH = Path(
    "js-testing",
    "manifests",
)


def find_project_root() -> Path:
    """Resolve the repository root based on this script's location."""
    return Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Serve the Cardio Cadence System web applications."
    )

    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Host interface to bind to. Default: {DEFAULT_HOST}",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"TCP port to listen on. Default: {DEFAULT_PORT}",
    )

    return parser.parse_args()


class CardioCadenceRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve Cardio Cadence applications and shared project resources."""

    def __init__(
        self,
        *args,
        project_root: Path,
        test_metadata_store: TestMetadataStore,
        **kwargs,
    ) -> None:
        self.project_root = project_root.resolve()
        self.data_root = (project_root / "data").resolve()
        self.packages_root = (project_root / "packages").resolve()
        self.test_metadata_store = test_metadata_store

        self.test_page_path = (
            self.packages_root
            / TEST_PAGE_RELATIVE_PATH
        ).resolve()

        self.app_roots = {
            route: (
                project_root
                / "apps"
                / app_name
                / "web"
            ).resolve()
            for route, app_name in APP_ROUTES.items()
        }

        self.invalid_root = project_root / ".invalid-route"

        super().__init__(
            *args,
            directory=str(project_root),
            **kwargs,
        )

    def do_GET(self) -> None:
        """Handle redirects and test manifests before serving GET requests."""
        if self._handle_redirect():
            return

        if self._handle_test_manifest_request(head_only=False):
            return

        super().do_GET()

    def do_HEAD(self) -> None:
        """Handle redirects and test manifests before serving HEAD requests."""
        if self._handle_redirect():
            return

        if self._handle_test_manifest_request(head_only=True):
            return

        super().do_HEAD()

    def translate_path(self, path: str) -> str:
        """Translate a request URL into an allowed filesystem path."""
        url_path = urllib.parse.urlsplit(path).path
        url_path = urllib.parse.unquote(url_path)

        root, relative_path = select_root(
            url_path,
            data_root=self.data_root,
            packages_root=self.packages_root,
            app_roots=self.app_roots,
            test_page_path=self.test_page_path,
            invalid_root=self.invalid_root,
        )

        relative_path = posixpath.normpath(relative_path)

        path_parts = [
            part
            for part in relative_path.split("/")
            if part
        ]

        filesystem_path = root

        for part in path_parts:
            if part in (os.curdir, os.pardir):
                continue

            if os.path.dirname(part):
                continue

            filesystem_path = filesystem_path / part

        return str(filesystem_path)

    def _handle_redirect(self) -> bool:
        """Redirect the current request when a canonical target exists."""
        parsed_url = urllib.parse.urlsplit(self.path)

        target = get_redirect_target(
            parsed_url.path,
            parsed_url.query,
        )

        if target is None:
            return False

        self._send_redirect(target)

        return True

    def _handle_test_manifest_request(
        self,
        *,
        head_only: bool,
    ) -> bool:
        """Serve a discovered test-module manifest when requested."""
        parsed_url = urllib.parse.urlsplit(self.path)
        url_path = urllib.parse.unquote(parsed_url.path)

        request = get_test_manifest_request(
            url_path,
            APP_ROUTES,
        )

        if request is None:
            return False

        app_route, target = request
        app_root = self.app_roots[app_route]

        manifest_name = (
            app_route.removeprefix("/")
            if target == DEFAULT_TEST_TARGET
            else target
        )

        manifest_path = (
            self.packages_root
            / TEST_MANIFESTS_RELATIVE_PATH
            / f"{manifest_name}.json"
        )

        if not manifest_path.is_file():
            self.send_error(
                http.HTTPStatus.NOT_FOUND,
                f'Unknown test target "{target}".',
            )

            return True

        try:
            test_roots = load_test_roots(manifest_path)

            manifest = build_test_manifest(
                target=target,
                test_roots=test_roots,
                route_roots={
                    app_route: app_root,
                    "/packages": self.packages_root,
                },
                metadata_store=self.test_metadata_store,
            )

        except (
            json.JSONDecodeError,
            ValueError,
            TypeError,
            FileNotFoundError,
            NotADirectoryError,
        ) as exc:
            self.send_error(
                http.HTTPStatus.INTERNAL_SERVER_ERROR,
                "Could not build test manifest.",
                explain=str(exc),
            )

            return True

        self._send_json_response(
            manifest,
            head_only=head_only,
        )

        return True

    def _send_json_response(
        self,
        value: object,
        *,
        head_only: bool,
    ) -> None:
        """Send a JSON HTTP response."""
        response_body = (
            json.dumps(
                value,
                indent=2,
            )
            + "\n"
        ).encode("utf-8")

        self.send_response(http.HTTPStatus.OK)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )

        self.send_header(
            "Content-Length",
            str(len(response_body)),
        )

        self.send_header(
            "Cache-Control",
            "no-store",
        )

        self.end_headers()

        if not head_only:
            self.wfile.write(response_body)

    def _send_redirect(
        self,
        target: str,
    ) -> None:
        """Send an HTTP redirect response."""
        self.send_response(http.HTTPStatus.FOUND)
        self.send_header("Location", target)
        self.end_headers()


def main() -> int:
    """Start the Cardio Cadence development server."""
    args = parse_args()

    project_root = find_project_root()

    data_root = project_root / "data"
    packages_root = project_root / "packages"

    test_page_path = (
        packages_root
        / TEST_PAGE_RELATIVE_PATH
    )

    for route, app_name in APP_ROUTES.items():
        app_root = (
            project_root
            / "apps"
            / app_name
            / "web"
        )

        if not app_root.is_dir():
            print(
                f"Warning: application web directory not found for {route}:\n"
                f"{app_root}",
                file=sys.stderr,
            )

            continue

        entry_point = app_root / "index.html"

        if not entry_point.is_file():
            print(
                f"Warning: application entry point not found for {route}:\n"
                f"{entry_point}",
                file=sys.stderr,
            )

    if not test_page_path.is_file():
        print(
            f"Error: shared test page not found:\n"
            f"{test_page_path}",
            file=sys.stderr,
        )

        return 1

    if not data_root.is_dir():
        print(
            f"Warning: shared data directory not found:\n"
            f"{data_root}",
            file=sys.stderr,
        )

    if not packages_root.is_dir():
        print(
            f"Warning: shared packages directory not found:\n"
            f"{packages_root}",
            file=sys.stderr,
        )

    test_metadata_store = TestMetadataStore(
        project_root
        / "scripts"
        / "js_testing"
        / "data"
        / "test_metadata.sqlite3"
    )

    def handler_factory(*handler_args, **handler_kwargs):
        return CardioCadenceRequestHandler(
            *handler_args,
            project_root=project_root,
            test_metadata_store=test_metadata_store,
            **handler_kwargs,
        )

    try:
        with http.server.ThreadingHTTPServer(
            (args.host, args.port),
            handler_factory,
        ) as server:
            base_url = f"http://{args.host}:{args.port}"

            print(f"Serving Cardio Cadence System from: {project_root}")
            print(f"Protocol Designer: {base_url}/protocol-designer/")
            print(f"Designer Tests:    {base_url}/protocol-designer/tests")
            print(f"Designer alias:    {base_url}/designer/")
            print(f"Shared data:       {base_url}/data/")
            print(f"Shared packages:   {base_url}/packages/")
            print(f"Open:              {base_url}")
            print("Press Ctrl+C to stop.")

            server.serve_forever()

    except KeyboardInterrupt:
        print("\nCardio Cadence server stopped.")

        return 0

    except OSError as exc:
        print(
            f"Error: could not start server on "
            f"{args.host}:{args.port}: {exc}",
            file=sys.stderr,
        )

        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
