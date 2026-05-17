#!/usr/bin/env bash
# Retired. Deployment moved to the browser at /deploy.
# See contract/README.md for the full runbook.

cat <<'EOF' >&2
deploy.sh has been retired. To deploy credit_lending.compact:

  1. ./contract/compile.sh                 # requires Midnight's `compact` CLI
  2. npm --prefix frontend run dev
  3. open http://localhost:5173/deploy     # Lace + tDUST do the rest
  4. paste the returned address into .env as VITE_CONTRACT_ADDRESS
  5. restart the dev server

Full details in contract/README.md.
EOF
exit 2
