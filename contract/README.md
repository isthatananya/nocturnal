# `contract/` — Compact ZK circuit + deploy runbook

The smart contract that backs every loan in this app:
`credit_lending.compact` proves that a borrower's private credit tier
justifies the loan terms they're requesting, without revealing the tier.

## What the contract does

- **Private witnesses** (`creditTier`, `expectedInterestBps`, `expectedTermMonths`)
  are held in the borrower's local wallet state.
- **Public circuit** `applyForLoan(requestedAmount, interestBps, termMonths)`
  enforces, in zero-knowledge, that:
  - tier ≥ 1 (a Bronze or better tier)
  - requested amount ≤ `maxLoanForTier(tier)` (₹5L / ₹20L / ₹50L / ₹1Cr by tier)
  - rate and term match `rateForTier(tier)` and `termForTier(tier)`
  - the caller's witness terms match what was submitted
- On success, a `LoanRecord` is inserted into the public on-chain `activeLoans`
  map keyed by `ownPublicKey()`. The contract records the loan but does **not**
  transfer DUST tokens — token plumbing is out of scope for the hackathon build.
- A `repay(amount)` circuit flips the record's `repaid` flag.

The tier caps mirror `frontend/src/lib/tierAssertions.ts` — keep them in lockstep.

## Deploying to preprod (Option A)

The default app build (Option B) wires Lace + the proof server but does not
generate real ZK proofs — the call site throws `CONTRACT_NOT_DEPLOYED` and the
UI shows an instructive deploy screen. To activate the real ZK flow, follow
these four steps.

### 1. Install the Compact compiler

The `compact` CLI is distributed by Midnight (not on npm / cargo).
See https://docs.midnight.network/ for the latest install instructions.

```bash
compact --version    # verify the CLI is on PATH
```

### 2. Compile the circuit

```bash
./contract/compile.sh
```

Emits the WASM circuit + proving key under `contract/build/` and copies a
runtime-importable bundle to `frontend/public/contract/zk-artifacts/` so the
browser can fetch it.

### 3. Fund a Lace wallet on preprod

- Install the [Lace browser extension](https://www.lace.io/) and switch it to
  the network identified by `VITE_NETWORK_ID` (default `testnet`, i.e. preprod).
- Grab free **tDUST** from the preprod faucet linked from Midnight's docs.

### 4. Deploy from the in-app `/deploy` page

```bash
npm run dev       # start the frontend at http://localhost:5173
# then open http://localhost:5173/deploy
```

The page:
- Confirms Lace is installed and connected
- Loads the compiled artifacts emitted in step 2
- Calls `deployContract` from `@midnight-ntwrk/midnight-js-contracts`
- Shows the resulting contract address + deploy tx hash

Copy the contract address into `.env`:

```env
VITE_CONTRACT_ADDRESS=0x...
```

Restart the dev server. The `applyForLoan` flow now generates a real ZK proof
of credit tier, submits it through the proof server, and returns a preprod
transaction hash.

### Why no Node-side deploy script?

`scripts/deploy.mjs` used to be the Node entry point. We retired it because the
seed-based path required adding `@midnight-ntwrk/wallet` + `@midnight-ntwrk/zswap`
and ~300 lines of wallet bootstrapping. Lace already does all of that — key
derivation, balance, signing, submission — so we delegate to it via the
browser. The browser flow is what the official Midnight quickstart uses.

## Reverting to Option B

Set `VITE_CONTRACT_ADDRESS=` (empty) in `.env`. The UI returns to the
"contract not deployed" screen. No code change required.

## Files

| Path                       | Purpose                                          |
|----------------------------|--------------------------------------------------|
| `credit_lending.compact`   | Compact source — the contract                    |
| `compile.sh`               | Compile to WASM + proving key, copy to frontend  |
| `deploy.sh`                | Retired — see in-app `/deploy` page              |
| `scripts/deploy.mjs`       | Retired — exits with a pointer to `/deploy`      |
