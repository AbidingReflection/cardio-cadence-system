#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

TOOL_DIR="${SCRIPT_DIR}/context_export"
VENV_DIR="${TOOL_DIR}/.venv"
PYTHON_SCRIPT="${TOOL_DIR}/context_export.py"
REQUIREMENTS_FILE="${TOOL_DIR}/requirements.txt"
OUTPUT_DIR="${TOOL_DIR}/output"
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


# Parses wrapper-specific command-line options.
parse_args() {
    OPEN_IN_KATE=false
    EXPORT_ARGS=()

    for arg in "$@"; do
        case "${arg}" in
            -k|--kate)
                OPEN_IN_KATE=true
                ;;
            *)
                EXPORT_ARGS+=("${arg}")
                ;;
        esac
    done
}


# Opens the most recently generated export in Kate.
open_latest_export_in_kate() {
    if ! command -v kate >/dev/null 2>&1; then
        echo "Error: kate command not found." >&2
        exit 1
    fi

    local latest_export

    latest_export="$(
        find "${OUTPUT_DIR}" \
            -maxdepth 1 \
            -type f \
            -printf '%T@ %p\n' \
            | sort -nr \
            | head -n 1 \
            | cut -d' ' -f2-
    )"

    if [[ -z "${latest_export}" ]]; then
        echo "Error: no context export found to open." >&2
        exit 1
    fi

    kate "${latest_export}" >/dev/null 2>&1 &
}


main() {
    validate_tool_files
    parse_args "$@"

    if [[ ! -x "${VENV_PYTHON}" ]]; then
        setup_venv
    fi

    cd "${PROJECT_ROOT}"

    "${VENV_PYTHON}" "${PYTHON_SCRIPT}" "${EXPORT_ARGS[@]}"

    if [[ "${OPEN_IN_KATE}" == true ]]; then
        open_latest_export_in_kate
    fi
}


main "$@"
