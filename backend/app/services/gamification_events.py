"""
Bridge KPI / gameplay signals from realization to PostgreSQL `events` (and optional JSON payload).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.runtime import Event


def record_gamification_event(
    db: Session,
    *,
    spec_id: int | None,
    session_id: int | None,
    event_type: str,
    value: int = 0,
    kpi_key: str | None = None,
    payload: dict[str, Any] | None = None,
) -> Event:
    row = Event(
        session_id=session_id,
        event_type=event_type[:120] if event_type else None,
        value=value,
        spec_id=spec_id,
        kpi_key=kpi_key[:160] if kpi_key else None,
        payload=payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
