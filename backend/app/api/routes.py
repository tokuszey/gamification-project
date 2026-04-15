from fastapi import APIRouter
from app.api.specs import router as specs_router
from app.api.ai import router as ai_router
from app.api.runtime import router as runtime_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.ontology_api import router as ontology_router
from app.api.telemetry import router as telemetry_router
from app.api.v1.router import api_v1_router

router = APIRouter()

router.include_router(api_v1_router, prefix="/api/v1")
router.include_router(specs_router)
router.include_router(ai_router)
router.include_router(runtime_router)
router.include_router(analytics_router)
router.include_router(auth_router)
router.include_router(ontology_router)
router.include_router(telemetry_router)
