#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"
PYTHON="${PYTHON:-python3}"

echo "Creating virtual environment:"
echo "  ${VENV_DIR}"

"${PYTHON}" -m venv "${VENV_DIR}"

echo
echo "Upgrading pip..."
"${VENV_DIR}/bin/python" -m pip install --upgrade pip

if [[ -f "${SCRIPT_DIR}/requirements.txt" ]]; then
    echo
    echo "Installing requirements..."
    "${VENV_DIR}/bin/python" -m pip install \
        -r "${SCRIPT_DIR}/requirements.txt"
fi

echo
echo "Virtual environment ready:"
echo "  ${VENV_DIR}/bin/python"
