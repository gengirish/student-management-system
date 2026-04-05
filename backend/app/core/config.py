import re

from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_pg_url(raw: str) -> str:
    """Ensure the URL uses the psycopg2 dialect SQLAlchemy expects."""
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://"):]
    if raw.startswith("postgresql://") and "+psycopg2" not in raw:
        raw = raw.replace("postgresql://", "postgresql+psycopg2://", 1)
    return raw


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg2://sms:sms_secret@localhost:5432/student_mgmt"
    SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "/tmp/uploads"
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    @property
    def db_url(self) -> str:
        return _normalize_pg_url(self.DATABASE_URL)


settings = Settings()
