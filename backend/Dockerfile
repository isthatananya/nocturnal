FROM python:3.12-slim AS base
WORKDIR /app

RUN pip install uv --no-cache-dir
COPY pyproject.toml .
RUN uv sync --no-install-project

FROM base AS development
COPY . .
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
COPY . .
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
