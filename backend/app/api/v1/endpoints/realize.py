from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.runtime import UserGameState
from app.models.spec import Spec, SpecStatus
from app.schemas.realize_v1 import (
    GameStateOutV1,
    GameStateUpsertV1,
    GamificationEventInV1,
    RealizeRequestV1,
)
from app.services.gamification_events import record_gamification_event
from app.services.realization_service import RealizationService

router = APIRouter()


@router.post("/realize")
def realize_v1(payload: RealizeRequestV1, db: Session = Depends(get_db)):
    """
    Phase-2: turn an **approved** 25-section spec into a deployment package
    (gamification_config, state machine, rules, ontology report, API key).
    """
    spec = db.get(Spec, payload.spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")
    if spec.status != SpecStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Spec must be APPROVED before realization.")

    svc = RealizationService()
    package = svc.build_deployment_package(spec)
    return {
        "ok": True,
        "deployment_package": package.model_dump(mode="json"),
    }


@router.put("/game-state", response_model=GameStateOutV1)
def upsert_game_state_v1(payload: GameStateUpsertV1, db: Session = Depends(get_db)):
    """Persist Player Runtime progress (PostgreSQL). Frontend sends username as player_key."""
    row = (
        db.query(UserGameState)
        .filter(
            UserGameState.player_key == payload.player_key.strip(),
            UserGameState.spec_id == payload.spec_id,
        )
        .first()
    )
    if not row:
        row = UserGameState(
            player_key=payload.player_key.strip(),
            spec_id=payload.spec_id,
            xp=payload.xp,
            level=payload.level,
            virtual_currency=payload.virtual_currency,
            badges=list(payload.badges or []),
            shop_owned_ids=list(payload.shop_owned_ids or []),
        )
        db.add(row)
    else:
        row.xp = payload.xp
        row.level = payload.level
        row.virtual_currency = payload.virtual_currency
        row.badges = list(payload.badges or [])
        row.shop_owned_ids = list(payload.shop_owned_ids or [])
    db.commit()
    db.refresh(row)
    return GameStateOutV1(
        player_key=row.player_key,
        spec_id=row.spec_id,
        xp=row.xp or 0,
        level=row.level or 1,
        virtual_currency=row.virtual_currency or 0,
        badges=list(row.badges or []),
        shop_owned_ids=list(row.shop_owned_ids or []),
    )


@router.get("/game-state", response_model=GameStateOutV1)
def get_game_state_v1(player_key: str, spec_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(UserGameState)
        .filter(UserGameState.player_key == player_key.strip(), UserGameState.spec_id == spec_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No saved state")
    return GameStateOutV1(
        player_key=row.player_key,
        spec_id=row.spec_id,
        xp=row.xp or 0,
        level=row.level or 1,
        virtual_currency=row.virtual_currency or 0,
        badges=list(row.badges or []),
        shop_owned_ids=list(row.shop_owned_ids or []),
    )


@router.post("/events")
def ingest_gamification_event_v1(payload: GamificationEventInV1, db: Session = Depends(get_db)):
    """Persist a KPI / gameplay row into PostgreSQL `events` (analytics bridge)."""
    row = record_gamification_event(
        db,
        spec_id=payload.spec_id,
        session_id=payload.session_id,
        event_type=payload.event_type,
        value=payload.value,
        kpi_key=payload.kpi_key,
        payload=payload.payload,
    )
    return {"ok": True, "event_id": row.id}
