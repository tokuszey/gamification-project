from fastapi import APIRouter
from app.services.reasoner import check_consistency

router = APIRouter(prefix="/ontology", tags=["ontology"])

@router.get("/consistency")
def consistency_check():
    return check_consistency()
