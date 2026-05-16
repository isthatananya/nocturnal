from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = "dev-only-secret"
    allowed_origins: list[str] = ["http://localhost:5173"]
    redis_url: str = "redis://localhost:6379/0"
    session_ttl: int = 604800

    model_config = {"env_file": ".env"}


settings = Settings()
