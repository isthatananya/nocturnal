#!/usr/bin/env node
// Deployment moved to the browser.
//
// The Node-side seed-driven deploy path required adding @midnight-ntwrk/wallet
// + @midnight-ntwrk/zswap + ~300 lines of wallet plumbing. We dropped it in
// favour of a one-time browser flow at `/deploy`, which uses Lace for key
// management, balance, signing, and submission — all already wired through
// the installed dapp-connector-api package.
//
// To deploy:
//   1. Install Midnight's `compact` CLI (see https://docs.midnight.network/)
//   2. ./contract/compile.sh
//   3. npm run dev
//   4. Open http://localhost:5173/deploy in a browser with Lace installed
//   5. Paste the resulting contract address into .env as VITE_CONTRACT_ADDRESS
//   6. Restart the dev server

console.error(
  'deploy.mjs has been retired. Use the in-app /deploy page instead — see\n' +
  'contract/README.md for the full runbook.',
)
process.exit(2)
