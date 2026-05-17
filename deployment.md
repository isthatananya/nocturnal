# ZKCredit — Deployment & Demo Credentials

## Quick start (Docker)

```bash
# 1. Copy environment file
cp .env.example .env          # fill in SECRET_KEY

# 2. Start all services
docker compose up --build -d

# 3. Seed demo borrowers
docker compose exec backend uv run python scripts/generate_demo_users.py

# 4. Seed bank accounts + sample loan requests
#    (requires borrowers to exist first)
docker compose exec backend uv run python scripts/seed_banks.py
```

App is now live at **http://localhost:5173**

---

## Demo accounts

### Borrowers

| Email | Password | Tier | Score | Notes |
|-------|----------|------|-------|-------|
| `priya@zkcredit.demo` | `demo1234` | Prime | 900 | Ideal profile, ₹15L limit |
| `rahul@zkcredit.demo` | `demo1234` | Gold | 714 | Strong, 1 late payment, ₹2L limit |
| `anita@zkcredit.demo` | `demo1234` | Silver | 636 | Self-employed, high FOIR, ₹90K limit |
| `suresh@zkcredit.demo` | `demo1234` | Bronze | 522 | Limited history, high FOIR, ₹1L limit |
| `meena@zkcredit.demo` | `demo1234` | None | 300 | Below eligibility threshold |
| `vikram@zkcredit.demo` | `demo1234` | Prime | 900 | High earner, ₹21L limit |

### Bank Officers

| Email | Password | Bank | Role |
|-------|----------|------|------|
| `officer@neonbank.demo` | `NeonBank2026!` | Neon Bank | Loan Officer |
| `loans@apexcredit.demo` | `ApexCredit2026!` | Apex Credit | Credit Analyst |
| `defi@horizondefi.demo` | `HorizonDeFi2026!` | Horizon DeFi | DeFi Operations |

---

## Lender criteria

| Bank | Min Score | Min Tier | Max Loan | APR |
|------|-----------|----------|----------|-----|
| Neon Bank | 690 | Gold | ₹50L | 12.5% |
| Horizon DeFi | 600 | Silver | ₹30L | 17.5% |
| Apex Credit | 510 | Bronze | ₹20L | 22.0% |

---

## Demo flow (borrower)

1. Log in as `priya@zkcredit.demo`
2. Navigate to **Score** → upload a Prime demo CSV → compute score
3. Navigate to **Marketplace** → see Neon Bank at ~98% odds
4. Click Neon Bank → set amount → Submit application
5. Log out → log in as `officer@neonbank.demo`
6. See the new request appear in real time (or after refresh)
7. Open the request → Approve with a message
8. Log out → log in as Priya → see the decision in Marketplace

---

## Demo flow (bank officer)

1. Log in as `officer@neonbank.demo`
2. Bank Dashboard shows pre-seeded requests with risk ratings
3. Filter by "Neon Bank" tab
4. Review a pending application → click **Review** → Approve or Reject
5. The borrower's Marketplace page updates in real time

---

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Vite dev server |
| Backend API | http://localhost:8000 | FastAPI |
| Redis | localhost:6379 | Data store + pub/sub |
| Proof server | http://localhost:6300 | Midnight ZK proof generation |

---

## Environment variables (`.env`)

```env
SECRET_KEY=<random-64-char-hex>
APP_ENV=development
SESSION_TTL=86400
REDIS_URL=redis://redis:6379/0
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Running seed scripts manually

```bash
# Inside the backend container
docker compose exec backend bash

# Seed borrowers
uv run python scripts/generate_demo_users.py

# Seed banks + loan requests (idempotent — safe to re-run)
uv run python scripts/seed_banks.py
```

Both scripts are idempotent — they skip records that already exist.

---

## Midnight contract deployment (Option A → real ZK proofs)

The default app build (Option B) wires the proof server and contract source
but does not deploy `credit_lending.compact` — the apply flow throws
`CONTRACT_NOT_DEPLOYED` and the UI shows an instructive screen. To activate
real ZK proofs end-to-end, follow this section.

If any step fails the app gracefully degrades back to Option B; the
`/deploy` page itself surfaces the specific error code.

### Prereqs (manual, one-time)

These three can't be automated — they're tied to your machine, browser,
and a rate-limited faucet.

1. **Install the Compact compiler.** Midnight's `compact` CLI is the only
   tool that turns `.compact` source into the WASM circuit + proving key
   the proof server consumes. It is not on npm or cargo; install from
   <https://docs.midnight.network/develop/tutorial/building/contract>.
   Verify with `compact --version`.
2. **Install the official Midnight browser wallet** and switch it to the
   **preprod** network. Reference:
   <https://docs.midnight.network/develop/tutorial/using/chrome-ext>.
   Note the shielded address.
3. **Fund the wallet with preprod tDUST** from Midnight's faucet (link in
   their docs). Takes 1–3 minutes to land. A faucet drip is enough for
   the demo — deploys cost gas, loan applies cost only proof CPU.

### Compile the contract

```bash
./contract/compile.sh
```

Emits:
- `contract/build/` — raw compiler output
- `frontend/public/contract/zk-artifacts/` — runtime-importable copy

Verify before continuing:

```bash
ls frontend/public/contract/zk-artifacts/
# expected: index.cjs + zkir / prover-key / verifier-key per circuit
```

### Deploy via the in-app `/deploy` page

```bash
# from repo root, three services:
docker compose up redis proof-server
uv run --directory backend uvicorn main:app --reload --port 8000
npm --prefix frontend run dev
```

1. Open <http://localhost:5173/deploy> (after logging in).
2. The page walks four prereq checks — wallet installed, connected,
   funded, artifacts present.
3. Click **Deploy contract**. The wallet pops a sign request; approve.
4. Within ~30 s the page returns the contract address + deploy tx hash
   + a copy-pasteable `.env` snippet.

Paste into project root `.env`:

```env
VITE_CONTRACT_ADDRESS=0xYOUR_ADDRESS_HERE
```

Restart the frontend dev server so Vite picks up the new env.

### Verify the live flow

After restart:

| Step | Expected |
|---|---|
| `/verify` | Contract address shown (not "— not yet deployed"); proof-server badge healthy |
| `/score` | Compute via upload / form / PAN — produces a report |
| `/loan/apply` | Connect wallet → click Apply → wallet asks to sign → preprod tx hash displayed |
| `/loan/active` | Full amortisation schedule renders; Pay next EMI sends a real `repay` tx |

### Reverting to Option B

Set `VITE_CONTRACT_ADDRESS=` (empty) in `.env`, restart. The UI returns
to the instructional "deploy first" screen. No code change required.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `WALLET_NOT_INSTALLED` even with extension installed | Wallet not switched to preprod, or extension didn't inject `window.midnight.mnLace` — refresh the tab after enabling |
| Deploy succeeds but `applyForLoan` throws `PROOF_FAILED` | Proof server not reachable; check `docker ps` + `curl localhost:6300/health` |
| `CONTRACT_NOT_DEPLOYED` after pasting address | `.env` line has stray quotes / whitespace; restart dev server |
| Indexer returns no state for the deployed address | Indexer lag on preprod — wait 30–60 s after deploy |
| Vite build hard-fails on `.wasm` | Run `npm install --legacy-peer-deps` once — the `vite-plugin-wasm` / polyfills need to be on disk |

### Demo-mode fallback

Set `VITE_DEMO_MODE=1` and the apply flow bypasses the wallet, animates
proof steps with realistic timings, and renders a fabricated tx hash.
For stage demos where the wallet path is too fragile (rate-limited
faucet, flaky venue network). Not a substitute for the real flow —
prefer live tx hashes when possible.

