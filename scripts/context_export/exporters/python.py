"""Export compact structural context from Python source files."""

from __future__ import annotations

import ast
from pathlib import Path


def parse_file(path: Path) -> tuple[str, ast.Module]:
    """Parse one Python file and return its source text and syntax tree."""
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))

    return source, tree


def line_range(node: ast.AST) -> str:
    """Return the one-based source line range occupied by an AST node."""
    start = getattr(node, "lineno", None)
    end = getattr(node, "end_lineno", start)

    if start is None:
        raise ValueError("AST node has no source line information.")

    if end == start:
        return f"[L{start}]"

    return f"[L{start}-L{end}]"


def normalize_docstring(docstring: str) -> str:
    """Collapse a Python docstring into one concise output line."""
    text = " ".join(
        line.strip()
        for line in docstring.splitlines()
        if line.strip()
    )

    return f'""" {text} """'


def node_docstring_node(node: ast.AST) -> ast.Expr | None:
    """Return the AST expression containing a node's docstring."""
    if not isinstance(
        node,
        (
            ast.Module,
            ast.ClassDef,
            ast.FunctionDef,
            ast.AsyncFunctionDef,
        ),
    ):
        return None

    if not node.body:
        return None

    first = node.body[0]

    if not isinstance(first, ast.Expr):
        return None

    if not isinstance(first.value, ast.Constant):
        return None

    if not isinstance(first.value.value, str):
        return None

    return first


def decorator_lines(node: ast.AST) -> list[str]:
    """Return compact decorator lines for a class or function."""
    decorators = getattr(node, "decorator_list", [])

    return [
        f"@{ast.unparse(decorator)}"
        for decorator in decorators
    ]


def function_signature(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
) -> str:
    """Return a compact Python function signature without its body."""
    prefix = "async def" if isinstance(node, ast.AsyncFunctionDef) else "def"
    arguments = ast.unparse(node.args)

    signature = f"{prefix} {node.name}({arguments})"

    if node.returns is not None:
        signature += f" -> {ast.unparse(node.returns)}"

    return signature


def class_signature(node: ast.ClassDef) -> str:
    """Return a compact Python class declaration without its body."""
    arguments = [
        ast.unparse(base)
        for base in node.bases
    ]

    arguments.extend(
        f"{keyword.arg}={ast.unparse(keyword.value)}"
        for keyword in node.keywords
        if keyword.arg is not None
    )

    if not arguments:
        return f"class {node.name}"

    return f"class {node.name}({', '.join(arguments)})"


def format_docstring(node: ast.AST, indent: str = "") -> str | None:
    """Format a node docstring with its source line range."""
    docstring_node = node_docstring_node(node)

    if docstring_node is None:
        return None

    return (
        f"{indent}{line_range(docstring_node)} "
        f"{normalize_docstring(docstring_node.value.value)}"
    )

def format_function(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    indent: str = "",
) -> list[str]:
    """Format one Python function for structural export."""
    lines = []

    for decorator in decorator_lines(node):
        lines.append(f"{indent}{decorator}")

    docstring = format_docstring(node, indent)

    if docstring is not None:
        lines.append(docstring)

    lines.append(
        f"{indent}{line_range(node)} {function_signature(node)}"
    )

    return lines


def class_methods(node: ast.ClassDef) -> list[ast.FunctionDef | ast.AsyncFunctionDef]:
    """Return methods declared directly inside a Python class."""
    return [
        child
        for child in node.body
        if isinstance(
            child,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef,
            ),
        )
    ]


def format_class(node: ast.ClassDef) -> list[str]:
    """Format one Python class and its directly declared methods."""
    lines = []

    for decorator in decorator_lines(node):
        lines.append(decorator)

    lines.extend(
        [
            f"{line_range(node)} {class_signature(node)}",
            "-" * len(class_signature(node)),
            "",
        ]
    )

    docstring = format_docstring(node)

    if docstring is not None:
        lines.extend(
            [
                docstring,
                "",
            ]
        )

    methods = class_methods(node)

    for method in methods:
        lines.extend(format_function(method))
        lines.append("")

    return lines


def extract_imports(tree: ast.Module) -> list[str]:
    """Return top-level Python imports in source order."""
    return [
        ast.unparse(node)
        for node in tree.body
        if isinstance(
            node,
            (
                ast.Import,
                ast.ImportFrom,
            ),
        )
    ]


def extract_functions(
    tree: ast.Module,
) -> list[ast.FunctionDef | ast.AsyncFunctionDef]:
    """Return top-level Python functions in source order."""
    return [
        node
        for node in tree.body
        if isinstance(
            node,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef,
            ),
        )
    ]


def extract_classes(tree: ast.Module) -> list[ast.ClassDef]:
    """Return top-level Python classes in source order."""
    return [
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef)
    ]


def export_source(
    path: Path,
    display_path: Path,
) -> str:
    """Return structural context text for one Python file."""
    _, tree = parse_file(path)

    lines = [
        f"FILE: {display_path.as_posix()}",
        "",
    ]

    imports = extract_imports(tree)

    if imports:
        lines.extend(
            [
                "IMPORTS",
                "-------",
            ]
        )
        lines.extend(imports)
        lines.append("")

    functions = extract_functions(tree)

    if functions:
        lines.extend(
            [
                "FUNCTIONS",
                "---------",
                "",
            ]
        )

        for function in functions:
            lines.extend(format_function(function))
            lines.append("")

    classes = extract_classes(tree)

    for class_node in classes:
        lines.extend(format_class(class_node))

    return "\n".join(lines).rstrip()


def inspect_source(
    path: Path,
    display_path: Path,
) -> None:
    """Print the Python AST for debugging structural extraction."""
    _, tree = parse_file(path)

    print(f"FILE: {display_path.as_posix()}")
    print()
    print(
        ast.dump(
            tree,
            indent=4,
            include_attributes=True,
        )
    )
