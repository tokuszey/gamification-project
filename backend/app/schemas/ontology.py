from pydantic import BaseModel
from typing import Any


class SparqlQueryRequest(BaseModel):
    query: str


class SparqlPresetRequest(BaseModel):
    preset_key: str


class SparqlQueryResponse(BaseModel):
    ok: bool
    variables: list[str]
    rows: list[dict[str, Any]]
    row_count: int
