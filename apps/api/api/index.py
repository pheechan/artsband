from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from supabase import Client, create_client

from api.config import (
    APP_ENV,
    CORS_ORIGINS,
    SCHEDULER_MODE,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    should_connect_supabase,
)
from api.scheduler import build_stub_recommendation


class SchedulerRequest(BaseModel):
    event_id: UUID | None = None
    song_ids: list[UUID] = Field(default_factory=list)
    window_start: datetime
    window_end: datetime
    slot_minutes: int = Field(default=60, ge=30, le=240)
    location_constraints: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_request(self) -> "SchedulerRequest":
        if not self.event_id and not self.song_ids:
            raise ValueError("Provide either event_id or song_ids.")
        if self.window_end <= self.window_start:
            raise ValueError("window_end must be later than window_start.")
        return self


class SchedulerCapabilities(BaseModel):
    mode: str
    accepts_event_id: bool
    accepts_song_ids: bool
    slot_minutes_supported: list[int]
    data_sources: list[str]


app = FastAPI(
    title="Artsband API",
    version="0.1.0",
    description="Scheduler-ready FastAPI service for the Artsband platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_supabase_client: Client | None = None


def get_supabase_client() -> Client | None:
    global _supabase_client
    if _supabase_client is None and should_connect_supabase():
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "artsband-api",
        "message": "Use /health or /scheduler/capabilities to inspect the service.",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "artsband-api",
        "app_env": APP_ENV,
        "scheduler_mode": SCHEDULER_MODE,
        "supabase_configured": should_connect_supabase(),
    }


@app.get("/scheduler/capabilities", response_model=SchedulerCapabilities)
def scheduler_capabilities() -> SchedulerCapabilities:
    return SchedulerCapabilities(
        mode=SCHEDULER_MODE,
        accepts_event_id=True,
        accepts_song_ids=True,
        slot_minutes_supported=[30, 60, 90, 120],
        data_sources=["availability", "lineups", "songs", "events", "rehearsals"],
    )


@app.post("/scheduler/recommendations")
def scheduler_recommendations(payload: SchedulerRequest) -> dict[str, Any]:
    # The DB client is instantiated here so the service can later evolve without changing the endpoint contract.
    get_supabase_client()
    return build_stub_recommendation(payload)
