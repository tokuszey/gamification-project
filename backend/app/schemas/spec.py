from typing import Any, Dict
from pydantic import BaseModel

class SpecCreate(BaseModel):
    title: str = "Untitled Spec"
    sections: Dict[str, Any] = {}

class SpecUpdate(BaseModel):
    title: str | None = None
    sections: Dict[str, Any] | None = None

class SpecOut(BaseModel):
    id: int
    title: str
    status: str
    sections: Dict[str, Any]

    class Config:
        from_attributes = True

class ValidateResult(BaseModel):
    ok: bool
    errors: list[str] = []
    warnings: list[str] = []
