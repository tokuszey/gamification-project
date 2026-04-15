from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.spec import Spec, SpecStatus
from app.schemas.spec import SpecCreate, SpecUpdate, SpecOut, ValidateResult
from app.services.template import empty_template
from app.services.ontology import validate_sections_25
from app.services.realizer import build_runtime_config
from app.services.realize_from_owl import build_runtime_from_owl
from app.services.owl_export import export_spec_instance
from app.services.docx_export import export_spec_docx_file
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/specs", tags=["specs"])

@router.post("", response_model=SpecOut)
def create_spec(payload: SpecCreate, db: Session = Depends(get_db)):
    sections = payload.sections or empty_template()
    spec = Spec(title=payload.title, sections=sections, status=SpecStatus.DRAFT)
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec

@router.get("/{spec_id}", response_model=SpecOut)
def get_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    return spec

@router.put("/{spec_id}", response_model=SpecOut)
def update_spec(spec_id: int, payload: SpecUpdate, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")

    if spec.status == SpecStatus.APPROVED:
        raise HTTPException(400, "Approved specs are locked. Create a new spec instead.")

    if payload.title is not None:
        spec.title = payload.title

    if payload.sections is not None:
        merged = dict(spec.sections or {})
        merged.update(payload.sections)
        spec.sections = merged

    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec

@router.post("/{spec_id}/validate", response_model=ValidateResult)
def validate_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")

    ok, errors, warnings = validate_sections_25(spec.sections)

    if ok and not errors:
        spec.status = SpecStatus.VALIDATED
        db.add(spec)
        db.commit()

    return ValidateResult(ok=ok and not errors, errors=errors, warnings=warnings)

@router.post("/{spec_id}/approve", response_model=SpecOut)
def approve_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")

    if spec.status != SpecStatus.VALIDATED:
        raise HTTPException(400, "Spec must be VALIDATED before approval.")

    spec.status = SpecStatus.APPROVED
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec

@router.post("/{spec_id}/realize")
def realize_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    if spec.status != SpecStatus.APPROVED:
        raise HTTPException(400, "Spec must be APPROVED before realization.")

    result = build_runtime_from_owl(spec.id, spec.title, spec.sections)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error"))

    return {"ok": True, "runtime_config": result["runtime_config"], "owl_instance": result["owl_instance"]}

@router.post("/{spec_id}/export-owl")
def export_owl(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    if spec.status != SpecStatus.APPROVED:
        raise HTTPException(400, "Spec must be APPROVED before exporting OWL.")

    out_path = export_spec_instance(spec.id, spec.title, spec.sections)
    return {"ok": True, "file_path": out_path}
@router.get("", response_model=list[SpecOut])
def list_specs(db: Session = Depends(get_db)):
    return db.query(Spec).order_by(Spec.id.desc()).all()


@router.delete("/{spec_id}")
def delete_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    status_value = spec.status.value.lower() if hasattr(spec.status, "value") else str(spec.status).lower()

    allowed_statuses = {"draft", "validated"}

    if status_value not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT or VALIDATED specs can be deleted."
        )

    db.delete(spec)
    db.commit()

    return {
        "ok": True,
        "deleted_spec_id": spec_id
    }



@router.get("/{spec_id}/export-docx")
def export_docx(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")

    file_stream = export_spec_docx_file(spec)

    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="spec_{spec_id}.docx"'
        }
    )

