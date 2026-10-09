from __future__ import annotations

from pathlib import Path

from .structure import CssItem, scan_structure
from .variables import attach_variable_context_declarations


def format_item(
    item: CssItem,
    depth: int = 0,
) -> list[str]:
    """Format one CSS structural item and its nested children."""
    indent = "    " * depth
    line_range = f"[L{item.start_line}-L{item.end_line}]"

    lines = [f"{indent}{line_range} {item.text}"]

    for start_line, end_line, text in item.context_declarations:
        line_range = (
            f"[L{start_line}]"
            if start_line == end_line
            else f"[L{start_line}-L{end_line}]"
        )

        lines.append(f"{indent}    {line_range} {text}")

    for child in item.children:
        lines.extend(
            format_item(
                child,
                depth=depth + 1,
            )
        )

    return lines


def export_source(
    path: Path,
    display_path: Path,
) -> str:
    """Return structural context text for one CSS file."""
    source = path.read_text(encoding="utf-8")
    items = scan_structure(source)
    attach_variable_context_declarations(source, items)

    lines = [
        f"FILE: {display_path.as_posix()}",
        "",
        "STRUCTURE",
        "---------",
        "",
    ]

    for index, item in enumerate(items):
        lines.extend(format_item(item))

        if item.kind == "section" or (
            index + 1 < len(items) and items[index + 1].kind == "section"
        ):
            lines.append("")

    return "\n".join(lines).rstrip()


def inspect_source(
    path: Path,
    display_path: Path,
) -> None:
    """Print the structural CSS items recognized by the scanner."""
    source = path.read_text(encoding="utf-8")
    items = scan_structure(source)

    print(f"FILE: {display_path.as_posix()}")
    print(f"CHARACTERS: {len(source)}")
    print()

    for item in items:
        for line in format_item(item):
            print(line)
