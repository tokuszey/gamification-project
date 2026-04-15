"""
Pydantic models for the 25-section gamification specification and derived runtime artifacts.
Keys follow the studio template: s01::Title … s25::Title.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field


class SpecSectionEntry(BaseModel):
    """Single section: key from template + markdown/plain body."""

    key: str = Field(..., description="e.g. s06::Game Mechanics")
    body: str = Field(default="")


class GamificationSpec25(BaseModel):
    """Validated shape for Phase-1 spec JSON (sections map)."""

    spec_id: int | None = None
    title: str = "Untitled"
    sections: dict[str, str] = Field(default_factory=dict)

    def get_body(self, *substrings: str) -> str:
        for k, v in self.sections.items():
            if all(s in k for s in substrings):
                return "" if v is None else str(v).strip()
        return ""

    def section_contains(self, fragment: str) -> str:
        for k, v in self.sections.items():
            if fragment in k:
                return "" if v is None else str(v).strip()
        return ""

    @classmethod
    def from_db(cls, spec: Any) -> GamificationSpec25:
        raw_sections = dict(getattr(spec, "sections", None) or {})
        normalized_sections: dict[str, str] = {}
        for key, value in raw_sections.items():
            skey = str(key)
            if value is None:
                normalized_sections[skey] = ""
            elif isinstance(value, str):
                normalized_sections[skey] = value
            elif isinstance(value, (dict, list, tuple)):
                # Keep metadata payloads parseable while satisfying strict str schema.
                normalized_sections[skey] = json.dumps(value, ensure_ascii=False)
            else:
                normalized_sections[skey] = str(value)
        return cls(
            spec_id=getattr(spec, "id", None),
            title=str(getattr(spec, "title", "") or "Untitled"),
            sections=normalized_sections,
        )


class MechanicItem(BaseModel):
    id: str
    label: str
    source_line: str | None = None


class RewardItem(BaseModel):
    id: str
    kind: str  # points | badge | level | other
    label: str
    source_line: str | None = None


class GameplayPhase(BaseModel):
    order: int
    title: str
    description: str


class GamificationConfigJSON(BaseModel):
    """Serializable config emitted for embed / deployment (gamification_config.json)."""

    spec_id: int
    title: str
    version: str = "1.0"
    mechanics: list[MechanicItem] = Field(default_factory=list)
    rewards: list[RewardItem] = Field(default_factory=list)
    gameplay_phases: list[GameplayPhase] = Field(default_factory=list)
    raw_sections: dict[str, str] = Field(
        default_factory=dict,
        description="Echo of s06, s08, s13 for audit",
    )


class RuleEffect(BaseModel):
    points_delta: int = 0
    badge_ids: list[str] = Field(default_factory=list)


class InteractionRule(BaseModel):
    """IF action matches THEN effects (from s15 parsing)."""

    id: str
    trigger_action: str
    match: str = "contains"  # contains | exact
    effect: RuleEffect


class StateTransition(BaseModel):
    event: str
    target: str


class GameState(BaseModel):
    id: str
    label: str
    description: str = ""
    transitions: list[StateTransition] = Field(default_factory=list)


class GameStateMachine(BaseModel):
    """Frontend-friendly flow derived from gameplay + rules."""

    initial_state: str
    states: list[GameState]


class OntologyComponentReport(BaseModel):
    token: str
    ontology_class: str | None = None
    ok: bool
    message: str = ""


class DeploymentPackage(BaseModel):
    """Approved spec → frontend-ready package (includes optional DSL logic rules)."""

    gamification_config: GamificationConfigJSON
    spec_sections: dict[str, str] = Field(
        default_factory=dict,
        description="Full 25-section studio bodies (s01:: … s25::) for universal runtime / blueprint UI.",
    )
    game_state_machine: GameStateMachine
    rules: list[InteractionRule]
    logic: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Structured if/then rules from section 15 (DSL)",
    )
    ontology_validation: dict[str, Any]
    kpi_keys: list[str] = Field(default_factory=list, description="Slugs from s18 for analytics.events")
    workbook: dict[str, Any] = Field(
        default_factory=dict,
        description="Çalışma kitabı: core_learning_objectives, detailed_gameplay_flow, leaderboard_view, formative_quiz_flow",
    )
    runtime_config: dict[str, Any] | None = None
    owl_instance_path: str | None = None
    api_key: str
