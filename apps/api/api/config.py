from __future__ import annotations

import os


def read_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


APP_ENV = read_env("APP_ENV", "development")
SCHEDULER_MODE = read_env("SCHEDULER_MODE", "stub")
SUPABASE_URL = read_env("SUPABASE_URL", "https://example.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = read_env("SUPABASE_SERVICE_ROLE_KEY", "example-service-role-key")
WEB_APP_URL = read_env("WEB_APP_URL", "http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in read_env("CORS_ORIGINS", WEB_APP_URL).split(",") if origin.strip()]


def should_connect_supabase() -> bool:
    return not SUPABASE_URL.startswith("https://example.") and not SUPABASE_SERVICE_ROLE_KEY.startswith("example-")
