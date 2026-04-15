# app/services/realize_from_owl.py
from __future__ import annotations
from typing import Any, Dict, List

from owlready2 import World
from app.services.owl_export import export_spec_instance
from app.services.reasoner import check_consistency


def _has_individual_prefix(onto, prefix: str) -> bool:
    for ind in onto.individuals():
        if getattr(ind, "name", "").startswith(prefix):
            return True
    return False


def build_runtime_from_owl(spec_id: int, title: str, sections: Dict[str, Any]) -> Dict[str, Any]:
    try:
        inst_path = str(export_spec_instance(spec_id, title, sections))

        # Instance ontolojisi üzerinde consistency check (düzeltildi)
        cons = check_consistency(onto_path=inst_path)
        if not cons.get("ok"):
            return {"ok": False, "error": cons.get("message"), "owl_instance": inst_path}

        # Instance'ı izole world ile yükle
        world = World()
        inst_onto = world.get_ontology(inst_path).load()

        ui: List[str] = ["ProgressBar", "LevelBadge"]
        game_types: List[str] = ["points_levels_progression"]

        if _has_individual_prefix(inst_onto, "LeaderboardUI_"):
            ui.append("Leaderboard")
            game_types.append("competition_mode")

        if _has_individual_prefix(inst_onto, "KpiDashboardUI_"):
            ui.append("KpiDashboard")
            game_types.append("kpi_tracking")

        if _has_individual_prefix(inst_onto, "NarrativePanelUI_"):
            ui.append("NarrativePanel")
            game_types.append("narrative_mode")

        if _has_individual_prefix(inst_onto, "BadgeGalleryUI_"):
            ui.append("BadgeGallery")
            game_types.append("rewards_badges")

        def uniq(xs):
            out = []
            for x in xs:
                if x not in out:
                    out.append(x)
            return out

        config = {
            "spec_id": spec_id,
            "title": title,
            "runtime": {"game_types": uniq(game_types), "ui": uniq(ui)},
        }
        return {"ok": True, "runtime_config": config, "owl_instance": inst_path}

    except Exception as e:
        return {"ok": False, "error": f"realize_from_owl failed: {e}", "owl_instance": None}