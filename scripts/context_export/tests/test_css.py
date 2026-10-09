import tempfile
import unittest
from pathlib import Path

from scripts.context_export.exporters.css import export_source


class CssExporterTests(unittest.TestCase):
    def export_css(self, source: str) -> str:
        """Export CSS source through the public exporter API."""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.css"
            path.write_text(source, encoding="utf-8")

            return export_source(
                path,
                Path("test.css"),
            )

    def test_exports_ruleset_structure(self) -> None:
        source = """.component {
    display: block;
}
"""

        output = self.export_css(source)

        self.assertIn(
            "[L1-L3] .component",
            output,
        )

    def test_exports_custom_property_declaration(self) -> None:
        source = """.component {
    --component-color: red;
}
"""

        output = self.export_css(source)

        self.assertIn(
            "[L2] --component-color: red;",
            output,
        )

    def test_exports_custom_property_usage(self) -> None:
        source = """.component {
    color: var(--component-color);
}
"""

        output = self.export_css(source)

        self.assertIn(
            "[L2] color: var(--component-color);",
            output,
        )

    def test_exports_multiline_custom_property_usage_as_one_declaration(self) -> None:
        source = """.component {
    color: color-mix(
        in srgb,
        var(--component-color) 50%,
        black
    );
}
"""

        output = self.export_css(source)

        self.assertIn(
            "[L2-L6] color: color-mix( in srgb, var(--component-color) 50%, black );",
            output,
        )

    def test_does_not_export_unrelated_declarations(self) -> None:
        source = """.component {
    display: block;
    color: red;
}
"""

        output = self.export_css(source)

        self.assertIn(
            "[L1-L4] .component",
            output,
        )
        self.assertNotIn(
            "display: block;",
            output,
        )
        self.assertNotIn(
            "color: red;",
            output,
        )

    def test_exports_nested_ruleset_under_container_at_rule(self) -> None:
        source = """@media (max-width: 600px) {
    .component {
        color: var(--component-color);
    }
}
"""

        output = self.export_css(source)

        self.assertIn(
            "[L1-L5] @media (max-width: 600px)",
            output,
        )
        self.assertIn(
            "    [L2-L4] .component",
            output,
        )
        self.assertIn(
            "        [L3] color: var(--component-color);",
            output,
        )
