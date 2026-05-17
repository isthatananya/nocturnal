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

# The frontend ESM import needs index.cjs at a stable path
if [ -f "$SCRIPT_DIR/build/index.cjs" ]; then
  cp "$SCRIPT_DIR/build/index.cjs" "$ARTIFACTS_DIR/index.cjs"
fi

echo "Done. Artifacts at: $ARTIFACTS_DIR"
echo "Next:"
echo "  1. echo 'MIDNIGHT_WALLET_SEED=<your-hex>' >> .env.local"
echo "  2. ./contract/deploy.sh"
echo "  3. Uncomment the Option A block in frontend/src/lib/midnight.ts"
