"""Define Cardio Cadence development-server configuration."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8080

APP_ROUTES = {
    "/protocol-designer": "protocol-designer",
    "/cadence-controller": "cadence-controller",
    "/workout-analyzer": "workout-analyzer",
}

TEST_PAGE_RELATIVE_PATH = Path(
    "js-testing",
    "page",
    "tests.html",
)

TEST_MANIFESTS_RELATIVE_PATH = Path(
    "js-testing",
    "manifests",
)


@dataclass(frozen=True)
class ServerConfig:
    """Resolved configuration for the Cardio Cadence development server."""

    project_root: Path
    host: str
    port: int
    data_root: Path
    packages_root: Path
    app_roots: Mapping[str, Path]
    test_page_path: Path
    test_manifests_root: Path
    test_metadata_path: Path
    invalid_root: Path

    @classmethod
    def from_project_root(
        cls,
        project_root: Path,
        *,
        host: str,
        port: int,
    ) -> ServerConfig:
        """Create resolved server configuration from a project root."""
        project_root = project_root.resolve()
        packages_root = (project_root / "packages").resolve()

        return cls(
            project_root=project_root,
            host=host,
            port=port,
            data_root=(project_root / "data").resolve(),
            packages_root=packages_root,
            app_roots={
                route: (project_root / "apps" / app_name / "web").resolve()
                for route, app_name in APP_ROUTES.items()
            },
            test_page_path=(packages_root / TEST_PAGE_RELATIVE_PATH).resolve(),
            test_manifests_root=(
                packages_root / TEST_MANIFESTS_RELATIVE_PATH
            ).resolve(),
            test_metadata_path=(
                project_root
                / "scripts"
                / "js_testing"
                / "data"
                / "test_metadata.sqlite3"
            ).resolve(),
            invalid_root=(project_root / ".invalid-route").resolve(),
        )


def find_project_root() -> Path:
    """Resolve the repository root based on this package's location."""
    return Path(__file__).resolve().parents[2]
