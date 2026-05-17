from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings
from core.redis import get_redis
from auth.router import router as auth_router
from credit.router import router as credit_router
from banks.router import router as banks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    redis = await get_redis()
    await redis.aclose()


app = FastAPI(title="Nocturned API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Nocturned-Request"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # HSTS only meaningful over HTTPS; safe to include in dev
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """Require X-Nocturned-Request header on all state-changing API requests.

    Browsers cannot send custom headers cross-origin without a CORS preflight
    that our CORS policy will reject from unknown origins — this blocks CSRF.
    Simple GET/OPTIONS requests are exempt.
    """
    _SAFE = {"GET", "HEAD", "OPTIONS"}

    async def dispatch(self, request: Request, call_next):
        if (
            request.method not in self._SAFE
            and request.url.path.startswith("/api/")
            and request.headers.get("X-Nocturned-Request") != "1"
        ):
            return JSONResponse({"detail": "CSRF check failed"}, status_code=403)
        return await call_next(request)


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(credit_router, prefix="/api", tags=["credit"])
app.include_router(banks_router, prefix="/api", tags=["banks"])

# Single source of truth for demo CSVs. Frontend dropzone fetches /dataset/upload/tier_*.csv.
_DATASETS_DIR = Path(__file__).resolve().parent / "datasets"
if _DATASETS_DIR.is_dir():
    app.mount("/dataset", StaticFiles(directory=_DATASETS_DIR), name="datasets")


@app.get("/health")
async def health():
    return {"ok": True}
