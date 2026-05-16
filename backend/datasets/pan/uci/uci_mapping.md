# UCI Credit Approval → FeatureVector mapping

This document describes how each of the 15 anonymized attributes in the
**UCI Credit Approval** dataset is mapped onto our `FeatureVector` schema
(`backend/credit/schemas.py::ScoreRequest`) by `uci_overlay.py`.

- Source: https://archive.ics.uci.edu/dataset/27/credit+approval
- License: CC-BY 4.0
- Citation: Quinlan, J. R. (1987). *Credit Approval* [Dataset]. UCI Machine
  Learning Repository. https://doi.org/10.24432/C5FS30

## Fetch instructions

```bash
curl -fsSL -o backend/datasets/pan/uci/crx.data \
  https://archive.ics.uci.edu/ml/machine-learning-databases/credit-screening/crx.data
```

The raw file is ~32 KB, 690 rows, comma-separated, with `?` for missing values.
It is **not** committed to this repo — you fetch it once, then run the overlay.

## Attribute mapping

UCI attribute names are anonymized (A1–A15). Public reverse-engineering work
(e.g., Quinlan 1987) gives the column meanings:

| UCI | Meaning             | Our field                  | Transform                                                          |
|-----|---------------------|----------------------------|--------------------------------------------------------------------|
| A1  | sex/marital (b/a)   | —                          | not used                                                           |
| A2  | age, continuous     | `employment_months`        | `int(A2 * 12)` (treat age as a coarse tenure proxy)                |
| A3  | debt, continuous    | `monthly_emi_obligations`  | `A3 * 1000` (scale to INR-ish range)                               |
| A4  | u/y/l/t             | —                          | not used                                                           |
| A5  | g/p/gg              | —                          | not used                                                           |
| A6  | categorical (a..ff) | `employment_type`          | a/b/c → `salaried`; d/e/i/j → `self_employed`; default `salaried`  |
| A7  | categorical         | —                          | not used                                                           |
| A8  | years employed      | `employment_months`        | overrides A2-based estimate when present (`int(A8 * 12)`)          |
| A9  | prior default (t/f) | `has_settled_account`      | `A9 == 't'`                                                        |
| A10 | currently employed  | gate on `monthly_income`   | if `A10 == 'f'`: income=0, employment_type=`unemployed`            |
| A11 | credit score (0–67) | `existing_cibil_score`     | linear rescale `300 + (A11 / 67) * 600` → 300–900                  |
| A12 | drivers license     | —                          | not used                                                           |
| A13 | citizenship         | —                          | not used                                                           |
| A14 | zipcode             | —                          | not used                                                           |
| A15 | income              | `monthly_income`           | `A15` (already in dollars/year; divide by 12 if interpreting yearly) |

## Defaults for unmapped fields

Fields without a UCI source get the following deterministic defaults:

| Field                       | Default                         |
|-----------------------------|---------------------------------|
| `dpd_max_12m`               | `0`                             |
| `missed_emi_12m`            | `0`                             |
| `credit_history_months`     | `24`                            |
| `hard_inquiries_6m`         | `int(A11) // 10`                |
| `credit_card_utilization`   | `0.3`                           |
| `active_loan_accounts`      | `1 + int(A11) // 20`            |
| `secured_loans_count`       | `0`                             |
| `bank_bounce_count_12m`     | `0`                             |
| `itr_filed`                 | `A9 == 't'`                     |

## Synthetic PAN overlay

A deterministic PAN per row is synthesized so the overlaid dataset can flow
through the PAN scoring path without leaking any real identifier:

```python
PAN = "ZK" + crc32(row_index).hex()[:3].upper() + f"{row_index % 10000:04d}" + "U"
```

This satisfies the official PAN regex `^[A-Z]{5}[0-9]{4}[A-Z]$` and is
clearly synthetic (every entry starts with `ZK`).
