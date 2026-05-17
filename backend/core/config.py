from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = "dev-only-secret"
    allowed_origins: list[str] = ["http://localhost:5173"]
    redis_url: str = "redis://localhost:6379/0"
    session_ttl: int = 604800

    # Bureau integration. 'mock' uses the bundled synthetic dataset (default
    # for dev/hackathon). 'cibil' wires CibilClient which expects
    # CIBIL_API_BASE_URL + CIBIL_API_KEY to be set; raises NotImplementedError
    # until those are configured.
    bureau_provider: str = "mock"
    cibil_api_base_url: str | None = None
    cibil_api_key: str | None = None

    model_config = {"env_file": ".env"}


settings = Settings()
