from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import re
import math
from datetime import datetime
from pydantic import BaseModel

from app.db.deps import get_db
from app.models.spec import Spec
from app.services.runtime_state import player_states

router = APIRouter(prefix="/runtime", tags=["runtime"])

DEFAULT_SCENARIOS = {
    "cybersecurity": [
        {"id": 1, "title": "Complete Security Quiz", "xp": 50},
        {"id": 2, "title": "Identify Phishing Email", "xp": 40},
        {"id": 3, "title": "Finish Weekly Challenge", "xp": 70},
    ],
    "sales": [
        {"id": 1, "title": "Close a Prospect Call", "xp": 35},
        {"id": 2, "title": "Log CRM Opportunity", "xp": 30},
        {"id": 3, "title": "Hit Weekly Sales Target", "xp": 80},
    ],
}


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


def _extract_tasks_from_spec(spec: Spec) -> tuple[list[dict], bool]:
    """Returns (tasks, tasks_from_spec_document). Second is False when demo scenarios are used."""
    sections = spec.sections or {}

    gameplay = str(sections.get("s13::Detailed Gameplay Flow", "") or "")
    stories = str(sections.get("s14::Gamified User Stories", "") or "")
    rewards = str(sections.get("s08::Rewards and Incentives", "") or "")
    title = str(spec.title or "").lower()

    raw_candidates = []
    raw_candidates.extend(_clean_lines(gameplay))
    raw_candidates.extend(_clean_lines(stories))

    unique_titles = []
    seen = set()

    for item in raw_candidates:
        normalized = item.lower()
        if normalized not in seen and len(item) > 4:
            seen.add(normalized)
            unique_titles.append(item)

    if not unique_titles:
        if "sales" in title:
            return DEFAULT_SCENARIOS["sales"], False
        return DEFAULT_SCENARIOS["cybersecurity"], False

    xp_base = 40
    rewards_lower = rewards.lower()

    if "badge" in rewards_lower or "rozet" in rewards_lower:
        xp_base += 10
    if "leaderboard" in rewards_lower:
        xp_base += 10
    if "level" in rewards_lower or "progression" in rewards_lower:
        xp_base += 10

    tasks = []
    for idx, task_title in enumerate(unique_titles[:8], start=1):
        xp = xp_base + ((idx % 3) * 10)
        tasks.append({
            "id": idx,
            "title": task_title,
            "xp": xp
        })

    return tasks, True


_CORE_LAB_SECTION_KEYS = (
    "s03::Core Learning Objectives",
    "s06::Game Mechanics",
    "s08::Rewards and Incentives",
    "s09::Narrative Framework",
    "s10::Social Interaction Design",
    "s13::Detailed Gameplay Flow",
    "s14::Gamified User Stories",
    "s18::Assessment Framework and KPIs",
)


def _core_section_richness(sections: dict) -> tuple[int, str]:
    filled = 0
    for k in _CORE_LAB_SECTION_KEYS:
        if len(str(sections.get(k) or "").strip()) >= 40:
            filled += 1
    if filled >= 6:
        depth = "rich"
    elif filled >= 3:
        depth = "moderate"
    else:
        depth = "minimal"
    return filled, depth


def _build_lab_context(
    spec: Spec,
    profile: dict,
    flags: dict,
    task_count: int,
    tasks_from_spec: bool,
) -> dict:
    sections = spec.sections or {}
    filled_core, depth = _core_section_richness(sections)
    strip: list[dict[str, str]] = []
    if tasks_from_spec:
        strip.append({
            "tag": "Traceability",
            "text": "Quest titles come from your Gameplay Flow & Gamified User Stories sections — not a generic demo list.",
        })
    else:
        strip.append({
            "tag": "Spec gap",
            "text": "Add concrete lines to s13 (Gameplay Flow) and s14 (User Stories) to generate your own quest path; demo quests are placeholders.",
        })
    if profile.get("collaboration_score", 0) > 0:
        strip.append({
            "tag": "Social design",
            "text": "Collaboration language in the spec unlocks team-vote style missions (relatedness / social climate).",
        })
    if profile.get("risk_score", 0) > 0:
        strip.append({
            "tag": "Flow calibration",
            "text": "Risk / incident language increases time pressure and mitigation-framed steps (challenge–skill preview).",
        })
    if flags.get("badges") or flags.get("levels"):
        strip.append({
            "tag": "Competence signals",
            "text": "Badge / level wording in Rewards shapes XP curves and badge thresholds in this preview.",
        })
    headline = (
        "Specification-driven program pilot"
        if tasks_from_spec
        else "Engagement preview (demo quests until s13/s14 are filled)"
    )
    subhead = (
        f"{task_count} traceable challenges · {filled_core}/8 core sections substantively filled · lab depth: {depth}"
        if task_count
        else "Load a realized spec to generate the pilot."
    )
    return {
        "tasks_from_spec": tasks_from_spec,
        "filled_core_sections": filled_core,
        "depth": depth,
        "headline": headline,
        "subhead": subhead,
        "methodology_strip": strip[:6],
    }


def _flag_from_text(text: str, keywords: list[str]) -> bool:
    lower = text.lower()
    return any(word in lower for word in keywords)


def _build_question(task_title: str, mission_type: str, idx: int) -> dict:
    title_words = [w for w in re.split(r"\W+", task_title) if len(w) > 2]
    keyword = title_words[min(len(title_words) - 1, idx % max(1, len(title_words)))] if title_words else "process"
    keyword_l = keyword.lower()

    if mission_type == "risk_response":
        # Create step-to-step variation via idx so a 4-step mini run feels different.
        variants = [
            {
                "options": [
                    "Ignore and continue",
                    "Report, contain, and document",
                    "Wait for end-of-day review",
                    "Forward to everyone",
                ],
                "correct_index": 1,
                "stem": f"A risk appears during '{task_title}'. What is the best immediate response?",
                "instruction": "Choose the most reliable mitigation action.",
            },
            {
                "options": [
                    "Contain the incident, then document evidence",
                    "Ignore it until after deployment",
                    "Send alerts without triage",
                    "Wait for management approval",
                ],
                "correct_index": 0,
                "stem": f"During '{task_title}', a threat is detected. What should you do first?",
                "instruction": "Choose the option that reduces blast radius immediately.",
            },
            {
                "options": [
                    "Lock down the affected component, then escalate with evidence",
                    "Postpone and monitor casually",
                    "Share speculative fixes in chat",
                    "Forward to everyone immediately",
                ],
                "correct_index": 0,
                "stem": f"While doing '{task_title}', indicators spike. What is the safest response?",
                "instruction": "Choose the action that balances containment + traceability.",
            },
        ]
        v = variants[idx % len(variants)]
        options = v["options"]
        correct_index = v["correct_index"]
        stem = v["stem"]
        instruction = v["instruction"]
    elif mission_type == "team_vote":
        variants = [
            {
                "options": [
                    "Single owner only",
                    "Peer review + shared checklist",
                    "Skip collaboration to save time",
                    "Randomly assign tasks",
                ],
                "correct_index": 1,
                "stem": f"Team mission: '{task_title}'. Which collaboration pattern improves quality?",
                "instruction": "Choose the option that adds accountability and feedback.",
            },
            {
                "options": [
                    "Centralize decisions with no reviews",
                    "Peer review + shared checklist",
                    "Move forward without documenting assumptions",
                    "Vote randomly to finish faster",
                ],
                "correct_index": 1,
                "stem": f"Within '{task_title}', quality drops. How should the team coordinate?",
                "instruction": "Pick a workflow that catches mistakes early.",
            },
            {
                "options": [
                    "Pair review + acceptance criteria",
                    "Skip collaboration to save time",
                    "Assign work blindly and ignore feedback",
                    "Let each member do separate versions",
                ],
                "correct_index": 0,
                "stem": f"Team mission '{task_title}': what voting pattern best prevents rework?",
                "instruction": "Choose the option that enforces shared standards.",
            },
        ]
        v = variants[idx % len(variants)]
        options = v["options"]
        correct_index = v["correct_index"]
        stem = v["stem"]
        instruction = v["instruction"]
    elif mission_type == "sequence":
        variants = [
            {
                "options": [
                    "Analyze -> Execute -> Measure",
                    "Execute -> Analyze -> Measure",
                    "Measure -> Execute -> Analyze",
                    "Skip analysis",
                ],
                "correct_index": 0,
                "stem": f"For '{task_title}', which sequence is the most robust?",
                "instruction": "Pick the order that starts with understanding before execution.",
            },
            {
                "options": [
                    "Measure -> Execute -> Analyze",
                    "Analyze -> Execute -> Measure",
                    "Execute -> Measure -> Analyze",
                    "Skip analysis",
                ],
                "correct_index": 1,
                "stem": f"In '{task_title}', which order reduces decision risk?",
                "instruction": "Pick the sequence that validates before measuring outcomes.",
            },
            {
                "options": [
                    "Analyze -> Measure -> Execute",
                    "Analyze -> Execute -> Measure",
                    "Execute -> Analyze -> Measure",
                    "Skip analysis",
                ],
                "correct_index": 1,
                "stem": f"While implementing '{task_title}', what plan is safest?",
                "instruction": "Choose the flow that ensures analysis drives execution.",
            },
        ]
        v = variants[idx % len(variants)]
        options = v["options"]
        correct_index = v["correct_index"]
        stem = v["stem"]
        instruction = v["instruction"]
    elif mission_type == "quiz":
        options = [
            f"Track {keyword_l} with KPI checks",
            f"Ignore {keyword_l} metrics",
            f"Delay {keyword_l} review indefinitely",
            f"Replace {keyword_l} with guesswork",
        ]
        correct_index = 0
        stem = f"Knowledge check: what is the best way to handle '{keyword}' in this mission?"
        instruction = "Select the answer aligned with measurable progress."
    elif mission_type == "maze_escape":
        # 2D-feel: choose the correct tile in a mini maze.
        gridSize = 7
        variants = [
            {
                "hero": {"x": 3, "y": 6},
                "goal": {"x": 3, "y": 0},
                "tileByOption": [
                    {"x": 1, "y": 5},
                    {"x": 5, "y": 5},
                    {"x": 1, "y": 1},
                    {"x": 5, "y": 1},
                ],
            },
            {
                "hero": {"x": 3, "y": 6},
                "goal": {"x": 3, "y": 0},
                "tileByOption": [
                    {"x": 2, "y": 5},
                    {"x": 4, "y": 5},
                    {"x": 2, "y": 1},
                    {"x": 4, "y": 1},
                ],
            },
            {
                "hero": {"x": 3, "y": 6},
                "goal": {"x": 3, "y": 0},
                "tileByOption": [
                    {"x": 1, "y": 3},
                    {"x": 5, "y": 3},
                    {"x": 2, "y": 1},
                    {"x": 4, "y": 1},
                ],
            },
        ]

        v = variants[idx % len(variants)]

        correct_index = idx % 4
        safe_label = f"Safe route: validate {keyword_l} first"
        risky_labels = [
            f"Shortcut: skip {keyword_l} checks",
            f"Detour: delay {keyword_l} action",
            f"Guesswork path: no evidence for {keyword_l}",
        ]
        options: list[str] = ["" for _ in range(4)]
        fill_i = 0
        for i in range(4):
            if i == correct_index:
                options[i] = safe_label
            else:
                options[i] = risky_labels[fill_i % len(risky_labels)]
                fill_i += 1

        stem = f"'{task_title}' has obstacles. Choose the route that follows {keyword_l} gates."
        instruction = f"Select the tile whose choice prioritizes {keyword_l} validation."

        return {
            "stem": stem,
            "instruction": instruction,
            "options": options,
            "correct_index": correct_index,
            # Frontend uses this to render the 2D mini game.
            "game": {
                "kind": "maze_escape",
                "gridSize": gridSize,
                "hero": v["hero"],
                "goal": v["goal"],
                "tileByOption": v["tileByOption"],
            },
            # keep compatibility with other code paths
            "focus_terms": [],
        }
    elif mission_type == "platformer_run":
        gridW = 10
        gridH = 6
        hero = {"x": 1, "y": 4}
        goal = {"x": 9, "y": 1}
        variants = [
            {
                "platforms": [
                    {"x": 0, "y": 4, "w": 4},
                    {"x": 4, "y": 3, "w": 3},
                    {"x": 7, "y": 1, "w": 3},
                ],
                "landings": [
                    {"x": 3, "y": 4},
                    {"x": 5, "y": 3},
                    {"x": 7, "y": 3},
                    {"x": 8, "y": 1},
                ],
                "correct_index": 1,
            },
            {
                "platforms": [
                    {"x": 0, "y": 4, "w": 5},
                    {"x": 5, "y": 2, "w": 2},
                    {"x": 7, "y": 1, "w": 3},
                ],
                "landings": [
                    {"x": 2, "y": 4},
                    {"x": 4, "y": 4},
                    {"x": 6, "y": 2},
                    {"x": 8, "y": 1},
                ],
                "correct_index": 2,
            },
            {
                "platforms": [
                    {"x": 0, "y": 4, "w": 3},
                    {"x": 3, "y": 3, "w": 3},
                    {"x": 6, "y": 2, "w": 2},
                    {"x": 8, "y": 1, "w": 2},
                ],
                "landings": [
                    {"x": 2, "y": 4},
                    {"x": 4, "y": 3},
                    {"x": 6, "y": 2},
                    {"x": 8, "y": 1},
                ],
                "correct_index": 3,
            },
        ]
        v = variants[idx % len(variants)]
        correct_index = v["correct_index"]
        safe_label = f"Land on {keyword_l} platform"
        risky_labels = [
            "Land on unstable ledge (no validation)",
            "Jump without safety review",
            "Drop into hazard zone",
        ]
        options: list[str] = ["" for _ in range(4)]
        fill_i = 0
        for i in range(4):
            if i == correct_index:
                options[i] = safe_label
            else:
                options[i] = risky_labels[fill_i % len(risky_labels)]
                fill_i += 1
        stem = f"Platforms shift under '{task_title}'. Choose the landing that matches {keyword_l} checks."
        instruction = f"Pick the slot that advances safely and respects {keyword_l} gates."
        return {
            "stem": stem,
            "instruction": instruction,
            "options": options,
            "correct_index": correct_index,
            "game": {
                "kind": "platformer_run",
                "gridW": gridW,
                "gridH": gridH,
                "hero": hero,
                "goal": goal,
                "platforms": v["platforms"],
                "landings": v["landings"],
            },
            "focus_terms": [],
        }
    elif mission_type == "dodge_runner":
        gridW = 10
        gridH = 5
        laneYs = [1, 2, 3]
        runner = {"lane": 1}
        variants = [
            {
                "obstacleLane": 1,
                "optionLanes": [0, 2, 1, 0],
            },
            {
                "obstacleLane": 0,
                "optionLanes": [2, 1, 0, 1],
            },
            {
                "obstacleLane": 2,
                "optionLanes": [0, 1, 2, 0],
            },
        ]
        v = variants[idx % len(variants)]
        # correct_index is the option whose lane is NOT the obstacle lane
        # (deterministic via v.optionLanes order)
        correct_index = next(
            (i for i, lane in enumerate(v["optionLanes"]) if lane != v["obstacleLane"]),
            0,
        )
        safe_label = f"Dodge to safe lane ({keyword_l})"
        risky_labels = [
            "Stay in hazard lane",
            "Duck into the wrong timing",
            "Dash without triage",
        ]
        options: list[str] = ["" for _ in range(4)]
        fill_i = 0
        for i in range(4):
            if i == correct_index:
                options[i] = safe_label
            else:
                options[i] = risky_labels[fill_i % len(risky_labels)]
                fill_i += 1

        stem = f"During '{task_title}', a hazard appears. Dodge the action that matches {keyword_l} prioritization."
        instruction = f"Pick the action that avoids the obstacle and preserves {keyword_l} flow."
        return {
            "stem": stem,
            "instruction": instruction,
            "options": options,
            "correct_index": correct_index,
            "game": {
                "kind": "dodge_runner",
                "gridW": gridW,
                "gridH": gridH,
                "laneYs": laneYs,
                "runner": runner,
                "obstacleLane": v["obstacleLane"],
                "optionLanes": v["optionLanes"],  # length 4
            },
            "focus_terms": [],
        }
    elif mission_type == "tower_climb":
        towerH = 10
        towerW = 6
        baseX = 3
        goalY = 0
        hero = {"x": baseX, "y": 9}
        variants = [
            {
                "ledgeOptions": [
                    {"x": 2, "y": 7},
                    {"x": 4, "y": 7},
                    {"x": 3, "y": 6},
                    {"x": 3, "y": 5},
                ],
                "correct_index": 2,
            },
            {
                "ledgeOptions": [
                    {"x": 2, "y": 7},
                    {"x": 3, "y": 6},
                    {"x": 4, "y": 6},
                    {"x": 3, "y": 4},
                ],
                "correct_index": 1,
            },
            {
                "ledgeOptions": [
                    {"x": 3, "y": 7},
                    {"x": 2, "y": 6},
                    {"x": 4, "y": 6},
                    {"x": 3, "y": 5},
                ],
                "correct_index": 0,
            },
        ]
        v = variants[idx % len(variants)]
        correct_index = v["correct_index"]
        safe_label = f"Climb via {keyword_l} ladder"
        risky_labels = [
            "Climb without validation",
            "Step onto unstable ledge",
            "Rush the tower (guesswork)",
        ]
        options: list[str] = ["" for _ in range(4)]
        fill_i = 0
        for i in range(4):
            if i == correct_index:
                options[i] = safe_label
            else:
                options[i] = risky_labels[fill_i % len(risky_labels)]
                fill_i += 1

        stem = f"Tower hazards hit '{task_title}'. Choose the ledge that respects {keyword_l} validation."
        instruction = f"Select the ledge that advances you upward while keeping {keyword_l} gates intact."
        return {
            "stem": stem,
            "instruction": instruction,
            "options": options,
            "correct_index": correct_index,
            "game": {
                "kind": "tower_climb",
                "towerW": towerW,
                "towerH": towerH,
                "hero": hero,
                "goal": {"x": baseX, "y": goalY},
                "ledgeOptions": v["ledgeOptions"],  # length 4
            },
            "focus_terms": [],
        }
    else:
        options = [
            f"Secure and validate {keyword_l}",
            f"Bypass validation for {keyword_l}",
            f"Postpone {keyword_l} without tracking",
            f"Use ad-hoc approach for {keyword_l}",
        ]
        correct_index = 0
        stem = f"Timed decision for '{task_title}': what should you do first?"
        instruction = "Pick the safest high-impact action."

    return {
        "stem": stem,
        "instruction": instruction,
        "options": options,
        "correct_index": correct_index,
    }


def _extract_focus_terms(*texts: str) -> list[str]:
    joined = " ".join([str(t or "") for t in texts]).lower()
    tokens = re.findall(r"[a-zA-Z]{4,}", joined)
    stop = {
        "with", "from", "that", "this", "your", "game", "design", "project",
        "flow", "user", "users", "task", "tasks", "section", "should", "will",
        "have", "been", "into", "about", "spec", "kpis", "risk", "risks",
    }
    ranked = []
    seen = set()
    for token in tokens:
        if token in stop:
            continue
        if token not in seen:
            seen.add(token)
            ranked.append(token)
    return ranked[:8] or ["security", "progress", "engagement"]


def _score_keywords(text: str, keywords: list[str]) -> int:
    lower = text.lower()
    return sum(1 for k in keywords if k in lower)


def _derive_spec_profile(spec: Spec) -> dict:
    sections = spec.sections or {}
    rewards = str(sections.get("s08::Rewards and Incentives", "") or "")
    social = str(sections.get("s10::Social Interaction Design", "") or "")
    gameplay = str(sections.get("s13::Detailed Gameplay Flow", "") or "")
    kpis = str(sections.get("s18::Assessment Framework and KPIs", "") or "")
    risks = str(sections.get("s21::Implementation Risks", "") or "")
    data_coll = str(sections.get("s22::Data Collection and Feedback", "") or "")

    full = " ".join([rewards, social, gameplay, kpis, risks, data_coll]).lower()

    collaboration_score = _score_keywords(full, ["team", "peer", "group", "guild", "collaboration"])
    risk_score = _score_keywords(full, ["risk", "threat", "security", "failure", "incident", "deadline"])
    analytics_score = _score_keywords(full, ["kpi", "metric", "dashboard", "measurement", "analytics"])
    progression_score = _score_keywords(full, ["level", "tier", "progression", "milestone", "journey"])
    competition_score = _score_keywords(full, ["leaderboard", "ranking", "competition", "versus", "scoreboard"])
    reward_score = _score_keywords(full, ["badge", "reward", "incentive", "bonus", "achievement"])
    terrain_score = _score_keywords(full, ["maze", "labyrinth", "obstacle", "climb", "platform", "terrain", "path", "river"])
    platform_score = _score_keywords(full, ["platform", "ledge", "jump", "run", "runner", "speed"])
    dodge_score = _score_keywords(full, ["dodge", "evade", "runner", "obstacle", "hazard", "projectile"])
    tower_score = _score_keywords(full, ["tower", "ladder", "stairs", "climb", "height", "summit"])

    mission_complexity = max(1, min(5, 1 + (risk_score + analytics_score + progression_score) // 3))
    timer_pressure = max(0.75, 1.2 - (risk_score * 0.06))
    energy_pressure = max(0.8, min(1.5, 1 + (competition_score + progression_score) * 0.05))
    xp_multiplier = max(0.9, min(2.0, 1 + (reward_score + analytics_score) * 0.07))

    return {
        "collaboration_score": collaboration_score,
        "risk_score": risk_score,
        "analytics_score": analytics_score,
        "progression_score": progression_score,
        "competition_score": competition_score,
        "reward_score": reward_score,
        "terrain_score": terrain_score,
        "platform_score": platform_score,
        "dodge_score": dodge_score,
        "tower_score": tower_score,
        "mission_complexity": mission_complexity,
        "timer_pressure": round(timer_pressure, 2),
        "energy_pressure": round(energy_pressure, 2),
        "xp_multiplier": round(xp_multiplier, 2),
        "focus_terms": _extract_focus_terms(rewards, social, gameplay, kpis, risks, data_coll),
    }


def _mission_type_pool(profile: dict) -> list[str]:
    pool = ["timed_choice", "quiz", "sequence"]
    if profile["collaboration_score"] > 0:
        pool.extend(["team_vote"] * min(3, profile["collaboration_score"]))
    if profile["risk_score"] > 0:
        pool.extend(["risk_response"] * min(3, profile["risk_score"]))
    if profile["analytics_score"] > 1:
        pool.append("quiz")
    if profile.get("terrain_score", 0) > 0:
        pool.extend(["maze_escape"] * min(3, profile["terrain_score"]))
    if profile.get("platform_score", 0) > 0:
        pool.extend(["platformer_run"] * min(3, profile["platform_score"]))
    if profile.get("dodge_score", 0) > 0:
        pool.extend(["dodge_runner"] * min(3, profile["dodge_score"]))
    if profile.get("tower_score", 0) > 0:
        pool.extend(["tower_climb"] * min(3, profile["tower_score"]))
    return pool


def _mission_type_plan(profile: dict, task_count: int) -> list[str]:
    # Spec'e göre belirli türleri öncelikli sırada yerleştiriyoruz.
    # Amaç: kullanıcı görev sırasına baktığında "farklı oyunlar" net görsün.
    maze_ok = profile.get("terrain_score", 0) > 0
    platform_ok = profile.get("platform_score", 0) > 0
    dodge_ok = profile.get("dodge_score", 0) > 0
    tower_ok = profile.get("tower_score", 0) > 0
    risk_ok = profile.get("risk_score", 0) > 0
    team_ok = profile.get("collaboration_score", 0) > 0

    desired = [
        "quiz",  # 1. görev: bilgi/temel
        "maze_escape" if maze_ok else None,  # 2. görev: 2D obstacle
        "tower_climb" if tower_ok else None,  # 3. görev: vertical climb
        "platformer_run" if platform_ok else None,  # 4. görev: platforming
        "dodge_runner" if dodge_ok else None,  # 5. görev: dodging runner
        "sequence",  # core loop/plan
        "risk_response" if risk_ok else None,  # spec risk teması
        "team_vote" if team_ok else None,  # spec collaboration teması
        "timed_choice",  # core pressure
    ]

    template = [x for x in desired if x]
    if not template:
        template = ["quiz", "sequence", "timed_choice"]

    # task_count küçük olsa bile, sıralamayı döngüyle doldur.
    return [template[i % len(template)] for i in range(max(1, task_count))]


def _build_game_config(spec: Spec) -> dict:
    sections = spec.sections or {}
    title = str(spec.title or "")
    rewards = str(sections.get("s08::Rewards and Incentives", "") or "")
    social = str(sections.get("s10::Social Interaction Design", "") or "")
    gameplay_flow = str(sections.get("s13::Detailed Gameplay Flow", "") or "")
    kpis = str(sections.get("s18::Assessment Framework and KPIs", "") or "")
    risks = str(sections.get("s21::Implementation Risks", "") or "")

    base_tasks, tasks_from_spec = _extract_tasks_from_spec(spec)
    has_leaderboard = _flag_from_text(rewards + " " + social, ["leaderboard", "ranking", "scoreboard"])
    has_badges = _flag_from_text(rewards, ["badge", "rozet", "achievement"])
    has_levels = _flag_from_text(rewards + " " + gameplay_flow, ["level", "progression", "tier"])
    has_teamplay = _flag_from_text(social, ["team", "peer", "collaboration", "guild"])
    has_kpi_tracking = _flag_from_text(kpis, ["kpi", "metric", "retention", "completion"])
    has_risk_pressure = _flag_from_text(risks, ["risk", "failure", "security", "deadline"])
    profile = _derive_spec_profile(spec)

    game_modes = []
    if has_levels:
        game_modes.append("points_levels_progression")
    if has_leaderboard:
        game_modes.append("competition_mode")
    if has_badges:
        game_modes.append("rewards_badges")
    if has_teamplay:
        game_modes.append("team_challenges")
    if not game_modes:
        game_modes.append("core_progression")

    # Spec'e uygun oyun çeşitliliğini görev sırasına bağla.
    task_count = len(base_tasks) if isinstance(base_tasks, list) else 0
    mission_types = _mission_type_plan(profile, task_count)

    missions = []
    for idx, task in enumerate(base_tasks, start=1):
        mission_type = mission_types[idx - 1] if idx - 1 < len(mission_types) else mission_types[0]
        raw_difficulty = 1 + math.floor((idx - 1) / 2) + (profile["mission_complexity"] - 1)
        difficulty = min(5, max(1, raw_difficulty))
        time_limit = max(6, int((20 - (difficulty * 2)) * profile["timer_pressure"]))
        xp_reward = int(task["xp"] * (1 + (difficulty - 1) * 0.12) * profile["xp_multiplier"])
        energy_cost = min(26, max(4, int((6 + difficulty * 2) * profile["energy_pressure"])))
        required = idx - 1 if idx > 1 else None

        # Make each mission a small 4-step “mini run”.
        # - root question fields (stem/options/correct_index) are kept for backward compatibility
        # - full step list is used by the popup mini-game
        step_count = 4
        steps: list[dict] = []
        for step_i in range(step_count):
            q = _build_question(task["title"], mission_type, idx + step_i)
            q["focus_terms"] = profile["focus_terms"][:3]
            q["instruction"] = f"{q['instruction']} Focus on: {', '.join(q['focus_terms'])}."
            steps.append(q)

        root_q = steps[0] if steps else _build_question(task["title"], mission_type, idx)
        question = {
            "stem": root_q["stem"],
            "instruction": root_q["instruction"],
            "options": root_q["options"],
            "correct_index": root_q["correct_index"],
            "focus_terms": root_q.get("focus_terms", []),
            "steps": steps,
            "step_count": step_count,
        }

        missions.append({
            "id": idx,
            "title": task["title"],
            "type": mission_type,
            "difficulty": difficulty,
            "time_limit_sec": time_limit,
            "xp_reward": xp_reward,
            "energy_cost": energy_cost,
            "required_mission_id": required,
            "question": question,
            "rules": {
                "xp_multiplier": profile["xp_multiplier"],
                "timer_pressure": profile["timer_pressure"],
                "energy_pressure": profile["energy_pressure"],
                "streak_bonus_step": 0.1 if profile["progression_score"] > 0 else 0.08,
                "failure_energy_penalty": 3 if profile["risk_score"] > 1 else 1,
                "success_energy_regen": 5 if profile["reward_score"] > 1 else 4,
                "failure_energy_regen": 2,
            },
        })

    flags_dict = {
        "leaderboard": has_leaderboard,
        "badges": has_badges,
        "levels": has_levels,
        "teamplay": has_teamplay,
        "kpi_tracking": has_kpi_tracking,
        "risk_pressure": has_risk_pressure,
    }

    return {
        "spec_id": spec.id,
        "spec_title": title,
        "game_modes": game_modes,
        "flags": flags_dict,
        "profile": profile,
        "missions": missions,
        "lab_context": _build_lab_context(spec, profile, flags_dict, len(missions), tasks_from_spec),
    }


def _ensure_unlocked_missions(state: dict, missions: list[dict]) -> None:
    unlocked = set(state.get("missions_unlocked", []))
    completed = set(state.get("completed_task_ids", []))
    for mission in missions:
        required = mission.get("required_mission_id")
        if required is None or required in completed:
            unlocked.add(mission["id"])
    state["missions_unlocked"] = sorted(unlocked)


def _state_view(state: dict) -> dict:
    return {
        "xp": state["xp"],
        "level": state["level"],
        "tasks_completed": state["tasks_completed"],
        "badges": state["badges"],
        "completed_task_ids": state["completed_task_ids"],
        "streak": state["streak"],
        "combo_multiplier": state["combo_multiplier"],
        "energy": state["energy"],
        "active_mission_id": state["active_mission_id"],
        "active_mission_step_index": state.get("active_mission_step_index", 0),
        "active_mission_step_deducted_energy": state.get("active_mission_step_deducted_energy", False),
        "missions_started": state["missions_started"],
        "missions_unlocked": state["missions_unlocked"],
        "last_outcome": state["last_outcome"],
    }


def _season_info(now: datetime | None = None) -> dict:
    now = now or datetime.utcnow()
    week = now.isocalendar().week
    season_id = f"{now.year}-W{week:02d}"
    return {"id": season_id, "year": now.year, "week": week}


def _league_for_xp(xp: int) -> str:
    if xp >= 1200:
        return "Diamond"
    if xp >= 800:
        return "Platinum"
    if xp >= 500:
        return "Gold"
    if xp >= 250:
        return "Silver"
    return "Bronze"


class MissionSubmit(BaseModel):
    selected_index: int
    elapsed_sec: float | None = None


class MissionStepSubmit(BaseModel):
    selected_index: int
    elapsed_sec: float | None = None


@router.get("/tasks/by-spec/{spec_id}")
def get_tasks_by_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    tasks, _ = _extract_tasks_from_spec(spec)
    return {
        "spec_id": spec.id,
        "spec_title": spec.title,
        "tasks": tasks,
    }


@router.get("/game/by-spec/{spec_id}/{player_id}")
def get_game_by_spec(spec_id: int, player_id: str, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    config = _build_game_config(spec)
    key = f"spec:{spec_id}:{player_id}"
    state = player_states[key]
    _ensure_unlocked_missions(state, config["missions"])
    season = _season_info()
    league = _league_for_xp(state["xp"])
    return {
        "game": config,
        "state": _state_view(state),
        "season": season,
        "league": league,
    }


@router.post("/game/by-spec/{spec_id}/{player_id}/start/{mission_id}")
def start_mission(spec_id: int, player_id: str, mission_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    config = _build_game_config(spec)
    mission = next((m for m in config["missions"] if m["id"] == mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    key = f"spec:{spec_id}:{player_id}"
    state = player_states[key]
    _ensure_unlocked_missions(state, config["missions"])

    if mission_id not in state["missions_unlocked"]:
        req = mission.get("required_mission_id")
        if req is not None:
            raise HTTPException(
                status_code=400,
                detail=f"Mission {mission_id} is locked — complete mission {req} first.",
            )
        raise HTTPException(status_code=400, detail="Mission is locked")
    if mission_id in state["completed_task_ids"]:
        raise HTTPException(status_code=400, detail="Mission already completed")
    # Energy is charged on first step (submit-step) or on submit (single-shot), not here — avoids 400 on start when the player is unlocked but still recharging after prior missions.

    adaptive_time_limit = max(6, mission["time_limit_sec"] - max(0, state["level"] - 1))
    step_count = len(mission.get("question", {}).get("steps", []) or []) or int(mission.get("question", {}).get("step_count", 4))
    state["preview_time_scale"] = 1.0
    state["preview_step_streak"] = 0
    base_step = max(6, int(adaptive_time_limit / step_count)) if step_count else adaptive_time_limit
    adaptive_step_time_limit = max(4, int(round(base_step * float(state.get("preview_time_scale", 1.0)))))
    mission_with_runtime = dict(mission)
    mission_with_runtime["adaptive_time_limit_sec"] = adaptive_time_limit
    mission_with_runtime["adaptive_step_time_limit_sec"] = adaptive_step_time_limit

    state["active_mission_id"] = mission_id
    state["active_mission_step_index"] = 0
    state["active_mission_step_deducted_energy"] = False
    if mission_id not in state["missions_started"]:
        state["missions_started"].append(mission_id)
    state["last_outcome"] = "started"

    return {
        "mission": mission_with_runtime,
        "state": _state_view(state),
    }


@router.post("/game/by-spec/{spec_id}/{player_id}/submit/{mission_id}")
def submit_mission(
    spec_id: int,
    player_id: str,
    mission_id: int,
    payload: MissionSubmit,
    db: Session = Depends(get_db),
):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    config = _build_game_config(spec)
    mission = next((m for m in config["missions"] if m["id"] == mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    key = f"spec:{spec_id}:{player_id}"
    state = player_states[key]
    _ensure_unlocked_missions(state, config["missions"])

    if state["active_mission_id"] != mission_id:
        raise HTTPException(status_code=400, detail="Mission is not active")

    mission_rules = mission.get("rules", {})
    cost = int(mission["energy_cost"])
    if state["energy"] < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough energy (need {cost}, have {state['energy']}).",
        )
    state["energy"] = state["energy"] - cost
    elapsed = payload.elapsed_sec if payload.elapsed_sec is not None else mission["time_limit_sec"]
    adaptive_time_limit = max(6, mission["time_limit_sec"] - max(0, state["level"] - 1))
    question = mission["question"]
    is_correct = payload.selected_index == question["correct_index"]
    in_time = elapsed <= adaptive_time_limit
    success = is_correct and in_time

    earned_xp = 0
    level_before = state["level"]
    badges_before = set(state["badges"])
    if success and mission_id not in state["completed_task_ids"]:
        speed_bonus = 1.15 if elapsed <= adaptive_time_limit * 0.5 else 1.0
        earned_xp = int(mission["xp_reward"] * state["combo_multiplier"] * speed_bonus)
        state["xp"] += earned_xp
        state["tasks_completed"] += 1
        state["completed_task_ids"].append(mission_id)
        state["streak"] += 1
        streak_step = float(mission_rules.get("streak_bonus_step", 0.1))
        state["combo_multiplier"] = min(2.5, round(1 + (state["streak"] * streak_step), 2))

        while state["xp"] >= state["level"] * 120:
            state["level"] += 1

        if state["tasks_completed"] >= 3 and "Achievement Badge" not in state["badges"]:
            state["badges"].append("Achievement Badge")
        if state["streak"] >= 4 and "Hot Streak" not in state["badges"]:
            state["badges"].append("Hot Streak")
        if state["level"] >= 3 and "Level Climber" not in state["badges"]:
            state["badges"].append("Level Climber")

        state["last_outcome"] = "success"
    else:
        state["streak"] = 0
        state["combo_multiplier"] = 1.0
        state["energy"] = max(0, state["energy"] - int(mission_rules.get("failure_energy_penalty", 1)))
        state["last_outcome"] = "failed"

    _ensure_unlocked_missions(state, config["missions"])
    state["active_mission_id"] = None
    if success:
        state["energy"] = min(100, state["energy"] + int(mission_rules.get("success_energy_regen", 4)))
    else:
        state["energy"] = min(100, state["energy"] + int(mission_rules.get("failure_energy_regen", 2)))
    level_up = state["level"] > level_before
    unlocked_badges = [b for b in state["badges"] if b not in badges_before]
    season = _season_info()
    league = _league_for_xp(state["xp"])
    correct_option = question["options"][question["correct_index"]]
    selected_option = question["options"][payload.selected_index] if 0 <= payload.selected_index < len(question["options"]) else None

    return {
        "ok": True,
        "success": success,
        "earned_xp": earned_xp,
        "level_up": level_up,
        "unlocked_badges": unlocked_badges,
        "correct_option": correct_option,
        "selected_option": selected_option,
        "explanation": "Correct choices prioritize measurable, safe, and structured execution.",
        "adaptive_time_limit_sec": adaptive_time_limit,
        "season": season,
        "league": league,
        "state": _state_view(state),
    }


@router.post("/game/by-spec/{spec_id}/{player_id}/submit-step/{mission_id}")
def submit_mission_step(
    spec_id: int,
    player_id: str,
    mission_id: int,
    payload: MissionStepSubmit,
    db: Session = Depends(get_db),
):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    config = _build_game_config(spec)
    mission = next((m for m in config["missions"] if m["id"] == mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    key = f"spec:{spec_id}:{player_id}"
    state = player_states[key]
    _ensure_unlocked_missions(state, config["missions"])

    if state["active_mission_id"] != mission_id:
        raise HTTPException(status_code=400, detail="Mission is not active")

    mission_rules = mission.get("rules", {})
    steps = mission.get("question", {}).get("steps", []) or []
    step_count = len(steps) if steps else int(mission.get("question", {}).get("step_count", 4))
    if step_count <= 0:
        step_count = 4
        steps = steps or [mission.get("question", {})]  # fallback

    current_step_index = int(state.get("active_mission_step_index", 0))
    current_step_index = max(0, min(current_step_index, step_count - 1))
    step_question = steps[current_step_index]

    # Adaptive time per mission step (consistent with start_mission), scaled by recent step performance
    adaptive_time_limit = max(6, mission["time_limit_sec"] - max(0, state["level"] - 1))
    base_step = max(6, int(adaptive_time_limit / step_count)) if step_count else adaptive_time_limit
    scale = float(state.get("preview_time_scale", 1.0))
    adaptive_step_time_limit = max(4, int(round(base_step * scale)))

    elapsed = payload.elapsed_sec if payload.elapsed_sec is not None else adaptive_step_time_limit
    selected_index = payload.selected_index

    # Deduct mission energy cost only once (on the first step attempt)
    if not state.get("active_mission_step_deducted_energy", False):
        cost = int(mission["energy_cost"])
        if state["energy"] < cost:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough energy (need {cost}, have {state['energy']}).",
            )
        state["energy"] = state["energy"] - cost
        state["active_mission_step_deducted_energy"] = True

    in_time = elapsed <= adaptive_step_time_limit
    is_correct = selected_index == int(step_question.get("correct_index", -999))
    step_success = is_correct and in_time

    earned_xp = 0
    level_before = state["level"]
    badges_before = set(state["badges"])
    unlocked_badges = []
    level_up = False

    correct_option = step_question["options"][step_question["correct_index"]] if "options" in step_question and "correct_index" in step_question else None
    options = step_question.get("options", []) or []
    selected_option = options[selected_index] if 0 <= selected_index < len(options) else None

    mission_complete = False

    if step_success:
        # advance to next step; on last step convert to mission completion
        next_step_index = current_step_index + 1
        if next_step_index >= step_count:
            mission_complete = True
            speed_bonus = 1.15 if elapsed <= adaptive_step_time_limit * 0.5 else 1.0

            if mission_id not in state["completed_task_ids"]:
                earned_xp = int(mission["xp_reward"] * state["combo_multiplier"] * speed_bonus)
                state["xp"] += earned_xp
                state["tasks_completed"] += 1
                state["completed_task_ids"].append(mission_id)
                state["streak"] += 1

                streak_step = float(mission_rules.get("streak_bonus_step", 0.1))
                state["combo_multiplier"] = min(2.5, round(1 + (state["streak"] * streak_step), 2))

                while state["xp"] >= state["level"] * 120:
                    state["level"] += 1

                if state["tasks_completed"] >= 3 and "Achievement Badge" not in state["badges"]:
                    state["badges"].append("Achievement Badge")
                if state["streak"] >= 4 and "Hot Streak" not in state["badges"]:
                    state["badges"].append("Hot Streak")
                if state["level"] >= 3 and "Level Climber" not in state["badges"]:
                    state["badges"].append("Level Climber")

            state["last_outcome"] = "success"
            state["active_mission_id"] = None
            state["active_mission_step_index"] = 0
            state["active_mission_step_deducted_energy"] = False
            _ensure_unlocked_missions(state, config["missions"])
            state["energy"] = min(100, state["energy"] + int(mission_rules.get("success_energy_regen", 4)))

            level_up = state["level"] > level_before
            unlocked_badges = [b for b in state["badges"] if b not in badges_before]
        else:
            state["active_mission_step_index"] = next_step_index
            state["last_outcome"] = "step_success"
    else:
        # reset the mini-run progress on any wrong step
        state["active_mission_step_index"] = 0
        state["streak"] = 0
        state["combo_multiplier"] = 1.0
        state["energy"] = max(0, state["energy"] - int(mission_rules.get("failure_energy_penalty", 1)))
        state["last_outcome"] = "failed"

    # Next-step preview timer: consecutive correct steps tighten the budget; failures loosen it.
    if step_success:
        if not mission_complete:
            st = int(state.get("preview_step_streak", 0)) + 1
            state["preview_step_streak"] = st
            if st >= 2:
                state["preview_time_scale"] = max(0.72, float(state.get("preview_time_scale", 1.0)) * 0.94)
    else:
        state["preview_step_streak"] = 0
        state["preview_time_scale"] = min(1.2, float(state.get("preview_time_scale", 1.0)) * 1.06)

    next_scale = float(state.get("preview_time_scale", 1.0))
    next_adaptive_step_limit = max(4, int(round(base_step * next_scale)))

    season = _season_info()
    league = _league_for_xp(state["xp"])

    return {
        "ok": True,
        "step_success": step_success,
        "mission_complete": mission_complete,
        "earned_xp": earned_xp,
        "level_up": level_up,
        "unlocked_badges": unlocked_badges,
        "correct_option": correct_option,
        "selected_option": selected_option,
        "explanation": "Correct choices prioritize measurable, safe, and structured execution.",
        "adaptive_step_time_limit_sec": next_adaptive_step_limit,
        "next_step_index": int(state.get("active_mission_step_index", 0)),
        "season": season,
        "league": league,
        "state": _state_view(state),
    }


@router.get("/state/by-spec/{spec_id}/{player_id}")
def get_state_by_spec(spec_id: int, player_id: str, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    key = f"spec:{spec_id}:{player_id}"
    return player_states[key]


@router.post("/complete/by-spec/{spec_id}/{player_id}/{task_id}")
def complete_task_by_spec(spec_id: int, player_id: str, task_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    tasks, _ = _extract_tasks_from_spec(spec)
    task = next((t for t in tasks if t["id"] == task_id), None)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    key = f"spec:{spec_id}:{player_id}"
    state = player_states[key]

    if task_id in state["completed_task_ids"]:
        return {
            "message": "task already completed",
            "state": state
        }

    state["xp"] += task["xp"]
    state["tasks_completed"] += 1
    state["completed_task_ids"].append(task_id)

    while state["xp"] >= state["level"] * 100:
        state["level"] += 1

    rewards_text = str((spec.sections or {}).get("s08::Rewards and Incentives", "") or "").lower()

    if ("badge" in rewards_text or "rozet" in rewards_text) and state["tasks_completed"] >= 3 and "Achievement Badge" not in state["badges"]:
        state["badges"].append("Achievement Badge")

    if "leaderboard" in rewards_text and state["tasks_completed"] >= 5 and "Leaderboard Climber" not in state["badges"]:
        state["badges"].append("Leaderboard Climber")

    return {
        "message": "task completed",
        "state": state
    }


@router.get("/leaderboard/by-spec/{spec_id}")
def leaderboard_by_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    rows = []

    for key, value in player_states.items():
        if key.startswith(f"spec:{spec_id}:"):
            player_id = key.split(":", 2)[2]
            rows.append({
                "player_id": player_id,
                "xp": value["xp"],
                "level": value["level"],
                "tasks_completed": value["tasks_completed"],
                "badges": value["badges"],
            })

    rows.sort(key=lambda x: x["xp"], reverse=True)
    return rows
