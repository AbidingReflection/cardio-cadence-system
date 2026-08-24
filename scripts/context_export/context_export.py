#!/usr/bin/env python3

"""Export compact structural context from supported source files."""

from __future__ import annotations

import argparse
from datetime import datetime
import os
from pathlib import Path

from exporters import css
from exporters import javascript
from exporters import python


TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = TOOL_DIR / "output"

IGNORED_DIRECTORIES = {
    ".git",
    ".venv",
    "node_modules",
    "__pycache__",
}

EXPORTERS = {
    ".js": javascript,
    ".css": css,
    ".py": python,
}

def is_ignored_path(path: Path) -> bool:
    """Return whether a source path is inside an ignored directory."""
    return any(part in IGNORED_DIRECTORIES for part in path.parts)


def exporter_for(path: Path):
    """Return the exporter module registered for a source file."""
    try:
        return EXPORTERS[path.suffix]
    except KeyError as exc:
        raise ValueError(
            f"Unsupported file type: {path}"
        ) from exc

def discover_source_files(path: Path) -> list[Path]:
    """Return supported source files while pruning ignored directories."""
    if path.is_file():
        if is_ignored_path(path):
            raise ValueError(f"Path is inside an ignored directory: {path}")

        exporter_for(path)
        return [path]

    if not path.is_dir():
        raise FileNotFoundError(f"Path does not exist: {path}")

    files = []

    for root, directories, filenames in os.walk(path):
        directories[:] = [
            directory
            for directory in directories
            if directory not in IGNORED_DIRECTORIES
        ]

        root_path = Path(root)

        for filename in filenames:
            candidate = root_path / filename

            if candidate.suffix in EXPORTERS:
                files.append(candidate)

    return sorted(files)


def project_relative_path(path: Path, project_root: Path) -> Path:
    """Return a path relative to the project root when possible."""
    try:
        return path.resolve().relative_to(project_root.resolve())
    except ValueError:
        return path.resolve()


def output_name_for_targets(
    paths: list[Path],
    source_files: list[Path],
) -> str:
    """Return a timestamped output filename for the requested export targets."""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")

    if len(paths) > 1:
        return (
            f"{timestamp}_multi-{len(source_files)}-files_context.txt"
        )

    path = paths[0]

    if path.is_file():
        target_name = path.stem
    else:
        target_name = "-".join(path.parts[-3:])

    safe_name = target_name.replace("_", "-").replace(" ", "-")

    return f"{timestamp}_{safe_name}_context.txt"


def write_export(
    output_dir: Path,
    filename: str,
    content: str,
) -> Path:
    """Write export content to the output directory and return its path."""
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename
    output_path.write_text(content, encoding="utf-8")

    return output_path


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Export compact structural context from source files."
    )
    parser.add_argument(
        "paths",
        nargs="+",
        type=Path,
        help="One or more supported source files or directories to export.",
    )
    parser.add_argument(
        "--inspect",
        action="store_true",
        help="Print structural parser information for debugging.",
    )

    return parser.parse_args()


def main() -> int:
    """Run the source context exporter."""
    args = parse_args()
    project_root = Path.cwd()

    source_files = []

    try:
        for path in args.paths:
            source_files.extend(discover_source_files(path))
    except (FileNotFoundError, ValueError) as exc:
        print(f"Error: {exc}")
        return 1

    source_files = sorted(set(source_files))

    if not source_files:
        print("No supported source files found.")
        return 1

    if args.inspect:
        for path in source_files:
            exporter = exporter_for(path)
            display_path = project_relative_path(
                path,
                project_root,
            )

            exporter.inspect_source(
                path,
                display_path,
            )

        return 0

    exports = []

    for path in source_files:
        exporter = exporter_for(path)
        display_path = project_relative_path(
            path,
            project_root,
        )

        exports.append(
            exporter.export_source(
                path,
                display_path,
            )
        )

    content = "\n\n".join(exports)

    filename = output_name_for_targets(
        args.paths,
        source_files,
    )

    output_path = write_export(
        DEFAULT_OUTPUT_DIR,
        filename,
        content,
    )

    print(f"Context export written to: {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
