#!/usr/bin/env python3
"""Serve the protocol designer web application locally."""

from __future__ import annotations

import argparse
import functools
import http.server
import sys
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


def main() -> int:
    args = parse_args()

    project_root = find_project_root()
    web_root = project_root / "apps" / "protocol-designer" / "web"
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

    handler_class = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(web_root),
    )

    try:
        with http.server.ThreadingHTTPServer(
            (args.host, args.port),
            handler_class,
        ) as server:
            print(f"Serving protocol designer from: {web_root}")
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
