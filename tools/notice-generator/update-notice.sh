#!/usr/bin/env bash
set -e

# Directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../"

NOTICE_GENERATED="$SCRIPT_DIR/NOTICE.generated"
NOTICE_HEADER="$SCRIPT_DIR/NOTICE_HEADER"
NOTICE="$PROJECT_ROOT/NOTICE"

echo "Generating notice for dependencies..."
# Generate the disclaimer using pnpm dlx
pnpm dlx @quantco/pnpm-licenses generate-disclaimer --prod --output-file="$NOTICE_GENERATED"

echo "Combining notices..."
# Add a separator newlines if needed
cat "$NOTICE_HEADER" > "$NOTICE"
echo -e "\n\n================================================================================\n\n" >> "$NOTICE"
cat "$NOTICE_GENERATED" >> "$NOTICE"

# Cleanup
rm "$NOTICE_GENERATED"

echo "NOTICE file updated successfully."
