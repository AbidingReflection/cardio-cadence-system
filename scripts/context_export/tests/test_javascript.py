import unittest

from scripts.context_export.exporters.javascript import (
    extract_classes,
    get_parser,
)


class JavaScriptExporterTests(unittest.TestCase):
    def test_exports_jsdoc_for_exported_class(self) -> None:
        source = b"""
/** Repository for planned protocol versions. */
export class PlannedProtocolVersionRepository {
    add(version) {}
}
"""

        tree = get_parser().parse(source)
        classes = extract_classes(source, tree.root_node)

        self.assertEqual(len(classes), 1)

        output = "\n".join(classes[0])

        self.assertIn(
            "/** Repository for planned protocol versions. */",
            output,
        )
        self.assertIn(
            "EXPORT CLASS: PlannedProtocolVersionRepository",
            output,
        )

    def test_exports_jsdoc_for_non_exported_class(self) -> None:
        source = b"""
/** Internal helper class. */
class Helper {
    run() {}
}
"""

        tree = get_parser().parse(source)
        classes = extract_classes(source, tree.root_node)

        self.assertEqual(len(classes), 1)

        output = "\n".join(classes[0])

        self.assertIn(
            "/** Internal helper class. */",
            output,
        )
        self.assertIn("CLASS: Helper", output)

    def test_exports_class_and_method_jsdoc(self) -> None:
        source = b"""
/** Repository for planned protocol versions. */
export class PlannedProtocolVersionRepository {
    /** Adds a planned protocol version. */
    add(version) {}
}
"""

        tree = get_parser().parse(source)
        classes = extract_classes(source, tree.root_node)

        output = "\n".join(classes[0])

        self.assertIn(
            "/** Repository for planned protocol versions. */",
            output,
        )
        self.assertIn(
            "/** Adds a planned protocol version. */",
            output,
        )

    def test_does_not_attach_non_immediate_jsdoc_to_class(self) -> None:
        source = b"""
/** This should not belong to the class. */

const value = 1;

export class Example {
    run() {}
}
"""

        tree = get_parser().parse(source)
        classes = extract_classes(source, tree.root_node)

        output = "\n".join(classes[0])

        self.assertNotIn(
            "/** This should not belong to the class. */",
            output,
        )

    def test_exports_class_without_jsdoc(self) -> None:
        source = b"""
export class Example {
    run() {}
}
"""

        tree = get_parser().parse(source)
        classes = extract_classes(source, tree.root_node)

        self.assertEqual(len(classes), 1)

        output = "\n".join(classes[0])

        self.assertIn("EXPORT CLASS: Example", output)
