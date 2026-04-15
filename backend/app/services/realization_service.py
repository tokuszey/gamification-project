import re
import secrets
from typing import Any

from app.core.realization_engine import (
    RuleEngine,
    build_game_state_machine,
    extract_kpi_slugs_from_s18,
    parse_logic_dsl_from_text,
    transform_spec_to_gamification_config,
)
from app.core.workbook_runtime import build_workbook_runtime
from app.models.spec import Spec
from app.models.spec_model import DeploymentPackage, GamificationSpec25
from app.services.ontology_sync import validate_component_mappings
from app.services.realize_from_owl import build_runtime_from_owl


def _clean_lines(text: str) -> list[str]:
    if not text:
        return []
    lines = []
    for line in str(text).splitlines():
        line = line.strip()
        line = re.sub(r"^[\-\*\d\.\)\s]+", "", line).strip()
        if line:
            lines.append(line)
    return lines


def build_runtime_preview(spec: Spec) -> dict[str, Any]:
    sections = spec.sections or {}

    rewards = str(sections.get("s08::Rewards and Incentives", "") or "")
    gameplay = str(sections.get("s13::Detailed Gameplay Flow", "") or "")
    stories = str(sections.get("s14::Gamified User Stories", "") or "")
    leaderboard = str(sections.get("s20::Execution Log and Leaderboard Design", "") or "")
    kpi = str(sections.get("s18::Assessment Framework and KPIs", "") or "")
    narrative = str(sections.get("s09::Narrative Framework", "") or "")

    game_types = []
    ui_components = []
    source_sections = []
    task_preview = []

    rewards_lower = rewards.lower()
    leaderboard_lower = leaderboard.lower()
    kpi_lower = kpi.lower()
    narrative_lower = narrative.lower()

    if "points" in rewards_lower or "puan" in rewards_lower:
        game_types.append("points_system")
    if "level" in rewards_lower or "progression" in rewards_lower:
        game_types.append("levels_progression")
    if "badge" in rewards_lower or "rozet" in rewards_lower:
        game_types.append("rewards_badges")
    if "leaderboard" in leaderboard_lower:
        game_types.append("competition_mode")

    if "leaderboard" in leaderboard_lower:
        ui_components.append("Leaderboard")
        source_sections.append("s20::Execution Log and Leaderboard Design")

    if "kpi" in kpi_lower or "weeklypoints" in kpi_lower or "taskscompleted" in kpi_lower:
        ui_components.append("KPIDashboard")
        source_sections.append("s18::Assessment Framework and KPIs")

    if "badge" in rewards_lower or "rozet" in rewards_lower:
        ui_components.append("BadgeGallery")
        source_sections.append("s08::Rewards and Incentives")

    if narrative_lower.strip():
        ui_components.append("NarrativePanel")
        source_sections.append("s09::Narrative Framework")

    if "level" in rewards_lower or "progression" in rewards_lower or "points" in rewards_lower:
        ui_components.append("ProgressBar")
        source_sections.append("s08::Rewards and Incentives")

    raw_tasks = []
    raw_tasks.extend(_clean_lines(gameplay))
    raw_tasks.extend(_clean_lines(stories))

    seen = set()
    for item in raw_tasks:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            task_preview.append(item)
        if len(task_preview) >= 5:
            break

    if not task_preview:
        task_preview = [
            "Complete core mission task",
            "Earn points through weekly challenge",
            "Unlock reward milestone",
        ]

    if not game_types:
        game_types = ["points_system"]

    if not ui_components:
        ui_components = ["ProgressBar"]

    source_sections = sorted(set(source_sections))

    runtime_config = {
        "spec_id": spec.id,
        "title": spec.title,
        "game_types": game_types,
        "ui_components": ui_components,
        "task_preview": task_preview,
        "source_sections": source_sections,
    }

    return runtime_config


class RealizationService:
    """
    Converts an approved 25-section Spec into a deployment-ready package:
    gamification_config + game state machine + rule engine output + ontology checks.
    """

    def build_deployment_package(self, spec: Spec) -> DeploymentPackage:
        gspec = GamificationSpec25.from_db(spec)
        config = transform_spec_to_gamification_config(gspec)
        workbook = build_workbook_runtime(gspec, list(config.gameplay_phases or []))
        s15 = gspec.section_contains("s15::") or gspec.section_contains("Key Interaction Sequences")
        engine = RuleEngine.from_section_text(s15)
        rules = engine.rules
        logic_rules = parse_logic_dsl_from_text(s15)
        gsm = build_game_state_machine(config, rules)
        ont = validate_component_mappings(config)
        s18 = gspec.section_contains("s18::") or gspec.section_contains("Assessment Framework")
        kpi_keys = extract_kpi_slugs_from_s18(s18)

        owl = build_runtime_from_owl(spec.id, spec.title, dict(spec.sections or {}))

        api_key = f"gf_deploy_{secrets.token_urlsafe(24)}"

        spec_sections = {str(k): ("" if v is None else str(v)) for k, v in dict(gspec.sections or {}).items()}

        return DeploymentPackage(
            gamification_config=config,
            spec_sections=spec_sections,
            game_state_machine=gsm,
            rules=rules,
            logic=logic_rules,
            ontology_validation=ont,
            kpi_keys=kpi_keys,
            workbook=workbook,
            runtime_config=owl.get("runtime_config") if owl.get("ok") else None,
            owl_instance_path=str(owl.get("owl_instance") or "") or None,
            api_key=api_key,
        )