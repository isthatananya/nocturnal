"""Bureau-integration abstraction.

Two clients ship in the box:
- `MockBureauClient` — reads from `backend/datasets/pan/generated/pan_profiles.json`,
  the same 40-profile synthetic corpus the frontend used to read directly.
  Used by default in dev/hackathon builds.
- `CibilClient` — stub for real CIBIL/Experian integration. Raises
  `NotImplementedError` until `CIBIL_API_BASE_URL` + `CIBIL_API_KEY` are set
  and the request/response transforms are wired up.

The factory `get_bureau_client(settings)` selects the active client based on
the `BUREAU_PROVIDER` env var.

Caching: the router caches `bureau_lookup` results for 30 days, keyed by a
hash of the PAN (never the PAN itself), to avoid repeated hard pulls.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from fastapi import HTTPException


PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def validate_pan(pan: str) -> str:
    """Normalise + validate PAN format. Raises 400 on invalid."""
    candidate = (pan or "").strip().upper()
    if not PAN_RE.match(candidate):
        raise HTTPException(400, "Invalid PAN format — expected ABCDE1234F")
    return candidate


def pan_cache_key(pan: str, secret: str) -> str:
    """Stable per-secret hash of the PAN — the cache key never exposes the
    PAN even if Redis is dumped."""
    mac = hmac.new(secret.encode("utf-8"), pan.encode("utf-8"), hashlib.sha256)
    return f"bureau:pan:{mac.hexdigest()[:32]}"


# ── Client interface ────────────────────────────────────────────────────────


class BureauClient(ABC):
    """Returns a FeatureVector-compatible dict for a given PAN."""

    provider_name: str = "abstract"

    @abstractmethod
    async def lookup(self, pan: str) -> dict[str, Any]:
        raise NotImplementedError


# ── Mock client (bundled synthetic dataset) ─────────────────────────────────


class MockBureauClient(BureauClient):
    """40-profile synthetic dataset bundled with the repo.

    PAN → profile index = digits[5:9] mod 40. Indices 0-7 map to None tier,
    8-15 to Bronze, 16-23 to Silver, 24-31 to Gold, 32-39 to Prime — same
    layout the frontend used in the legacy local-JSON path.
    """

    provider_name = "mock"

    def __init__(self, profile_path: Path | None = None) -> None:
        self._path = profile_path or Path(__file__).resolve().parents[1] / "datasets" / "pan" / "generated" / "pan_profiles.json"
        self._profiles: list[dict] | None = None

    def _load(self) -> list[dict]:
        if self._profiles is not None:
            return self._profiles
        if not self._path.exists():
            raise HTTPException(503, "Bureau dataset missing — run datasets.pan.generate")
        with self._path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        profiles = data.get("profiles") if isinstance(data, dict) else data
        if not isinstance(profiles, list) or not profiles:
            raise HTTPException(503, "Bureau dataset malformed")
        self._profiles = profiles
        return profiles

    async def lookup(self, pan: str) -> dict[str, Any]:
        profiles = self._load()
        digits = int(pan[5:9]) if pan[5:9].isdigit() else 0
        idx = digits % len(profiles)
        profile = dict(profiles[idx])
        # Force the data_source / signed_by markers so downstream scoring
        # treats this as a real bureau result regardless of what's in the JSON.
        profile["data_source"] = "pan"
        profile["signed_by"] = "Synthetic_Bureau"
        return profile


# ── CIBIL client (stub) ─────────────────────────────────────────────────────


class CibilClient(BureauClient):
    """Placeholder for a real CIBIL/Experian REST integration.

    When activating: implement `lookup` to POST the PAN to the bureau's
    consumer-credit-pull endpoint with the right auth headers, parse the
    bureau response into our FeatureVector shape, and return it. Keep the
    raw bureau payload out of the return value — caller stores only the
    derived features.
    """

    provider_name = "cibil"

    def __init__(self, base_url: str | None, api_key: str | None) -> None:
        self._base_url = base_url
        self._api_key = api_key

    async def lookup(self, pan: str) -> dict[str, Any]:
        if not self._base_url or not self._api_key:
            raise HTTPException(
                501,
                "Real bureau integration not configured. Set BUREAU_PROVIDER=mock or "
                "supply CIBIL_API_BASE_URL + CIBIL_API_KEY and implement CibilClient.lookup.",
            )
        # Implementation lives behind production credentials — left as a stub
        # so the abstraction compiles and tests run without making network calls.
        raise NotImplementedError(
            "CibilClient.lookup is a stub. Wire your bureau provider's REST call here.",
        )


# ── Factory ─────────────────────────────────────────────────────────────────


def get_bureau_client(settings: Any) -> BureauClient:
    """Pick the active client based on settings.bureau_provider."""
    provider = (getattr(settings, "bureau_provider", "mock") or "mock").lower()
    if provider == "cibil":
        return CibilClient(
            base_url=getattr(settings, "cibil_api_base_url", None),
            api_key=getattr(settings, "cibil_api_key", None),
        )
    return MockBureauClient()
