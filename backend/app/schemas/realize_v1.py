from pydantic import BaseModel, Field


class RealizeRequestV1(BaseModel):
    spec_id: int = Field(..., ge=1, description="Approved specification id")


class GamificationEventInV1(BaseModel):
    spec_id: int
    session_id: int | None = None
    event_type: str = Field(..., max_length=120)
    value: int = 0
    kpi_key: str | None = Field(None, max_length=160)
    payload: dict | None = None


class GameStateUpsertV1(BaseModel):
    player_key: str = Field(..., min_length=1, max_length=120)
    spec_id: int = Field(..., ge=1)
    xp: int = Field(0, ge=0)
    level: int = Field(1, ge=1)
    virtual_currency: int = Field(0, ge=0)
    badges: list[str] = Field(default_factory=list)
    shop_owned_ids: list[str] = Field(default_factory=list)


class GameStateOutV1(BaseModel):
    player_key: str
    spec_id: int
    xp: int
    level: int
    virtual_currency: int
    badges: list[str]
    shop_owned_ids: list[str]
