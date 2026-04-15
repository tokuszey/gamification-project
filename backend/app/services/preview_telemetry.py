"""
Append-only JSONL preview events for later Flow / difficulty calibration.
Stored under backend/data/preview_telemetry.jsonl (gitignored recommended).
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

_lock = threading.Lock()

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_FILE = _DATA_DIR / "preview_telemetry.jsonl"
_DEFAULT_TAIL = 500
_MAX_TAIL_CAP = 3000


def _ensure_file() -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not _FILE.exists():
        _FILE.touch()


def append_event(
    spec_id: int,
    player_id: str,
    event: str,
    mission_id: int | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "spec_id": spec_id,
        "player_id": player_id,
        "event": event,
        "mission_id": mission_id,
        "meta": meta or {},
    }
    line = json.dumps(row, ensure_ascii=False) + "\n"
    with _lock:
        _ensure_file()
        with open(_FILE, "a", encoding="utf-8") as f:
            f.write(line)


def read_tail(limit: int = 100) -> list[dict[str, Any]]:
    limit = max(1, min(limit, _MAX_TAIL_CAP))
    with _lock:
        if not _FILE.exists():
            return []
        lines = _FILE.read_text(encoding="utf-8").splitlines()
    out: list[dict[str, Any]] = []
    for line in lines[-limit:]:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def _parse_row_ts(row: dict[str, Any]) -> datetime | None:
    raw = row.get("ts")
    if not raw:
        return None
    s = str(raw).replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def summarize(
    spec_id: int | None = None,
    since_hours: float | None = None,
    tail_limit: int | None = None,
) -> dict[str, Any]:
    tl = tail_limit if tail_limit is not None else _DEFAULT_TAIL
    tl = max(1, min(int(tl), _MAX_TAIL_CAP))
    rows = read_tail(tl)
    if spec_id is not None:
        rows = [r for r in rows if int(r.get("spec_id") or 0) == spec_id]
    if since_hours is not None and since_hours > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
        rows = [r for r in rows if (t := _parse_row_ts(r)) is not None and t >= cutoff]
    by_event: dict[str, int] = {}
    for r in rows:
        e = str(r.get("event") or "")
        by_event[e] = by_event.get(e, 0) + 1
    out: dict[str, Any] = {
        "total_recent": len(rows),
        "by_event": by_event,
        "file": str(_FILE),
        "tail_limit": tl,
    }
    if spec_id is not None:
        out["spec_id"] = spec_id
    if since_hours is not None and since_hours > 0:
        out["since_hours"] = since_hours
    return out
