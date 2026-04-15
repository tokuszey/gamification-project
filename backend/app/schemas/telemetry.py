from pydantic import BaseModel, Field
from typing import Any, Literal, Optional


class PreviewEventIn(BaseModel):
    spec_id: int = Field(..., ge=1)
    player_id: str = Field(..., min_length=1, max_length=200)
    event: Literal[
        "mission_success",
        "mission_fail",
        "step_success",
        "step_fail",
        "session_start",
    ]
    mission_id: Optional[int] = None
    meta: Optional[dict[str, Any]] = None
