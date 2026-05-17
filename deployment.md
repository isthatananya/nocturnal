# Nocturned — Deployment Guide

---

## Quick start (local dev)

```bash
cp .env.example .env          # set SECRET_KEY: openssl rand -hex 32
docker compose up --build -d

# Seed demo data (first time only)
docker compose exec backend uv run python scripts/generate_demo_users.py
docker compose exec backend uv run python scripts/seed_banks.py
```

App at **http://localhost:5173**

---

## Demo accounts

### Borrowers

| Email | Password | Tier | Score | Notes |
|-------|----------|------|-------|-------|
| `priya@Nocturned.demo` | `demo1234` | Prime | 900 | Ideal profile, ₹15L limit |
| `rahul@Nocturned.demo` | `demo1234` | Gold | 714 | Strong, 1 late payment |
| `anita@Nocturned.demo` | `demo1234` | Silver | 636 | Self-employed, high FOIR |
| `suresh@Nocturned.demo` | `demo1234` | Bronze | 522 | Limited history |
| `meena@Nocturned.demo` | `demo1234` | None | 300 | Below threshold |

### Bank Officers

| Email | Password | Bank |
|-------|----------|------|
| `officer@neonbank.demo` | `NeonBank2026!` | Neon Bank |
| `loans@apexcredit.demo` | `ApexCredit2026!` | Apex Credit |
| `defi@horizondefi.demo` | `HorizonDeFi2026!` | Horizon DeFi |

---

## Deploying publicly (production build)

### 1 — Server requirements

Any Linux VPS (Ubuntu 22.04+, **2 GB RAM minimum** — proof-server needs ~1 GB).

```bash
# Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

### 2 — Clone and configure

```bash
git clone https://github.com/YOUR_ORG/nocturned.git
cd nocturned

cp .env.prod.example .env.prod
nano .env.prod
```

Key values in `.env.prod`:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | `["https://your-domain.com"]` |
| `VITE_CONTRACT_ADDRESS` | paste after step 5 below; leave empty for demo mode |

### 3 — Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d
```

The frontend Nginx container listens on **port 80** and proxies:
- `/api/` → FastAPI backend
- `/proof/` → Midnight proof server
- everything else → React SPA (`index.html`)

### 4 — Seed demo data

```bash
docker compose -f docker-compose.prod.yml exec backend \
  uv run python scripts/generate_demo_users.py

docker compose -f docker-compose.prod.yml exec backend \
  uv run python scripts/seed_banks.py
```

### 5 — HTTPS (recommended)

Put Nginx on the host in front of the Docker stack:

```nginx
# /etc/nginx/sites-available/nocturned
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo certbot --nginx -d your-domain.com
```

---

## Deploying the Midnight contract to preprod

This enables real ZK proofs for the loan apply flow. The app works without
it (Option B / demo mode). This is Option A.

### Prerequisites

**1. Install the Compact compiler**

```bash
# Download from Midnight's developer portal:
# https://docs.midnight.network/develop/tutorial/building/contract
compact --version   # verify it's on PATH
```

**2. Install Midnight Lace wallet**

- Chrome extension: https://www.lace.io
- Switch to **preprod** network inside the wallet settings

**3. Get preprod tDUST**

Midnight faucet: https://faucet.preprod.midnight.network
(one drip is enough — deploy costs a small gas fee)

### Step A — Compile the contract

Run on the machine where `compact` is installed (not inside Docker):

```bash
./contract/compile.sh
```

Emits WASM circuit + proving key into `frontend/public/contract/zk-artifacts/`.

```bash
# Verify output exists:
ls frontend/public/contract/zk-artifacts/
# Expected: index.cjs + zkir / prover-key / verifier-key files per circuit
```

If running the prod Docker stack, copy the artifacts in before building the
frontend image (they're baked into the nginx container via `COPY`).

### Step B — Deploy via /deploy page

Make sure the dev server (or prod stack) is running:

```bash
# Dev:
docker compose up -d
# Then open: http://localhost:5173/deploy

# Prod:
# open: https://your-domain.com/deploy
```

The page runs four checks automatically: Lace installed → connected to preprod
→ wallet funded → ZK artifacts present. Then:

1. Click **Deploy contract**
2. Approve the Lace signature prompt
3. Wait ~30 s for the preprod transaction to confirm
4. Copy the contract address from the result

### Step C — Activate the contract address

**Dev (local):**
```bash
# Add to .env:
VITE_CONTRACT_ADDRESS=0xYOUR_ADDRESS

# Restart just the frontend (Vite picks up env changes on restart):
docker compose restart frontend
```

**Prod:** VITE_ vars are baked in at build time, so rebuild the frontend image:
```bash
# Edit .env.prod — set VITE_CONTRACT_ADDRESS=0xYOUR_ADDRESS
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up --build -d frontend
```

### Step D — Verify end-to-end

| Page | What to check |
|------|--------------|
| `/verify` | Contract address shown (not "not deployed"); proof-server badge green |
| `/score` | Compute a score via upload / form |
| `/loan/apply` | Connect Lace → Apply → wallet prompts to sign → preprod tx hash shown |
| `/loan/active` | Full amortisation schedule; "Pay EMI" sends a real `repay` tx |

---

## Proof server first-run (important)

The proof server downloads ~200 MB of ZK parameter files from Midnight's S3
on first start. Only happens once per volume:

```
Fetching public parameters for k=10 - finished.
...
starting service: "actix-web-service-0.0.0.0:6300"  ← ready
```

**Wait for "starting service" before deploying or applying for loans.**

The `proof-keys` volume in `docker-compose.prod.yml` persists these files
across restarts so you never re-download them.

---

## Demo mode (no wallet needed)

Set `VITE_DEMO_MODE=1` in `.env` / `.env.prod`. The loan apply flow bypasses
Lace, animates proof steps with realistic timing, and shows a fabricated tx
hash. Use this on demo machines where installing Lace isn't possible.
Rebuild the frontend after changing it (it's baked at build time).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `WALLET_NOT_INSTALLED` with Lace installed | Wallet not set to **preprod** network; reload after switching |
| `CONTRACT_NOT_DEPLOYED` after pasting address | Stray quotes/whitespace in `.env`; rebuild frontend after editing |
| `/deploy` shows "artifacts missing" | Run `./contract/compile.sh`; check `ls frontend/public/contract/zk-artifacts/` |
| `PROOF_FAILED` on apply | Proof server not ready yet (wait for "starting service" log); or `compact` version mismatch |
| Indexer returns no state after deploy | Preprod indexer lag — wait 30–60 s after deploy tx confirms |
| Blank page | Hard-refresh (Cmd+Shift+R); check browser console |
| Proof server re-downloads keys every restart | `proof-keys` Docker volume was deleted — recreate with `docker volume create` |
| Frontend build fails with WASM error | Run `npm install --legacy-peer-deps` inside the `frontend/` dir first |

---

## Environment reference

| Variable | Where set | Notes |
|----------|-----------|-------|
| `SECRET_KEY` | `.env` / `.env.prod` | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | `.env` / `.env.prod` | JSON array of allowed frontend origins |
| `REDIS_URL` | docker-compose env | auto-set to `redis://redis:6379/0` in compose |
| `VITE_NETWORK_ID` | `.env.prod` (build arg) | `preprod` or `testnet` |
| `VITE_INDEXER_URL` | `.env.prod` (build arg) | Midnight preprod GraphQL indexer |
| `VITE_PROOF_SERVER_URL` | `.env.prod` (build arg) | `/proof` when nginx proxies it |
| `VITE_CONTRACT_ADDRESS` | `.env.prod` (build arg) | Deployed contract address; empty = demo mode |
| `VITE_DEMO_MODE` | `.env.prod` (build arg) | `1` to bypass wallet; omit for real ZK flow |
