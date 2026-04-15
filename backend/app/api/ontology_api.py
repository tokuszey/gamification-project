import asyncio

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.ontology import SparqlPresetRequest, SparqlQueryRequest, SparqlQueryResponse
from app.services.sparql_service import SAMPLE_QUERIES, run_select

router = APIRouter(prefix="/ontology", tags=["ontology"])


@router.get("/sparql/presets")
async def sparql_presets():
    return {"ok": True, "presets": list(SAMPLE_QUERIES.keys()), "queries": SAMPLE_QUERIES}


@router.post("/sparql/run", response_model=SparqlQueryResponse)
async def sparql_run(payload: SparqlQueryRequest):
    try:
        out = await asyncio.to_thread(run_select, settings.ONTOLOGY_PATH, payload.query)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SPARQL error: {e}")
    return SparqlQueryResponse(ok=True, **out)


@router.post("/sparql/run-preset", response_model=SparqlQueryResponse)
async def sparql_run_preset(payload: SparqlPresetRequest):
    key = payload.preset_key or ""
    q = SAMPLE_QUERIES.get(key)
    if not q:
        raise HTTPException(status_code=400, detail=f"Unknown preset_key. Available: {list(SAMPLE_QUERIES.keys())}")
    try:
        out = await asyncio.to_thread(run_select, settings.ONTOLOGY_PATH, q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return SparqlQueryResponse(ok=True, **out)
