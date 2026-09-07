#!/usr/bin/env bash

set -euo pipefail

echo "=== PRODUCTION CODE ==="

cloc \
    apps/protocol-designer \
    packages \
    scripts \
    --exclude-dir=tests,test,__pycache__,output,venv,.venv \
    --by-file \
    --include-lang=JavaScript,CSS,HTML,Python

echo
echo "=== TEST CODE ==="

cloc \
    apps/protocol-designer \
    packages \
    scripts \
    --match-d='(^|/)(tests|test)(/|$)' \
    --exclude-dir=venv,.venv,__pycache__,output \
    --by-file \
    --include-lang=JavaScript,CSS,HTML,Python
