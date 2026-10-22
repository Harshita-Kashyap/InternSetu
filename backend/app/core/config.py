from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006"
    consent_version: str = "1.0"
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15
    # recommendation engine
    matching_method: Literal["baseline", "tfidf", "hybrid", "semantic"] = "baseline"  # baseline | tfidf | hybrid | semantic (hybrid/semantic need requirements-ml.txt)
    default_k: int = 5  # 3 to 5 recommendations
    pmis_portal_url: str = "https://pminternship.mca.gov.in/"  # "Apply" opens here; InternSetu never applies for the user

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("secret_key")
    @classmethod
    def secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32 or v.lower().startswith("change-me"):
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. Generate one with: "
                'python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
