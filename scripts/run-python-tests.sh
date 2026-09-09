#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

CALIBRATION_DIR="${PROJECT_ROOT}/scripts/calibration-POC"
CALIBRATION_PYTHON="${CALIBRATION_DIR}/.venv/bin/python"

cd "${PROJECT_ROOT}"

echo "Running js_testing tests..."
python -m unittest discover \
    -s scripts/js_testing/tests \
    -p "test_*.py"

echo
echo "Running calibration tests..."

if [[ ! -x "${CALIBRATION_PYTHON}" ]]; then
    echo "Missing calibration virtual environment: ${CALIBRATION_PYTHON}" >&2
    exit 1
fi

"${CALIBRATION_PYTHON}" -m unittest discover \
    -s scripts/calibration-POC/tests \
    -p "test_*.py"
