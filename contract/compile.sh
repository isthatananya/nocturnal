#!/usr/bin/env bash
# Compile the Compact contract and copy ZK artifacts to the frontend public dir.
# Prerequisites: compact compiler installed (`compact --version`)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARTIFACTS_DIR="$SCRIPT_DIR/../frontend/public/contract/zk-artifacts"

echo "Compiling credit_lending.compact..."
compact compile "$SCRIPT_DIR/credit_lending.compact" --output "$SCRIPT_DIR/build"

echo "Copying ZK artifacts to frontend..."
mkdir -p "$ARTIFACTS_DIR"
cp -r "$SCRIPT_DIR/build/"* "$ARTIFACTS_DIR/"

echo "Done. Artifacts at: $ARTIFACTS_DIR"
echo "Next: deploy the contract to preprod with 'npx create-mn-app' or the Midnight CLI."
