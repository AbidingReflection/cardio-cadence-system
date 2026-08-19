#!/usr/bin/env python3
"""Serve the Cardio Cadence System web applications locally."""

from __future__ import annotations

import argparse
import http.server
import os
import posixpath
import sys
import urllib.parse
from pathlib import Path


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8080

APP_ROUTES = {
    "/protocol-designer": "protocol-designer",
    "/cadence-controller": "cadence-controller",
    "/workout-analyzer": "workout-analyzer",
}

APP_ALIASES = {
    "/designer": "/protocol-designer",
    "/controller": "/cadence-controller",
    "/analyzer": "/workout-analyzer",
}

TEST_PAGE_RELATIVE_PATH = Path(
    "js-testing",
    "page",
    "tests.html",
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
        **kwargs,
    ) -> None:
        self.project_root = project_root.resolve()
        self.data_root = (project_root / "data").resolve()
        self.packages_root = (project_root / "packages").resolve()

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
        """Handle redirects before serving GET requests."""
        redirect_target = self._get_redirect_target()

        if redirect_target is not None:
            self._send_redirect(redirect_target)
            return

        super().do_GET()

    def do_HEAD(self) -> None:
        """Handle redirects before serving HEAD requests."""
        redirect_target = self._get_redirect_target()

        if redirect_target is not None:
            self._send_redirect(redirect_target)
            return

        super().do_HEAD()

    def translate_path(self, path: str) -> str:
        """Translate a request URL into an allowed filesystem path."""
        url_path = urllib.parse.urlsplit(path).path
        url_path = urllib.parse.unquote(url_path)

        root, relative_path = self._select_root(url_path)

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

    def _select_root(self, url_path: str) -> tuple[Path, str]:
        """Select the filesystem root corresponding to a request URL."""
        if url_path == "/data":
            return self.data_root, ""

        if url_path.startswith("/data/"):
            return (
                self.data_root,
                url_path.removeprefix("/data/"),
            )

        if url_path == "/packages":
            return self.packages_root, ""

        if url_path.startswith("/packages/"):
            return (
                self.packages_root,
                url_path.removeprefix("/packages/"),
            )

        for route, app_root in self.app_roots.items():
            if url_path == f"{route}/tests":
                return (
                    self.test_page_path.parent,
                    self.test_page_path.name,
                )

            if url_path == route:
                return app_root, ""

            if url_path.startswith(f"{route}/"):
                return (
                    app_root,
                    url_path.removeprefix(f"{route}/"),
                )

        return self.invalid_root, url_path.lstrip("/")

    def _get_redirect_target(self) -> str | None:
        """Return the canonical redirect target for the current request."""
        parsed_url = urllib.parse.urlsplit(self.path)
        url_path = parsed_url.path

        if url_path == "/":
            target = "/protocol-designer/"
            return self._with_query(target, parsed_url.query)

        for route in APP_ROUTES:
            if url_path == route:
                target = f"{route}/"
                return self._with_query(target, parsed_url.query)

            if url_path == f"{route}/tests/":
                target = f"{route}/tests"
                return self._with_query(target, parsed_url.query)

        for alias, canonical_route in APP_ALIASES.items():
            if url_path == alias:
                target = f"{canonical_route}/"
                return self._with_query(target, parsed_url.query)

            if url_path.startswith(f"{alias}/"):
                suffix = url_path.removeprefix(alias)
                target = f"{canonical_route}{suffix}"
                return self._with_query(target, parsed_url.query)

        return None

    def _send_redirect(self, target: str) -> None:
        """Send an HTTP redirect response."""
        self.send_response(http.HTTPStatus.FOUND)
        self.send_header("Location", target)
        self.end_headers()

    def _with_query(self, target: str, query: str) -> str:
        """Append the original query string to a redirect target."""
        if not query:
            return target

        return f"{target}?{query}"


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
            f"Warning: shared data directory not found:\n{data_root}",
            file=sys.stderr,
        )

    if not packages_root.is_dir():
        print(
            f"Warning: shared packages directory not found:\n{packages_root}",
            file=sys.stderr,
        )

    def handler_factory(*handler_args, **handler_kwargs):
        return CardioCadenceRequestHandler(
            *handler_args,
            project_root=project_root,
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
