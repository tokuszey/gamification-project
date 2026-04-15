from fastapi import APIRouter, HTTPException, Query

from app.schemas.telemetry import PreviewEventIn
from app.services import preview_telemetry as preview_telemetry_svc

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post("/preview-event")
def post_preview_event(payload: PreviewEventIn):
    preview_telemetry_svc.append_event(
        spec_id=payload.spec_id,
        player_id=payload.player_id,
        event=payload.event,
        mission_id=payload.mission_id,
        meta=payload.meta,
    )
    return {"ok": True}


@router.get("/preview-summary")
def preview_summary(
    spec_id: str | None = Query(
        None,
        description='Omit or use "all" for the latest tail across specs; otherwise a numeric spec id.',
    ),
    since_hours: float | None = Query(
        None,
        ge=0.016,
        le=8760,
        description="If set, only events with ts within this many hours (UTC) are counted.",
    ),
    tail: int | None = Query(
        None,
        ge=1,
        le=3000,
        description="How many trailing JSONL lines to read before filtering (default 500, max 3000).",
    ),
):
    sid: int | None = None
    if spec_id is not None and str(spec_id).strip().lower() not in ("", "all"):
        try:
            sid = int(spec_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="spec_id must be an integer or 'all'") from None
    sh = since_hours if since_hours and since_hours > 0 else None
    return {"ok": True, **preview_telemetry_svc.summarize(sid, since_hours=sh, tail_limit=tail)}
