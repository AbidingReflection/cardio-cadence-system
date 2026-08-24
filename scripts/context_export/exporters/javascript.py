"""Export compact structural context from JavaScript source files."""

from __future__ import annotations

from pathlib import Path

from tree_sitter import Language, Node, Parser
import tree_sitter_javascript

_parser: Parser | None = None


def get_parser() -> Parser:
    """Return the shared Tree-sitter JavaScript parser."""
    global _parser

    if _parser is None:
        _parser = build_parser()

    return _parser


def build_parser() -> Parser:
    """Create and return a Tree-sitter JavaScript parser."""
    language = Language(tree_sitter_javascript.language())
    return Parser(language)


def parse_file(parser: Parser, path: Path):
    """Parse one JavaScript file and return its source bytes and syntax tree."""
    source = path.read_bytes()
    tree = parser.parse(source)
    return source, tree


def node_text(source: bytes, node: Node) -> str:
    """Return the original source text covered by a syntax node."""
    return source[node.start_byte:node.end_byte].decode("utf-8")


def format_node_label(source: bytes, node: Node) -> str:
    """Return a compact debug label for a syntax node."""
    text = node_text(source, node).strip().replace("\n", " ")

    if len(text) > 80:
        text = f"{text[:77]}..."

    return f"{node.type}: {text}"


def print_node_tree(
    source: bytes,
    node: Node,
    depth: int = 0,
    max_depth: int = 4,
) -> None:
    """Print a bounded syntax-tree view for debugging."""
    indent = "    " * depth
    print(f"{indent}{format_node_label(source, node)}")

    if depth >= max_depth:
        return

    for child in node.named_children:
        print_node_tree(
            source,
            child,
            depth=depth + 1,
            max_depth=max_depth,
        )


def line_number(source: bytes, node: Node) -> int:
    """Return the one-based source line containing a syntax node."""
    return source.count(b"\n", 0, node.start_byte) + 1


def immediate_jsdoc(
    source: bytes,
    siblings: list[Node],
    index: int,
) -> Node | None:
    """Return an immediately preceding JSDoc node for a declaration."""
    if index == 0:
        return None

    previous = siblings[index - 1]

    if previous.type != "comment":
        return None

    if not node_text(source, previous).startswith("/**"):
        return None

    between = source[previous.end_byte:siblings[index].start_byte]

    if between.strip():
        return None

    return previous


def named_child_of_type(node: Node, node_type: str) -> Node | None:
    """Return the first named child matching a Tree-sitter node type."""
    for child in node.named_children:
        if child.type == node_type:
            return child

    return None


def get_test_call(source: bytes, node: Node) -> Node | None:
    """Return a top-level test call expression when the node calls test."""
    if node.type != "expression_statement":
        return None

    call = named_child_of_type(node, "call_expression")

    if call is None:
        return None

    children = list(call.named_children)

    if not children:
        return None

    callee = children[0]

    if callee.type != "identifier":
        return None

    if node_text(source, callee) != "test":
        return None

    return call


def test_signature(source: bytes, call: Node) -> str:
    """Return a compact test call containing only its descriptive arguments."""
    arguments = named_child_of_type(call, "arguments")

    if arguments is None:
        raise ValueError("Test call has no arguments node.")

    argument_nodes = list(arguments.named_children)

    if len(argument_nodes) < 2:
        raise ValueError("Test call must contain at least two arguments.")

    suite_text = node_text(source, argument_nodes[0]).strip()
    test_text = node_text(source, argument_nodes[1]).strip()

    return f"test({suite_text}, {test_text})"


def normalize_jsdoc(comment: str) -> str:
    """Collapse a JSDoc comment into one concise output line."""
    lines = comment.splitlines()
    cleaned_lines = []

    for line in lines:
        line = line.strip()

        if line.startswith("/**"):
            line = line[3:]

        if line.endswith("*/"):
            line = line[:-2]

        line = line.strip()

        if line.startswith("*"):
            line = line[1:].strip()

        if line:
            cleaned_lines.append(line)

    return f"/** {' '.join(cleaned_lines)} */"


def method_signature(source: bytes, node: Node) -> str:
    """Return the original method signature without its body."""
    parameters = node.child_by_field_name("parameters")

    if parameters is None:
        raise ValueError("Method definition has no parameters node.")

    return source[node.start_byte:parameters.end_byte].decode("utf-8").strip()


def class_name(source: bytes, node: Node) -> str:
    """Return the declared class name."""
    name_node = node.child_by_field_name("name")

    if name_node is None:
        raise ValueError("Class declaration has no name.")

    return node_text(source, name_node)


def method_name(source: bytes, node: Node) -> str:
    """Return the declared method name."""
    name_node = node.child_by_field_name("name")

    if name_node is None:
        raise ValueError("Method definition has no name.")

    return node_text(source, name_node)


def is_private_method(source: bytes, node: Node) -> bool:
    """Return whether a method uses JavaScript private-name syntax."""
    return method_name(source, node).startswith("#")


def format_method(
    source: bytes,
    node: Node,
    jsdoc_node: Node | None,
) -> list[str]:
    """Format one class method for structural export."""
    lines = []

    if jsdoc_node is not None:
        lines.append(
            f"[L{line_number(source, jsdoc_node)}] "
            f"{normalize_jsdoc(node_text(source, jsdoc_node))}"
        )

    lines.append(
        f"[L{line_number(source, node)}] "
        f"{method_signature(source, node)}"
    )

    return lines


def function_signature(
    source: bytes,
    node: Node,
    start_byte: int | None = None,
) -> str:
    """Return the original top-level function signature without its body."""
    parameters = next(
        (
            child
            for child in node.named_children
            if child.type == "formal_parameters"
        ),
        None,
    )

    if parameters is None:
        raise ValueError("Function declaration has no formal_parameters node.")

    if start_byte is None:
        start_byte = node.start_byte

    return source[start_byte:parameters.end_byte].decode("utf-8").strip()


def format_function(
    source: bytes,
    node: Node,
    jsdoc_node: Node | None,
    start_byte: int | None = None,
) -> list[str]:
    """Format one top-level function for structural export."""
    lines = []

    if jsdoc_node is not None:
        lines.append(
            f"[L{line_number(source, jsdoc_node)}] "
            f"{normalize_jsdoc(node_text(source, jsdoc_node))}"
        )

    lines.append(
        f"[L{line_number(source, node)}] "
        f"{function_signature(source, node, start_byte)}"
    )

    return lines


def extract_functions(source: bytes, root: Node) -> list[str]:
    """Return formatted top-level function declarations in source order."""
    children = list(root.named_children)
    lines = []

    for index, child in enumerate(children):
        if child.type == "function_declaration":
            jsdoc_node = immediate_jsdoc(source, children, index)

            lines.extend(
                format_function(
                    source,
                    child,
                    jsdoc_node,
                )
            )
            lines.append("")
            continue

        if child.type != "export_statement":
            continue

        function_node = None

        for exported_child in child.named_children:
            if exported_child.type == "function_declaration":
                function_node = exported_child
                break

        if function_node is None:
            continue

        jsdoc_node = immediate_jsdoc(source, children, index)

        lines.extend(
            format_function(
                source,
                function_node,
                jsdoc_node,
                start_byte=child.start_byte,
            )
        )
        lines.append("")

    return lines


def extract_tests(source: bytes, root: Node) -> list[str]:
    """Return compact top-level test declarations in source order."""
    lines = []

    for child in root.named_children:
        call = get_test_call(source, child)

        if call is None:
            continue

        lines.append(
            f"[L{line_number(source, child)}] "
            f"{test_signature(source, call)}"
        )
        lines.append("")

    return lines


def extract_class(
    source: bytes,
    node: Node,
    exported: bool,
) -> list[str]:
    """Format one class declaration and its supported members."""
    body = node.child_by_field_name("body")

    if body is None:
        raise ValueError("Class declaration has no body.")

    declaration_prefix = "EXPORT CLASS" if exported else "CLASS"
    name = class_name(source, node)

    lines = [
        f"{declaration_prefix}: {name}",
        "-" * (len(declaration_prefix) + len(name) + 2),
        "",
    ]

    children = list(body.named_children)
    public_methods = []
    private_methods = []

    for index, child in enumerate(children):
        if child.type != "method_definition":
            continue

        jsdoc = immediate_jsdoc(source, children, index)
        formatted = format_method(source, child, jsdoc)

        if is_private_method(source, child):
            private_methods.extend(formatted)
            private_methods.append("")
        else:
            public_methods.extend(formatted)
            public_methods.append("")

    if public_methods:
        lines.extend(public_methods)

    if private_methods:
        lines.extend(
            [
                "PRIVATE METHODS",
                "---------------",
                "",
            ]
        )
        lines.extend(private_methods)

    return lines


def extract_imports(source: bytes, root: Node) -> list[str]:
    """Return top-level import statements in source order."""
    imports = []

    for child in root.named_children:
        if child.type == "import_statement":
            imports.append(node_text(source, child))

    return imports


def extract_classes(source: bytes, root: Node) -> list[list[str]]:
    """Return formatted top-level classes in source order."""
    classes = []

    for child in root.named_children:
        if child.type == "class_declaration":
            classes.append(
                extract_class(
                    source,
                    child,
                    exported=False,
                )
            )
            continue

        if child.type != "export_statement":
            continue

        for exported_child in child.named_children:
            if exported_child.type != "class_declaration":
                continue

            classes.append(
                extract_class(
                    source,
                    exported_child,
                    exported=True,
                )
            )

    return classes


def export_source(
    path: Path,
    display_path: Path,
) -> str:
    """Return structural context text for one JavaScript file."""
    source, tree = parse_file(get_parser(), path)

    lines = [
        f"FILE: {display_path.as_posix()}",
        "",
    ]

    if tree.root_node.has_error:
        lines.extend(
            [
                "WARNING: Tree-sitter reported syntax errors.",
                "",
            ]
        )

    imports = extract_imports(source, tree.root_node)

    if imports:
        lines.extend(
            [
                "IMPORTS",
                "-------",
            ]
        )
        lines.extend(imports)
        lines.append("")

    functions = extract_functions(source, tree.root_node)

    if functions:
        lines.extend(
            [
                "FUNCTIONS",
                "---------",
                "",
            ]
        )
        lines.extend(functions)

    tests = extract_tests(source, tree.root_node)

    if tests:
        lines.extend(
            [
                "TESTS",
                "-----",
                "",
            ]
        )
        lines.extend(tests)

    classes = extract_classes(source, tree.root_node)

    for class_lines in classes:
        lines.extend(class_lines)

    return "\n".join(lines).rstrip()


def inspect_source(
    path: Path,
    display_path: Path,
) -> None:
    """Print bounded syntax-tree information for one JavaScript file."""
    source, tree = parse_file(get_parser(), path)

    print(f"FILE: {display_path.as_posix()}")
    print(f"BYTES: {len(source)}")
    print(f"ROOT NODE: {tree.root_node.type}")
    print(f"HAS ERROR: {tree.root_node.has_error}")
    print()

    print_node_tree(
        source,
        tree.root_node,
        max_depth=4,
    )
