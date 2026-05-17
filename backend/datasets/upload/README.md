# Upload-mode demo datasets

Five synthetic CSV profiles — one per credit tier — used by the bank-upload scoring flow.
Records are anonymized: each row identifies only the issuing bank (e.g. `HDFC_Bank`) and the
financial signals; no personal names. Files are named by the tier they are tuned to produce
when fed into `compute_score()`.

| File | Tier | Score band (CIBIL) | Rows |
|---|---|---|---|
| `tier_prime.csv`  | Prime  | 780–900 | 4 |
| `tier_gold.csv`   | Gold   | 690–779 | 4 |
| `tier_silver.csv` | Silver | 600–689 | 4 |
| `tier_bronze.csv` | Bronze | 510–599 | 4 |
| `tier_none.csv`   | None   | 300–509 | 4 |

## Schema

Columns match `backend/credit/schemas.py::ScoreRequest`. See that file for field definitions
and validation rules.

## License

Synthetic data, released under the same license as the rest of this repository.
Use freely for testing, demos, and development. Not derived from any real bureau dataset.
