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
