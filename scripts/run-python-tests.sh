#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

CONTEXT_EXPORT_DIR="${PROJECT_ROOT}/scripts/context_export"
CONTEXT_EXPORT_PYTHON="${CONTEXT_EXPORT_DIR}/.venv/bin/python"

CALIBRATION_DIR="${PROJECT_ROOT}/scripts/calibration-POC"
CALIBRATION_PYTHON="${CALIBRATION_DIR}/.venv/bin/python"

cd "${PROJECT_ROOT}"

FAILED=0

echo
echo "=== js_testing ==="

if ! python -m unittest discover -v \
    -s scripts/js_testing/tests \
    -p "test_*.py"; then
    FAILED=1
fi

echo
echo "=== context_export ==="

if [[ -x "${CONTEXT_EXPORT_PYTHON}" ]]; then
    if ! "${CONTEXT_EXPORT_PYTHON}" -m unittest discover -v \
        -s scripts/context_export/tests \
        -p "test_*.py"; then
        FAILED=1
    fi
else
    if ! python -m unittest discover -v \
        -s scripts/context_export/tests \
        -p "test_*.py"; then
        FAILED=1
    fi
fi

echo
echo "=== calibration ==="

if [[ ! -x "${CALIBRATION_PYTHON}" ]]; then
    echo "Missing calibration virtual environment: ${CALIBRATION_PYTHON}" >&2
    FAILED=1
else
    if ! "${CALIBRATION_PYTHON}" -m unittest discover -v \
        -s scripts/calibration-POC/tests \
        -p "test_*.py"; then
        FAILED=1
    fi
fi

echo

if [[ "${FAILED}" -eq 0 ]]; then
    echo "All Python tests passed."
else
    echo "One or more Python test suites failed." >&2
fi

exit "${FAILED}"
