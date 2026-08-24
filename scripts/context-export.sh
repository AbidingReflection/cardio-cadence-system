#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

TOOL_DIR="${SCRIPT_DIR}/context_export"
VENV_DIR="${TOOL_DIR}/.venv"
PYTHON_SCRIPT="${TOOL_DIR}/context_export.py"
REQUIREMENTS_FILE="${TOOL_DIR}/requirements.txt"
VENV_PYTHON="${VENV_DIR}/bin/python"


setup_venv() {
    echo "Setting up context-export Python environment..."

    python3 -m venv "${VENV_DIR}"

    "${VENV_PYTHON}" -m pip install --upgrade pip
    "${VENV_PYTHON}" -m pip install -r "${REQUIREMENTS_FILE}"
}


validate_tool_files() {
    if [[ ! -f "${PYTHON_SCRIPT}" ]]; then
        echo "Error: Python implementation not found:" >&2
        echo "  ${PYTHON_SCRIPT}" >&2
        exit 1
    fi

    if [[ ! -f "${REQUIREMENTS_FILE}" ]]; then
        echo "Error: requirements file not found:" >&2
        echo "  ${REQUIREMENTS_FILE}" >&2
        exit 1
    fi
}


main() {
    validate_tool_files

    if [[ ! -x "${VENV_PYTHON}" ]]; then
        setup_venv
    fi

    cd "${PROJECT_ROOT}"

    exec "${VENV_PYTHON}" "${PYTHON_SCRIPT}" "$@"
}


main "$@"


# This repo includes a JavaScript context exporter for LLM use.
#
# Run it with one or more JavaScript files/directories:
#
# ```bash
# ./scripts/context-export.sh <path> [<path> ...]
# ```
#
# Examples:
#
# ```bash
# ./scripts/context-export.sh apps/protocol-designer/web/js
# ```
#
# ```bash
# ./scripts/context-export.sh \
#     apps/protocol-designer/web/js/models/protocol-model.js \
#     apps/protocol-designer/web/js/state/editor-state.js
# ```
#
# It writes a compact structural export containing imports, function/class/method signatures, JSDoc, line numbers, private methods, and test names while omitting implementation bodies.
#
# When you need more project context, tell me exactly which files or directories you want and give me the complete `./scripts/context-export.sh ...` command to run.

