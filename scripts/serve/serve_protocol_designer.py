#!/usr/bin/env python3
"""Serve the protocol designer web application locally."""

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


def find_project_root() -> Path:
    """
    Resolve the repository root based on this script's location.

    Expected location:
        <project-root>/scripts/serve/serve_protocol_designer.py
    """
    return Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve the protocol designer web application."
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


class ProtocolDesignerRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Serve the Protocol Designer plus explicitly shared project resources.

    URL mappings:
        /                  -> <project-root>/apps/protocol-designer/web/
        /data/...          -> <project-root>/data/...
        /packages/...      -> <project-root>/packages/...
    """

    def __init__(
        self,
        *args,
        web_root: Path,
        data_root: Path,
        packages_root: Path,
        **kwargs,
    ) -> None:
        self.web_root = web_root.resolve()
        self.data_root = data_root.resolve()
        self.packages_root = packages_root.resolve()

        super().__init__(
            *args,
            directory=str(self.web_root),
            **kwargs,
        )

    def translate_path(self, path: str) -> str:
        """
        Translate a request URL into an allowed filesystem path.

        Requests are restricted to one of the explicitly configured roots.
        """
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
            # Prevent traversal outside the selected serving root.
            if part in (os.curdir, os.pardir):
                continue

            if os.path.dirname(part):
                continue

            filesystem_path = filesystem_path / part

        return str(filesystem_path)

    def _select_root(self, url_path: str) -> tuple[Path, str]:
        """
        Select the filesystem root corresponding to the request URL.
        """
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

        return (
            self.web_root,
            url_path.lstrip("/"),
        )


def main() -> int:
    args = parse_args()

    project_root = find_project_root()

    web_root = project_root / "apps" / "protocol-designer" / "web"
    data_root = project_root / "data"
    packages_root = project_root / "packages"

    index_file = web_root / "index.html"

    if not web_root.is_dir():
        print(
            f"Error: protocol designer web directory not found:\n{web_root}",
            file=sys.stderr,
        )
        return 1

    if not index_file.is_file():
        print(
            f"Error: protocol designer entry point not found:\n{index_file}",
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
        return ProtocolDesignerRequestHandler(
            *handler_args,
            web_root=web_root,
            data_root=data_root,
            packages_root=packages_root,
            **handler_kwargs,
        )

    try:
        with http.server.ThreadingHTTPServer(
            (args.host, args.port),
            handler_factory,
        ) as server:
            print(f"Serving protocol designer from: {web_root}")
            print(f"Serving shared data at /data/ from: {data_root}")
            print(f"Serving shared packages at /packages/ from: {packages_root}")
            print(f"Open: http://{args.host}:{args.port}")
            print("Press Ctrl+C to stop.")

            server.serve_forever()

    except KeyboardInterrupt:
        print("\nProtocol designer server stopped.")
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
