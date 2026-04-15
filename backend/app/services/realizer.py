from typing import Any, Dict, List

def _get_section(sections: Dict[str, Any], contains: str) -> str:
    key = next((k for k in sections.keys() if contains in k), None)
    if not key:
        return ""
    val = sections.get(key, "")
    return "" if val is None else str(val).strip()

def build_runtime_config(spec_id: int, title: str, sections: Dict[str, Any]) -> Dict[str, Any]:
    ui: List[str] = []
    game_types: List[str] = []

    # baseline
    game_types.append("points_levels_progression")
    ui.extend(["ProgressBar", "LevelBadge"])

    # rules (spec doluluğuna göre)
    if _get_section(sections, "Execution Log and Leaderboard Design"):
        ui.append("Leaderboard")
        game_types.append("competition_mode")

    if _get_section(sections, "Rewards and Incentives"):
        ui.append("BadgeGallery")
        game_types.append("rewards_badges")

    if _get_section(sections, "Narrative Framework"):
        ui.append("NarrativePanel")
        game_types.append("narrative_mode")

    if _get_section(sections, "Assessment Framework and KPIs"):
        ui.append("KpiDashboard")
        game_types.append("kpi_tracking")

    # uniq preserve order
    def uniq(xs):
        out = []
        for x in xs:
            if x not in out:
                out.append(x)
        return out

    return {
        "spec_id": spec_id,
        "title": title,
        "runtime": {
            "game_types": uniq(game_types),
            "ui": uniq(ui),
        }
    }
