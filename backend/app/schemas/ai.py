from pydantic import BaseModel, Field
from typing import Optional, Any, List


class SuggestSectionRequest(BaseModel):
    spec_id: int
    section_key: str
    tone: Optional[str] = "academic"
    extra_context: Optional[str] = None
    target_hexad: Optional[str] = None


class SuggestSectionResponse(BaseModel):
    ok: bool
    spec_id: int
    section_key: str
    suggestion: str
    mode: str
    alignment_report: Optional[Any] = None


class ApplySuggestionRequest(BaseModel):
    spec_id: int
    section_key: str
    suggestion: str


class ApplySuggestionResponse(BaseModel):
    ok: bool
    spec_id: int
    section_key: str
    saved: bool


class AutoCompleteSpecRequest(BaseModel):
    spec_id: int
    tone: Optional[str] = "academic"
    extra_context: Optional[str] = None
    max_sections: Optional[int] = 25


class AutoCompleteSpecResponse(BaseModel):
    ok: bool
    spec_id: int
    filled_sections: int
    validated: bool
    approved: bool
    runtime_config: Optional[Any] = None
    owl_instance: Optional[str] = None


class SixDProfile(BaseModel):
    """Structured designer input for Versland-style 6D → 25-section spec."""

    d1_business_objectives: str = Field(default="", description="D1 Business objectives")
    d2_target_behaviors: str = Field(default="", description="D2 Target behaviors")
    d3_hexad_types: List[str] = Field(default_factory=list)
    d3_bartle_types: List[str] = Field(default_factory=list)
    d3_audience_notes: str = ""
    d4_engagement_loop: str = ""
    d4_progression_loop: str = ""
    d5_fun: str = ""
    d6_tools: str = ""
    theme_keywords: str = ""
    # GPPT-style classification (preset + Other / custom text)
    domain_key: str = ""
    domain_custom: str = ""
    project_type_preset: str = ""
    project_type_custom: str = ""
    course_code_preset: str = ""
    course_code_custom: str = ""


class BootstrapFromSixDRequest(BaseModel):
    spec_id: int
    tone: Optional[str] = "academic"
    title: Optional[str] = None
    six_d: SixDProfile
    max_sections: Optional[int] = 25
    # Spec Studio domain template + header (same as UI "AI Context") for stronger LLM grounding
    additional_context: str = ""
