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
