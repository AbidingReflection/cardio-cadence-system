#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

JS_TESTING_DIR="${PROJECT_ROOT}/scripts/js_testing"
JS_TESTING_PYTHON="${JS_TESTING_DIR}/.venv/bin/python"

CONTEXT_EXPORT_DIR="${PROJECT_ROOT}/scripts/context_export"
CONTEXT_EXPORT_PYTHON="${CONTEXT_EXPORT_DIR}/.venv/bin/python"

CALIBRATION_DIR="${PROJECT_ROOT}/scripts/calibration-POC"
CALIBRATION_PYTHON="${CALIBRATION_DIR}/.venv/bin/python"

WORKOUT_DATA_EXPORT_DIR="${PROJECT_ROOT}/scripts/workout_data_export"
WORKOUT_DATA_EXPORT_PYTHON="${WORKOUT_DATA_EXPORT_DIR}/.venv/bin/python"

FAILED=0


run_pytest() {
    local name="$1"
    local python="$2"
    local working_directory="$3"
    local tests="$4"

    echo
    echo "=== ${name} ==="

    if ! (
        cd "${working_directory}" &&
        "${python}" -m pytest -v "${tests}"
    ); then
        FAILED=1
    fi
}


cd "${PROJECT_ROOT}"


if [[ ! -x "${JS_TESTING_PYTHON}" ]]; then
    echo
    echo "=== js_testing ==="
    echo "Missing js-testing virtual environment: ${JS_TESTING_PYTHON}" >&2
    FAILED=1
else
    run_pytest \
        "js_testing" \
        "${JS_TESTING_PYTHON}" \
        "${PROJECT_ROOT}" \
        "scripts/js_testing/tests"
fi


if [[ -x "${CONTEXT_EXPORT_PYTHON}" ]]; then
    run_pytest \
        "context_export" \
        "${CONTEXT_EXPORT_PYTHON}" \
        "${PROJECT_ROOT}" \
        "scripts/context_export/tests"
else
    run_pytest \
        "context_export" \
        "$(command -v python)" \
        "${PROJECT_ROOT}" \
        "scripts/context_export/tests"
fi


if [[ ! -x "${CALIBRATION_PYTHON}" ]]; then
    echo
    echo "=== calibration ==="
    echo "Missing calibration virtual environment: ${CALIBRATION_PYTHON}" >&2
    FAILED=1
else
    run_pytest \
        "calibration" \
        "${CALIBRATION_PYTHON}" \
        "${PROJECT_ROOT}" \
        "scripts/calibration-POC/tests"
fi


if [[ ! -x "${WORKOUT_DATA_EXPORT_PYTHON}" ]]; then
    echo
    echo "=== workout_data_export ==="
    echo "Missing workout-data-export virtual environment: ${WORKOUT_DATA_EXPORT_PYTHON}" >&2
    FAILED=1
else
    run_pytest \
        "workout_data_export" \
        "${WORKOUT_DATA_EXPORT_PYTHON}" \
        "${WORKOUT_DATA_EXPORT_DIR}" \
        "tests"
fi


echo

if [[ "${FAILED}" -eq 0 ]]; then
    echo "All Python tests passed."
else
    echo "One or more Python test suites failed." >&2
fi

exit "${FAILED}"
