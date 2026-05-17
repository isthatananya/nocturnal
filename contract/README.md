# `contract/` — Compact ZK circuit + deploy runbook

The smart contract that backs every loan in this app:
`credit_lending.compact` proves that a borrower's private credit tier
justifies the loan terms they're requesting, without revealing the tier.

## Flipping from Option B → Option A

The default app build (Option B) wires Lace + the proof server but does not
generate real ZK proofs — the call site throws `CONTRACT_NOT_DEPLOYED` and
the UI shows an instructive deploy screen. To activate the real ZK flow:

### 1. Install the Compact compiler

The `compact` CLI is not on npm/Cargo — it's distributed by Midnight.
See https://docs.midnight.network/ for the latest install instructions.

```bash
compact --version    # verify the CLI is on PATH
```

### 2. Compile the circuit

```bash
./contract/compile.sh
```

This produces:
- WASM circuit + proving key under `contract/build/`
- A copy under `frontend/public/contract/zk-artifacts/` so the browser can fetch it

### 3. Deploy to preprod

Grab some free **tDUST** from the preprod faucet (linked from Midnight docs),
then:

```bash
# .env.local is gitignored — never commit a real seed
echo "MIDNIGHT_WALLET_SEED=<your-32-byte-hex>" >> .env.local
./contract/deploy.sh
```

The deploy script prints the contract address and writes it back into `.env`
under `VITE_CONTRACT_ADDRESS=…`. Restart the frontend dev server to pick up
the new env value.

### 4. Uncomment the Option A block in `frontend/src/lib/midnight.ts`

Look for the comment banner labeled `── Option A activation ──` inside
`applyForLoan` and uncomment the marked block. The `@midnight-ntwrk/*`
packages it imports are already installed.

Once these four steps are done, "Apply for Loan" will generate a real ZK proof
of credit tier, submit it through the proof server, and return a preprod
transaction hash.

## Reverting to Option B

Set `VITE_CONTRACT_ADDRESS=` (empty) in `.env` and the UI returns to the
"contract not deployed" screen. No code change required.

## Files

| Path                       | Purpose                                          |
|----------------------------|--------------------------------------------------|
| `credit_lending.compact`   | Compact source — the contract                    |
| `compile.sh`               | Compile to WASM + proving key                    |
| `deploy.sh`                | Deploy to preprod + patch `.env`                 |
| `scripts/deploy.mjs`       | Node deploy helper (uses `midnight-js-contracts`)|
