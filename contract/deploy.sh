#!/usr/bin/env bash
# Deploy credit_lending.compact to the network configured in .env (preprod by default).
# Persists the resulting VITE_CONTRACT_ADDRESS back into .env so a frontend restart
# picks it up automatically.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [ ! -f "$ROOT/.env.local" ]; then
  echo "Missing .env.local with MIDNIGHT_WALLET_SEED — see contract/README.md"
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ROOT/.env.local"; set +a
: "${MIDNIGHT_WALLET_SEED:?Set MIDNIGHT_WALLET_SEED in .env.local}"

if [ ! -f "$ROOT/contract/build/index.cjs" ]; then
  echo "Compiled contract artifacts missing. Run ./contract/compile.sh first."
  exit 1
fi

echo "Deploying credit_lending.compact to network $(grep ^VITE_NETWORK_ID= "$ENV_FILE" | cut -d= -f2)..."
ADDR=$(node "$ROOT/contract/scripts/deploy.mjs")
echo "Deployed at: $ADDR"

# Idempotently patch VITE_CONTRACT_ADDRESS in .env
if grep -q '^VITE_CONTRACT_ADDRESS=' "$ENV_FILE"; then
  sed -i.bak "s|^VITE_CONTRACT_ADDRESS=.*|VITE_CONTRACT_ADDRESS=$ADDR|" "$ENV_FILE"
else
  echo "VITE_CONTRACT_ADDRESS=$ADDR" >> "$ENV_FILE"
fi
echo "Updated $ENV_FILE — restart the frontend dev server."
