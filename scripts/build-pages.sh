#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/publish"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

mkdir -p \
    "$OUTPUT_DIR/protocol-designer" \
    "$OUTPUT_DIR/cadence-controller" \
    "$OUTPUT_DIR/packages" \
    "$OUTPUT_DIR/data"

cp -R \
    "$PROJECT_ROOT/apps/protocol-designer/web/." \
    "$OUTPUT_DIR/protocol-designer/"

cp -R \
    "$PROJECT_ROOT/apps/cadence-controller/web/." \
    "$OUTPUT_DIR/cadence-controller/"

cp -R \
    "$PROJECT_ROOT/packages/." \
    "$OUTPUT_DIR/packages/"

while IFS= read -r file; do
    relative_path="${file#data/}"
    destination="$OUTPUT_DIR/data/$relative_path"

    mkdir -p "$(dirname "$destination")"
    cp "$PROJECT_ROOT/$file" "$destination"
done < <(
    cd "$PROJECT_ROOT"
    git ls-files data
)

cat > "$OUTPUT_DIR/index.html" <<'EOF'
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cardio Cadence System</title>
    </head>

    <body>
        <main>
            <h1>Cardio Cadence System</h1>

            <ul>
                <li>
                    <a href="/protocol-designer/">Protocol Designer</a>
                </li>
                <li>
                    <a href="/cadence-controller/">Cadence Controller</a>
                </li>
            </ul>
        </main>
    </body>
</html>
EOF

echo "Pages site built at:"
echo "$OUTPUT_DIR"

touch "$OUTPUT_DIR/.nojekyll"
