#!/usr/bin/env python3
"""Serve the Cardio Cadence System web applications locally."""

from __future__ import annotations

import argparse
import http.server
import os
import sys
from pathlib import Path

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]

if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))


from js_testing.test_metadata_store import TestMetadataStore
from serve.config import (
    DEFAULT_HOST,
    DEFAULT_PORT,
    ServerConfig,
    find_project_root,
)
from serve.handler import CardioCadenceRequestHandler


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    host_default = os.environ.get(
        "CCS_HOST",
        DEFAULT_HOST,
    )

    port_default = int(
        os.environ.get(
            "CCS_PORT",
            DEFAULT_PORT,
        )
    )

    parser = argparse.ArgumentParser(
        description="Serve the Cardio Cadence System web applications."
    )

    parser.add_argument(
        "--host",
        default=host_default,
        help=f"Host interface to bind to. Default: {host_default}",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=port_default,
        help=f"TCP port to listen on. Default: {port_default}",
    )

    return parser.parse_args()


def main() -> int:
    """Start the Cardio Cadence development server."""
    args = parse_args()

    config = ServerConfig.from_project_root(
        find_project_root(),
        host=args.host,
        port=args.port,
    )

    for route, app_root in config.app_roots.items():
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

    if not config.test_page_path.is_file():
        print(
            f"Error: shared test page not found:\n{config.test_page_path}",
            file=sys.stderr,
        )

        return 1

    if not config.data_root.is_dir():
        print(
            f"Warning: shared data directory not found:\n{config.data_root}",
            file=sys.stderr,
        )

    if not config.packages_root.is_dir():
        print(
            f"Warning: shared packages directory not found:\n{config.packages_root}",
            file=sys.stderr,
        )

    test_metadata_store = TestMetadataStore(config.test_metadata_path)

    def handler_factory(*handler_args, **handler_kwargs):
        return CardioCadenceRequestHandler(
            *handler_args,
            config=config,
            test_metadata_store=test_metadata_store,
            **handler_kwargs,
        )

    try:
        with http.server.ThreadingHTTPServer(
            (config.host, config.port),
            handler_factory,
        ) as server:
            base_url = f"http://{config.host}:{config.port}"

            print()
            print("Cardio Cadence System")
            print("=" * 72)
            print(f"Project root: {config.project_root}")
            print()
            print("Applications")
            print(f"  Protocol Designer   {base_url}/protocol-designer/")
            print(f"    Tests             {base_url}/protocol-designer/tests")
            print(f"    Alias             {base_url}/designer/")
            print()
            print(f"  Cadence Controller  {base_url}/cadence-controller/")
            print(f"    Tests             {base_url}/cadence-controller/tests")
            print(f"    Alias             {base_url}/controller/")
            print()
            print(f"  Workout Analyzer    {base_url}/workout-analyzer/")
            print(f"    Tests             {base_url}/workout-analyzer/tests")
            print(f"    Alias             {base_url}/analyzer/")
            print()
            print("Shared Resources")
            print(f"  Data                {base_url}/data/")
            print(f"  Packages            {base_url}/packages/")
            print()
            print(f"Root                  {base_url}")
            print("=" * 72)
            print("Press Ctrl+C to stop.")

            server.serve_forever()

    except KeyboardInterrupt:
        print("\nCardio Cadence server stopped.")

        return 0

    except OSError as exc:
        print(
            f"Error: could not start server on {config.host}:{config.port}: {exc}",
            file=sys.stderr,
        )

        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
