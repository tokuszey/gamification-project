import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.models.spec import Spec, SpecStatus
from app.schemas.ai import (
    ApplySuggestionRequest,
    ApplySuggestionResponse,
    AutoCompleteSpecRequest,
    AutoCompleteSpecResponse,
    BootstrapFromSixDRequest,
    SixDProfile,
    SuggestSectionRequest,
    SuggestSectionResponse,
)
from app.services.ai_assistant import huggingface_suggest, offline_suggest, openai_suggest
from app.services.gamifyont_alignment import analyze_alignment
from app.services.ontology_reasoner import validate_ontology

router = APIRouter(prefix="/ai", tags=["ai"])

SIX_D_META_KEY = "__meta::six_d"

_WIZARD_DOMAIN_LABELS = {
    "edu": "Education / Learning",
    "corp": "Corporate / Workplace",
    "pm": "Project Management",
    "health": "Health & Wellness",
    "retail": "Retail / E-commerce",
    "research": "Research / Academic",
    "startup": "Startup / Product",
    "civic": "Civic / Social",
}


def _wizard_domain_line(p: SixDProfile) -> str:
    k = (p.domain_key or "").strip().lower()
    if k == "other":
        return (p.domain_custom or "").strip() or "Other (not specified)"
    if k:
        return _WIZARD_DOMAIN_LABELS.get(k, p.domain_key)
    return "(no domain selected)"


def _wizard_project_type_line(p: SixDProfile) -> str:
    preset = (p.project_type_preset or "").strip()
    if preset == "__other__" or preset.lower() == "other":
        return (p.project_type_custom or "").strip() or "Other — project type text not provided"
    if preset:
        return preset
    return (p.project_type_custom or "").strip() or "(project type not selected)"


def _wizard_course_line(p: SixDProfile) -> str:
    preset = (p.course_code_preset or "").strip()
    if preset == "Other":
        return (p.course_code_custom or "").strip() or "Other — course code not provided"
    if preset:
        return preset
    custom = (p.course_code_custom or "").strip()
    return custom if custom else "(no course code / optional)"


def _generate_section_text(section_key: str, sections: dict, tone: str, extra_context: str | None):
    mode = (settings.AI_MODE or "offline").lower().strip()

    if mode == "openai":
        try:
            suggestion = openai_suggest(
                section_key=section_key,
                sections=sections,
                tone=tone,
                extra_context=extra_context,
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )
            label = "openai" if not (settings.OPENAI_BASE_URL or "").strip() else "openai_compatible"
            return suggestion, label
        except Exception:
            pass
        suggestion = offline_suggest(
            section_key=section_key,
            sections=sections,
            tone=tone,
            extra_context=extra_context,
        )
        return suggestion, "offline"

    if mode == "local":
        try:
            bu = (settings.OPENAI_BASE_URL or "").strip() or "http://127.0.0.1:11434/v1"
            suggestion = openai_suggest(
                section_key=section_key,
                sections=sections,
                tone=tone,
                extra_context=extra_context,
                model=settings.OPENAI_MODEL or "llama3.2",
                api_key=settings.OPENAI_API_KEY or "ollama",
                base_url=bu,
            )
            return suggestion, "local"
        except Exception:
            pass
        suggestion = offline_suggest(
            section_key=section_key,
            sections=sections,
            tone=tone,
            extra_context=extra_context,
        )
        return suggestion, "offline"

    if mode == "huggingface":
        try:
            suggestion = huggingface_suggest(
                section_key=section_key,
                sections=sections,
                tone=tone,
                extra_context=extra_context,
                model=settings.HUGGINGFACE_MODEL,
                api_token=settings.HUGGINGFACE_API_TOKEN,
                inference_base=settings.HUGGINGFACE_INFERENCE_BASE,
            )
            return suggestion, "huggingface"
        except Exception:
            pass
        suggestion = offline_suggest(
            section_key=section_key,
            sections=sections,
            tone=tone,
            extra_context=extra_context,
        )
        return suggestion, "offline"

    suggestion = offline_suggest(
        section_key=section_key,
        sections=sections,
        tone=tone,
        extra_context=extra_context,
    )
    return suggestion, "offline"


def _merge_six_d_meta(sections: dict, profile: SixDProfile) -> dict:
    """Persist 6D wizard answers into the same structure as the Spec Studio checklist."""

    meta = sections.get(SIX_D_META_KEY)
    if not isinstance(meta, dict):
        meta = {}
    phases: dict = dict(meta.get("phases") or {})

    def set_phase(pid: str, notes: str, done: bool | None = None):
        n = str(notes or "").strip()
        phases[pid] = {"done": done if done is not None else bool(n), "notes": n}

    set_phase("d1_define", profile.d1_business_objectives)
    set_phase("d2_behaviors", profile.d2_target_behaviors)
    d3_parts = []
    if profile.d3_hexad_types:
        d3_parts.append("HEXAD: " + ", ".join(profile.d3_hexad_types))
    if profile.d3_bartle_types:
        d3_parts.append("Bartle: " + ", ".join(profile.d3_bartle_types))
    if profile.d3_audience_notes.strip():
        d3_parts.append(profile.d3_audience_notes.strip())
    set_phase("d3_players", "\n".join(d3_parts))
    d4_notes = ""
    if profile.d4_engagement_loop.strip():
        d4_notes += "Engagement loop:\n" + profile.d4_engagement_loop.strip() + "\n\n"
    if profile.d4_progression_loop.strip():
        d4_notes += "Progression loop:\n" + profile.d4_progression_loop.strip()
    set_phase("d4_cycles", d4_notes.strip())
    set_phase("d5_fun", profile.d5_fun)
    set_phase("d6_deploy", profile.d6_tools)

    meta["phases"] = phases
    out = dict(sections)
    out[SIX_D_META_KEY] = meta
    return out


def _build_bootstrap_extra_context(profile: SixDProfile) -> str:
    try:
        ont = validate_ontology(settings.ONTOLOGY_PATH)
        ont_line = (
            f"GamifyOnt ontology loaded: {ont.get('classes', 0)} classes, "
            f"{ont.get('individuals', 0)} individuals. Keep proposed mechanics aligned with this vocabulary."
        )
    except Exception:
        ont_line = "Ontology summary unavailable; still follow scientific gamification and the MDA framework."

    lines = [
        "## 6D framework — designer inputs (for specification generation)",
        "",
        "### Domain & project classification (GPPT-style)",
        f"- **Domain:** {_wizard_domain_line(profile)}",
        f"- **Project type / delivery:** {_wizard_project_type_line(profile)}",
        f"- **Course / context code (optional):** {_wizard_course_line(profile)}",
        "",
        "### D1 — Business objectives",
        profile.d1_business_objectives.strip() or "(empty)",
        "",
        "### D2 — Target behaviors",
        profile.d2_target_behaviors.strip() or "(empty)",
        "",
        "### D3 — Players and personas",
    ]
    if profile.d3_hexad_types:
        lines.append("HEXAD: " + ", ".join(profile.d3_hexad_types))
    if profile.d3_bartle_types:
        lines.append("Bartle: " + ", ".join(profile.d3_bartle_types))
    lines.append(profile.d3_audience_notes.strip() or "(no extra notes)")
    lines.extend(
        [
            "",
            "### D4 — Activity loops",
            "**Engagement:**",
            profile.d4_engagement_loop.strip() or "(empty)",
            "",
            "**Progression:**",
            profile.d4_progression_loop.strip() or "(empty)",
            "",
            "### D5 — Fun and motivation",
            profile.d5_fun.strip() or "(empty)",
            "",
            "### D6 — Tools and rollout",
            profile.d6_tools.strip() or "(empty)",
            "",
            "### Theme / keywords",
            profile.theme_keywords.strip() or "(none)",
            "",
            "### Ontology",
            ont_line,
            "",
        ]
    )
    lines.extend(
        [
            "## Instructions",
            "Using the 6D inputs above, fill every section of the standard 25-part academic gamification specification. "
            "Keep mechanics, dynamics, rewards, and narrative consistent with the audience (HEXAD/Bartle). "
            "Reference MDA (Mechanics, Dynamics, Aesthetics) and measurable KPIs where appropriate.",
            "",
            "## Output language (mandatory)",
            "Write **all** section bodies in **English only** — no Turkish or other languages in the specification text.",
            "",
            "## CRITICAL — domain alignment",
            "The stated **Domain** and project type are the single source of truth. Cybersecurity, SOC, phishing, or "
            "incident-response themes are appropriate ONLY when the domain explicitly names security / cyber-risk training. "
            "For education, HR, health, retail, PM, research, startup, civic, or a custom “Other” description, write "
            "every section for that vertical; do not default to a cybersecurity training scenario.",
        ]
    )
    return "\n".join(lines)


def _fill_empty_sections(
    sections: dict,
    tone: str,
    extra_context: str | None,
    max_sections: int,
) -> tuple[dict, int]:
    """CPU-bound LLM loop; run via asyncio.to_thread from async routes."""
    sections = dict(sections)
    filled_count = 0
    for key in list(sections.keys()):
        if filled_count >= max_sections:
            break
        if str(key).startswith("__"):
            continue
        current_value = str(sections.get(key) or "").strip()
        if current_value:
            continue
        suggestion, _used_mode = _generate_section_text(
            section_key=key,
            sections=sections,
            tone=tone,
            extra_context=extra_context,
        )
        sections[key] = suggestion
        filled_count += 1
    return sections, filled_count


@router.post("/suggest-section", response_model=SuggestSectionResponse)
async def suggest_section(payload: SuggestSectionRequest, db: Session = Depends(get_db)):
    spec = db.get(Spec, payload.spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    sections = dict(spec.sections or {})
    if payload.section_key not in sections:
        raise HTTPException(status_code=400, detail="section_key not found in spec.sections")

    suggestion, used_mode = await asyncio.to_thread(
        _generate_section_text,
        payload.section_key,
        sections,
        payload.tone or "academic",
        payload.extra_context,
    )

    alignment_report = await asyncio.to_thread(analyze_alignment, suggestion, payload.target_hexad)

    return SuggestSectionResponse(
        ok=True,
        spec_id=spec.id,
        section_key=payload.section_key,
        suggestion=suggestion,
        mode=used_mode,
        alignment_report=alignment_report,
    )


@router.post("/apply-suggestion", response_model=ApplySuggestionResponse)
def apply_suggestion(payload: ApplySuggestionRequest, db: Session = Depends(get_db)):
    spec = db.get(Spec, payload.spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    if spec.status == SpecStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Approved specs are locked. Create a new spec instead.")

    sections = dict(spec.sections or {})
    if payload.section_key not in sections:
        raise HTTPException(status_code=400, detail="section_key not found in spec.sections")

    sections[payload.section_key] = payload.suggestion
    spec.sections = sections

    db.add(spec)
    db.commit()
    db.refresh(spec)

    return ApplySuggestionResponse(
        ok=True,
        spec_id=spec.id,
        section_key=payload.section_key,
        saved=True
    )


@router.post("/auto-complete-spec", response_model=AutoCompleteSpecResponse)
async def auto_complete_spec(payload: AutoCompleteSpecRequest, db: Session = Depends(get_db)):
    spec = db.get(Spec, payload.spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    if spec.status == SpecStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Approved specs are locked. Create a new spec instead.")

    sections = dict(spec.sections or {})
    max_sections = payload.max_sections or 25

    timeout = max(5.0, float(settings.AI_AUTOCOMPLETE_TIMEOUT_SEC or 120.0))
    try:
        new_sections, filled_count = await asyncio.wait_for(
            asyncio.to_thread(
                _fill_empty_sections,
                sections,
                payload.tone or "academic",
                payload.extra_context,
                max_sections,
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Auto-complete exceeded {timeout:.0f}s (AI_AUTOCOMPLETE_TIMEOUT_SEC). Try a lower max_sections or a faster model.",
        ) from None

    spec.sections = new_sections
    db.add(spec)
    db.commit()
    db.refresh(spec)

    return AutoCompleteSpecResponse(
        ok=True,
        spec_id=spec.id,
        filled_sections=filled_count,
        validated=False,
        approved=False,
        runtime_config=None,
        owl_instance=None,
    )


@router.post("/bootstrap-from-6d", response_model=AutoCompleteSpecResponse)
async def bootstrap_from_6d(payload: BootstrapFromSixDRequest, db: Session = Depends(get_db)):
    """
    Merge 6D wizard input into spec metadata, build ontology-aware LLM context,
    then auto-fill empty sections of the 25-part specification (same pipeline as auto-complete).
    """
    spec = db.get(Spec, payload.spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    if spec.status == SpecStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Approved specs are locked. Create a new spec instead.")

    sections = dict(spec.sections or {})
    sections = _merge_six_d_meta(sections, payload.six_d)

    if payload.title and str(payload.title).strip():
        spec.title = str(payload.title).strip()[:500]

    extra = _build_bootstrap_extra_context(payload.six_d)
    add_ctx = (payload.additional_context or "").strip()
    if add_ctx:
        extra = f"{extra}\n\n## Additional context (domain template — aligned with Spec Studio)\n{add_ctx}"
    max_sections = payload.max_sections or 25
    timeout = max(5.0, float(settings.AI_AUTOCOMPLETE_TIMEOUT_SEC or 120.0))

    try:
        new_sections, filled_count = await asyncio.wait_for(
            asyncio.to_thread(
                _fill_empty_sections,
                sections,
                payload.tone or "academic",
                extra,
                max_sections,
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"bootstrap-from-6d exceeded {timeout:.0f}s. Try lower max_sections or a faster model.",
        ) from None

    spec.sections = new_sections
    db.add(spec)
    db.commit()
    db.refresh(spec)

    return AutoCompleteSpecResponse(
        ok=True,
        spec_id=spec.id,
        filled_sections=filled_count,
        validated=False,
        approved=False,
        runtime_config=None,
        owl_instance=None,
    )


@router.get("/debug-env")
def debug_env():
    return {
        "AI_MODE": settings.AI_MODE,
        "OPENAI_MODEL": settings.OPENAI_MODEL,
        "OPENAI_API_KEY_set": bool(settings.OPENAI_API_KEY),
        "OPENAI_BASE_URL": settings.OPENAI_BASE_URL or None,
        "HUGGINGFACE_MODEL": settings.HUGGINGFACE_MODEL,
        "HUGGINGFACE_API_TOKEN_set": bool(settings.HUGGINGFACE_API_TOKEN),
        "HUGGINGFACE_INFERENCE_BASE": settings.HUGGINGFACE_INFERENCE_BASE or None,
    }


@router.get("/ontology-check")
def ontology_check():
    result = validate_ontology(settings.ONTOLOGY_PATH)
    return {
        "ok": True,
        "ontology": result
    }
