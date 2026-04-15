"""
Owlready2 sync: map realized game components to GamifyOnt classes (GameElement hierarchy).
"""

from __future__ import annotations

from typing import Any

from owlready2 import World

from app.core.config import settings
from app.models.spec_model import GamificationConfigJSON, OntologyComponentReport

# Labels we extract from config → expected OWL class names in GamifyOnt.owl
_TOKEN_TO_CLASS: dict[str, str] = {
    "points": "Points",
    "point": "Points",
    "xp": "Points",
    "badge": "Badge",
    "badges": "Badge",
    "leaderboard": "Leaderboard",
    "level": "Level",
    "levels": "Level",
    "quest": "Quest",
    "quests": "Quest",
}


def _class_exists(onto, name: str) -> bool:
    try:
        cls = getattr(onto, name, None)
        return cls is not None
    except Exception:
        return False


def validate_component_mappings(config: GamificationConfigJSON) -> dict[str, Any]:
    """
    For each mechanic/reward label, infer ontology class and verify it exists in GamifyOnt.
    """
    world = World()
    try:
        onto = world.get_ontology(settings.ONTOLOGY_PATH).load()
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "components": [],
        }

    reports: list[OntologyComponentReport] = []
    tokens: set[str] = set()

    for m in config.mechanics:
        low = m.label.lower()
        for tok, cls_name in _TOKEN_TO_CLASS.items():
            if tok in low:
                tokens.add(cls_name)

    for r in config.rewards:
        if r.kind == "points":
            tokens.add("Points")
        elif r.kind == "badge":
            tokens.add("Badge")
        elif r.kind == "level":
            tokens.add("Level")
        else:
            low = r.label.lower()
            for tok, cls_name in _TOKEN_TO_CLASS.items():
                if tok in low:
                    tokens.add(cls_name)

    if not tokens:
        tokens.add("GameElement")

    for cls_name in sorted(tokens):
        ok = _class_exists(onto, cls_name)
        reports.append(
            OntologyComponentReport(
                token=cls_name,
                ontology_class=cls_name,
                ok=ok,
                message="present in GamifyOnt" if ok else "class not found in ontology file",
            )
        )

    all_ok = all(r.ok for r in reports)
    return {
        "ok": all_ok,
        "components": [r.model_dump() for r in reports],
    }
