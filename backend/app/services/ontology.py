from typing import Any, Dict, List, Tuple
from owlready2 import get_ontology
from app.core.config import settings

EXPECTED_PREFIX = "s"

def _only_sections_25(sections: Dict[str, Any]) -> Dict[str, Any]:
    # sadece s01..s25 ile başlayanları al
    filtered = {k: v for k, v in sections.items() if k.startswith(EXPECTED_PREFIX)}
    # s01..s25 formatına uymayanlar varsa yine de geçerli saymayız
    return filtered

def _get_section(sections: Dict[str, Any], contains: str) -> str:
    key = next((k for k in sections.keys() if contains in k), None)
    if not key:
        return ""
    val = sections.get(key, "")
    return "" if val is None else str(val).strip()

def validate_sections_25(sections: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    filtered = _only_sections_25(sections)

    # Kural: en az 25 section olmalı (eksikse fail)
    if len(filtered) < 25:
        errors.append(f"Missing sections. Found {len(filtered)} section keys starting with 's', expected at least 25.")
        return False, errors, warnings

    # Fazlalık varsa warning (fail değil)
    if len(filtered) > 25:
        warnings.append(f"Extra sections detected ({len(filtered)}). Only first 25 are considered for validation.")

    # Ontology load check
    try:
        get_ontology(settings.ONTOLOGY_PATH).load()
    except Exception as e:
        errors.append(f"Ontology load failed: {e}")
        return False, errors, warnings

    # --- Smart validation rules (filtered üzerinden) ---
    rewards = _get_section(filtered, "Rewards and Incentives")
    mechanics = _get_section(filtered, "Game Mechanics")
    leaderboard = _get_section(filtered, "Execution Log and Leaderboard Design")
    kpis = _get_section(filtered, "Assessment Framework and KPIs")
    data_collection = _get_section(filtered, "Data Collection and Feedback")

    if rewards and not mechanics:
        errors.append("Rewards provided but Game Mechanics section is empty. Define mechanics that grant rewards.")

    if leaderboard and not kpis:
        errors.append("Leaderboard design provided but Assessment Framework and KPIs is empty. Define ranking KPI(s).")

    if kpis and not data_collection:
        errors.append("KPIs provided but Data Collection and Feedback is empty. Define what events/data will be collected.")

    if not rewards:
        warnings.append("Rewards and Incentives section is empty.")
    if not kpis:
        warnings.append("Assessment Framework and KPIs section is empty.")

    ok = len(errors) == 0
    return ok, errors, warnings
