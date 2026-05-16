# PAN-mode datasets

Two corpora supporting the PAN-card scoring flow.

## `generated/`

Synthetic records produced by `generate.py` using Indian-realistic distributions sampled
from RBI and NSO public statistics. Each record carries a synthetic PAN that satisfies the
official format `^[A-Z]{5}[0-9]{4}[A-Z]$` but is **not a real person's PAN**.

Re-run with:

```
uv run python -m datasets.pan.generate \
  --count 100 --seed 42 \
  --out backend/datasets/pan/generated/pan_corpus.csv \
  --profiles-out backend/datasets/pan/generated/pan_profiles.json
```

`pan_profiles.json` is the 20-row index (4 per tier) consumed by `frontend/src/lib/demoData.ts`.

### Distribution sources

1. RBI *Handbook of Statistics on Indian Economy 2023–24* — personal loan distribution by
   income bracket. https://www.rbi.org.in/Scripts/AnnualPublications.aspx?head=Handbook+of+Statistics+on+Indian+Economy
2. RBI *Sectoral Deployment of Bank Credit* monthly bulletin — secured vs unsecured loan ratios.
3. RBI *Financial Stability Report*, Dec 2024, Chart 2.10 — DPD bucket distribution.
4. NSO *Periodic Labour Force Survey 2022–23* — employment-type split (~21% salaried,
   ~56% self-employed, ~23% other) and tenure distribution.

These sources are cited; the generator uses derived bin-weights only, not raw scrapes.

## `uci/`

A real anonymized corpus (UCI Credit Approval, 690 records, CC-BY 4.0) overlaid with a
synthetic PAN per row, mapped onto our `FeatureVector` schema. Useful as an alternate
test set to detect over-fitting against the synthetic distributions.

- Source: https://archive.ics.uci.edu/dataset/27/credit+approval
- License: CC-BY 4.0 (attribution required — see `uci/uci_mapping.md`)
- Mapping rationale: `uci/uci_mapping.md`

## License

Generator + overlay code: same license as repo root.
UCI dataset retains its upstream CC-BY 4.0 license.
