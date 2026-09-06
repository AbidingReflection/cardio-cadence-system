#!/usr/bin/env bash

set -u

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

show_help() {
    cat <<EOF
Usage:
  $(basename "$0") [substring]
  $(basename "$0") -h
  $(basename "$0") --help

Search recursively within the project directory for files whose paths contain
the supplied substring.

The project directory is automatically determined as the parent directory of
the scripts/ directory containing this script.

Behavior:
  - If no substring is supplied, you will be prompted for one.
  - If exactly one file matches, it is opened automatically in Kate.
  - If multiple files match, they are displayed as a numbered list.
  - Enter a valid number to open that file.
  - Enter another substring to further filter the current results.
  - Filtering can continue repeatedly until one match remains.
  - If a filter produces no matches, the previous results are retained.
  - Matching is case-insensitive.

Examples:
  $(basename "$0") proto
  $(basename "$0") controller
  $(basename "$0")

Options:
  -h, --help    Show this help message.
EOF
}

open_file() {
    local file="$1"

    echo "Opening: ${file#$PROJECT_ROOT/}"

    kate "$file" </dev/null >/dev/null 2>&1 &
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

query="${1:-}"

if [[ -z "$query" ]]; then
    printf "Enter filename substring: "
    IFS= read -r query

    if [[ -z "$query" ]]; then
        echo "Error: no search substring provided."
        exit 1
    fi
fi

mapfile -t matches < <(
    find "$PROJECT_ROOT" \
        -path '*/.git' -prune -o \
        -type f -ipath "*${query}*" -print
)

while true; do
    count=${#matches[@]}

    if (( count == 0 )); then
        echo "No files found matching: '$query'"
        exit 1
    fi

    if (( count == 1 )); then
        open_file "${matches[0]}"
        exit 0
    fi

    echo
    echo "Found $count matches:"
    echo

    for i in "${!matches[@]}"; do
        printf "%3d) %s\n" \
            "$((i + 1))" \
            "${matches[$i]#$PROJECT_ROOT/}"
    done

    echo
    printf "Choose [1-%d] or enter another substring: " "$count"
    IFS= read -r choice

    if [[ -z "$choice" ]]; then
        echo "Enter a file number or another substring."
        continue
    fi

    if [[ "$choice" =~ ^[0-9]+$ ]] &&
       (( choice >= 1 && choice <= count )); then
        open_file "${matches[$((choice - 1))]}"
        exit 0
    fi

    mapfile -t filtered < <(
        printf '%s\n' "${matches[@]}" |
            grep -iF -- "$choice"
    )

    filtered_count=${#filtered[@]}

    if (( filtered_count == 0 )); then
        echo
        echo "No matches for additional filter: '$choice'"
        echo "Keeping the current $count matches."
        continue
    fi

    matches=("${filtered[@]}")
done
