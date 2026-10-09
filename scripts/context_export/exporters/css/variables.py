from __future__ import annotations

import re

from .structure import (
    CssItem,
    find_deepest_item_at_line,
    find_prelude_start,
    line_number,
    normalize_prelude,
    skip_comment,
    skip_string,
)


def is_variable_context_declaration(text: str) -> bool:
    """Return whether a CSS declaration defines or uses a custom property."""
    stripped = text.strip()

    return bool(
        re.match(r"^--[\w-]+\s*:", stripped) or re.search(r"var\(\s*--[\w-]+", stripped)
    )


def attach_variable_context_declaration(
    source: str,
    items: list[CssItem],
    start: int,
    end: int,
) -> None:
    """Attach one relevant CSS declaration to its structural item."""
    declaration_start = find_prelude_start(
        source,
        start,
        end,
    )

    declaration = source[declaration_start:end].strip()

    if not declaration or not is_variable_context_declaration(declaration):
        return

    start_line = line_number(source, declaration_start)
    end_line = line_number(
        source,
        max(declaration_start, end - 1),
    )

    item = find_deepest_item_at_line(items, start_line)

    if item is not None:
        item.context_declarations.append(
            (
                start_line,
                end_line,
                normalize_prelude(declaration),
            )
        )


def attach_variable_context_declarations(
    source: str,
    items: list[CssItem],
) -> None:
    """Attach CSS declarations that define or use custom properties."""
    statement_start = 0
    index = 0

    while index < len(source):
        if source.startswith("/*", index):
            index = skip_comment(source, index)
            continue

        char = source[index]

        if char in {'"', "'"}:
            index = skip_string(source, index)
            continue

        if char == "{":
            statement_start = index + 1
            index += 1
            continue

        if char == ";":
            attach_variable_context_declaration(
                source,
                items,
                statement_start,
                index + 1,
            )

            statement_start = index + 1
            index += 1
            continue

        if char == "}":
            attach_variable_context_declaration(
                source,
                items,
                statement_start,
                index,
            )

            statement_start = index + 1
            index += 1
            continue

        index += 1
