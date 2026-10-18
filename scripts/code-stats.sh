#!/usr/bin/env bash

set -euo pipefail

echo "=== PRODUCTION CODE ==="

echo
echo "--- APP: Designer ---"

cloc \
    apps/protocol-designer \
    --exclude-dir=tests,test,__pycache__,output,venv,.venv \
    --by-file \
    --include-lang=JavaScript,CSS,Python

echo
echo "--- APP: Controller ---"

cloc \
    apps/cadence-controller \
    --exclude-dir=tests,test,__pycache__,output,venv,.venv \
    --by-file \
    --include-lang=JavaScript,CSS,Python

echo
echo "--- PACKAGES ---"

cloc \
    packages \
    --exclude-dir=tests,test,__pycache__,output,venv,.venv \
    --by-file \
    --include-lang=JavaScript,CSS,Python

echo
echo "=== TEST CODE ==="

echo
echo "--- APP: Designer ---"

cloc \
    apps/protocol-designer \
    --match-d='(^|/)(tests|test)(/|$)' \
    --exclude-dir=venv,.venv,__pycache__,output \
    --by-file \
    --include-lang=JavaScript,CSS,HTML,Python

echo
echo "--- APP: Controller ---"

cloc \
    apps/cadence-controller \
    --match-d='(^|/)(tests|test)(/|$)' \
    --exclude-dir=venv,.venv,__pycache__,output \
    --by-file \
    --include-lang=JavaScript,CSS,HTML,Python

echo
echo "--- PACKAGES ---"

cloc \
    packages \
    --match-d='(^|/)(tests|test)(/|$)' \
    --exclude-dir=venv,.venv,__pycache__,output \
    --by-file \
    --include-lang=JavaScript,CSS,HTML,Python

echo
echo "=== SCRIPTS ==="

cloc \
    scripts \
    --exclude-dir=tests,test,__pycache__,output,venv,.venv \
    --by-file \
    --include-lang=JavaScript,CSS,HTML,Python
