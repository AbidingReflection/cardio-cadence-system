"""Handle Cardio Cadence development-server HTTP requests."""

from __future__ import annotations

import http.server
import json
import os
import posixpath
import urllib.parse

from js_testing.test_manifest import (
    DEFAULT_TEST_TARGET,
    build_test_manifest,
    get_test_manifest_request,
    load_test_roots,
)
from js_testing.test_metadata_store import TestMetadataStore
from serve.config import ServerConfig
from serve.routing import get_redirect_target, select_root


class CardioCadenceRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve Cardio Cadence applications and shared project resources."""

    def __init__(
        self,
        *args,
        config: ServerConfig,
        test_metadata_store: TestMetadataStore,
        **kwargs,
    ) -> None:
        self.config = config
        self.test_metadata_store = test_metadata_store

        super().__init__(
            *args,
            directory=str(config.project_root),
            **kwargs,
        )

    def do_GET(self) -> None:
        """Handle special routes before serving GET requests."""
        if self._handle_health_request():
            return

        if self._handle_redirect():
            return

        if self._handle_test_manifest_request(head_only=False):
            return

        super().do_GET()

    def do_HEAD(self) -> None:
        """Handle special routes before serving HEAD requests."""
        if self._handle_health_request():
            return

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
            data_root=self.config.data_root,
            packages_root=self.config.packages_root,
            app_roots=self.config.app_roots,
            test_page_path=self.config.test_page_path,
            invalid_root=self.config.invalid_root,
        )

        relative_path = posixpath.normpath(relative_path)

        path_parts = [part for part in relative_path.split("/") if part]

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
            self.config.app_roots,
        )

        if target is None:
            return False

        self._send_redirect(target)

        return True

    def _handle_health_request(self) -> bool:
        """Serve the development-server health endpoint."""
        parsed_url = urllib.parse.urlsplit(self.path)

        if parsed_url.path != "/health":
            return False

        self.send_response(http.HTTPStatus.NO_CONTENT)
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Content-Length", "0")
        self.end_headers()

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
            self.config.app_roots,
        )

        if request is None:
            return False

        app_route, target = request
        app_root = self.config.app_roots[app_route]

        manifest_name = (
            app_route.removeprefix("/") if target == DEFAULT_TEST_TARGET else target
        )

        manifest_path = self.config.test_manifests_root / f"{manifest_name}.json"

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
                    "/packages": self.config.packages_root,
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
