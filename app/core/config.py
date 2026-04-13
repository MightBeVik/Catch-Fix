"""Application settings."""

from dataclasses import dataclass, field


@dataclass(slots=True)
class Settings:
    app_name: str = "Catch-Fix Control Room"
    allowed_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )


settings = Settings()