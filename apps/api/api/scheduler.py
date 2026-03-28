from __future__ import annotations

from datetime import timedelta
from typing import Any


def build_stub_recommendation(payload: Any) -> dict[str, Any]:
    slot_end = min(payload.window_end, payload.window_start + timedelta(minutes=payload.slot_minutes))
    preferred_location = payload.location_constraints[0] if payload.location_constraints else None

    return {
        "mode": "stub",
        "requested": {
            "event_id": str(payload.event_id) if payload.event_id else None,
            "song_ids": [str(song_id) for song_id in payload.song_ids],
            "window_start": payload.window_start.isoformat(),
            "window_end": payload.window_end.isoformat(),
            "slot_minutes": payload.slot_minutes,
            "location_constraints": payload.location_constraints,
        },
        "ranked_slots": [
            {
                "rank": 1,
                "start_time": payload.window_start.isoformat(),
                "end_time": slot_end.isoformat(),
                "location": preferred_location,
                "coverage_summary": {
                    "available_members": 0,
                    "required_members": 0,
                    "coverage_ratio": 0.0,
                },
                "members_available": [],
                "unmet_members": [],
            }
        ],
        "status": {
            "mode": "stub",
            "message": "Scheduler endpoint is live and ready for a future DB-backed algorithm implementation.",
        },
    }
