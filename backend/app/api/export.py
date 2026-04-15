from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.spec import Spec, SpecStatus
from app.services.docx_export import export_spec_docx

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/spec/{spec_id}.docx")
def export_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    if spec.status != SpecStatus.APPROVED:
        raise HTTPException(400, "Spec must be APPROVED to export DOCX")

    path = export_spec_docx(spec.id, spec.title, spec.sections)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"spec_{spec_id}.docx"
    )
