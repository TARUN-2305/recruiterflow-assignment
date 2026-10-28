"""Configuration from environment variables (optionally loaded from backend/.env)."""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Real environment variables win over the .env file (useful in containers).
load_dotenv(BACKEND_DIR / ".env", override=False)


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is not set. Copy backend/.env.example to backend/.env.")
    return value


def database_url() -> str:
    return require_env("DATABASE_URL")
