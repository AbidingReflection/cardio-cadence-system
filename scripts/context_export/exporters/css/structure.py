"""Export compact structural context from CSS source files."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

CONTAINER_AT_RULES = {
    "@container",
    "@document",
    "@layer",
    "@media",
    "@scope",
    "@supports",
}


@dataclass
class CssItem:
    """Represent one structural item discovered in a CSS source file."""

    kind: str
    text: str
    start_line: int
    end_line: int
    children: list[CssItem] = field(default_factory=list)
    context_declarations: list[tuple[int, int, str]] = field(default_factory=list)


@dataclass
class BlockContext:
    """Track one open CSS block while scanning source text."""

    item: CssItem | None
    parse_children: bool


def line_number(source: str, offset: int) -> int:
    """Return the one-based line number for a source character offset."""
    return source.count("\n", 0, offset) + 1


def skip_string(source: str, start: int) -> int:
    """Return the offset immediately after a quoted CSS string."""
    quote = source[start]
    index = start + 1

    while index < len(source):
        if source[index] == "\\":
            index += 2
            continue

        if source[index] == quote:
            return index + 1

        index += 1

    return len(source)


def skip_comment(source: str, start: int) -> int:
    """Return the offset immediately after a CSS block comment."""
    end = source.find("*/", start + 2)

    if end == -1:
        return len(source)

    return end + 2


def normalize_prelude(text: str) -> str:
    """Collapse a selector or at-rule prelude into one compact line."""
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.DOTALL)
    return " ".join(text.split())


def section_comment_text(comment: str) -> str | None:
    """Return a compact section comment when the comment is a divider."""
    lines = comment.splitlines()
    content_lines = []
    has_divider = False

    for line in lines:
        line = line.strip()

        line = line.removeprefix("/*")

        line = line.removesuffix("*/")

        line = line.strip()

        if line.startswith("*"):
            line = line[1:].strip()

        if not line:
            continue

        if len(line) >= 8 and set(line) == {"-"}:
            has_divider = True
            continue

        content_lines.append(line)

    if not has_divider or not content_lines:
        return None

    return f"/* {' '.join(content_lines)} */"


def at_rule_name(prelude: str) -> str:
    """Return the leading at-rule name from a normalized prelude."""
    return prelude.split(maxsplit=1)[0]


def append_item(
    roots: list[CssItem],
    stack: list[BlockContext],
    item: CssItem,
) -> None:
    """Append a CSS item to its nearest parsed structural parent."""
    for context in reversed(stack):
        if context.item is not None and context.parse_children:
            context.item.children.append(item)
            return

    roots.append(item)


def current_context_parses_children(
    stack: list[BlockContext],
) -> bool:
    """Return whether structural items should be parsed at this depth."""
    if not stack:
        return True

    return stack[-1].parse_children


def find_prelude_start(
    source: str,
    start: int,
    end: int,
) -> int:
    """Return the first meaningful character in a CSS block prelude."""
    index = start

    while index < end:
        if source[index].isspace():
            index += 1
            continue

        if source.startswith("/*", index):
            index = skip_comment(source, index)
            continue

        return index

    return end


def scan_structure(source: str) -> list[CssItem]:
    """Scan CSS source and return its structural rules and section comments."""
    items: list[CssItem] = []
    stack: list[BlockContext] = []

    statement_start = 0
    index = 0

    while index < len(source):
        if source.startswith("/*", index):
            comment_end = skip_comment(source, index)

            if current_context_parses_children(stack):
                comment = source[index:comment_end]
                section_text = section_comment_text(comment)

                if section_text is not None:
                    section = CssItem(
                        kind="section",
                        text=section_text,
                        start_line=line_number(source, index),
                        end_line=line_number(
                            source,
                            max(index, comment_end - 1),
                        ),
                    )
                    append_item(items, stack, section)

            index = comment_end
            continue

        char = source[index]

        if char in {'"', "'"}:
            index = skip_string(source, index)
            continue

        if char == ";":
            if current_context_parses_children(stack):
                statement_start = index + 1

            index += 1
            continue

        if char == "{":
            parse_here = current_context_parses_children(stack)
            item = None
            parse_children = False

            if parse_here:
                prelude_start = find_prelude_start(
                    source,
                    statement_start,
                    index,
                )
                prelude = normalize_prelude(source[prelude_start:index])

                if prelude:
                    kind = "at_rule" if prelude.startswith("@") else "ruleset"

                    item = CssItem(
                        kind=kind,
                        text=prelude,
                        start_line=line_number(
                            source,
                            prelude_start,
                        ),
                        end_line=0,
                    )

                    append_item(items, stack, item)

                    if kind == "at_rule":
                        parse_children = at_rule_name(prelude) in CONTAINER_AT_RULES

            stack.append(
                BlockContext(
                    item=item,
                    parse_children=parse_children,
                )
            )

            statement_start = index + 1
            index += 1
            continue

        if char == "}":
            if stack:
                context = stack.pop()

                if context.item is not None:
                    context.item.end_line = line_number(
                        source,
                        index,
                    )

            statement_start = index + 1
            index += 1
            continue

        index += 1

    return items


# def is_variable_context_line(line: str) -> bool:


def find_deepest_item_at_line(
    items: list[CssItem],
    line_number: int,
) -> CssItem | None:
    """Return the deepest structural item containing a source line."""
    for item in items:
        if item.start_line <= line_number <= item.end_line:
            child = find_deepest_item_at_line(
                item.children,
                line_number,
            )

            return child if child is not None else item

    return None
