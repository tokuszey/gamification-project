"""
Bartle, Flow (Csikszentmihalyi-style cues), Octalysis (8 core drives) — lexical heuristics.
Co-pilot hints combine these with existing MDA/SDT-style signals.
"""

from __future__ import annotations

import re
from typing import Any

from app.services.theory_signals import _hits, _normalize  # reuse

BARTLE_KEYWORDS: dict[str, list[str]] = {
    "Bartle_Achiever": ["achievement", "complete", "completion", "points", "level", "badge", "score", "unlock", "progress", "milestone"],
    "Bartle_Explorer": ["explore", "discover", "map", "lore", "hidden", "easter", "sandbox", "experiment", "branch"],
    "Bartle_Socializer": ["social", "chat", "guild", "team", "together", "community", "mentor", "relationship", "trust"],
    "Bartle_Killer": ["compete", "versus", "pvp", "rank", "leaderboard", "dominate", "win", "rival", "tournament"],
}

# Octalysis 8 core drives — keyword proxies (not a licensed framework implementation)
OCTALYSIS: dict[str, list[str]] = {
    "epic_meaning": ["purpose", "mission", "greater good", "impact", "contribute", "cause", "values"],
    "accomplishment": ["achievement", "progress", "mastery", "challenge", "level", "badge", "skill"],
    "creativity_feedback": ["create", "build", "custom", "feedback", "iterate", "design", "combo"],
    "ownership": ["inventory", "collect", "currency", "profile", "build your", "my ", "personalize"],
    "social_influence": ["mentor", "refer", "team", "vote", "group", "community", "share"],
    "scarcity_impatience": ["limited", "deadline", "countdown", "exclusive", "rare", "only", "last chance"],
    "unpredictability": ["random", "loot", "surprise", "mystery", "spin", "variable", "unknown"],
    "loss_avoidance": ["streak", "expire", "penalty", "lose", "demote", "miss out", "fomo"],
}

FLOW_KEYWORDS: dict[str, list[str]] = {
    "clear_goals": ["goal", "objective", "criteria", "success", "checkpoint", "definition of done"],
    "immediate_feedback": ["feedback", "instant", "real-time", "score", "hint", "correct", "incorrect"],
    "skill_challenge_balance": ["challenge", "difficulty", "adaptive", "scaffold", "zone", "flow", "appropriate"],
    "sense_of_control": ["choice", "autonomy", "control", "agency", "opt-in", "self-paced"],
}


def score_bartle(norm: str) -> dict[str, Any]:
    scores: dict[str, dict[str, Any]] = {}
    for name, kws in BARTLE_KEYWORDS.items():
        n, hits = _hits(norm, kws)
        scores[name] = {"score": round(min(1.0, n / 4.0), 3), "hit_count": n, "matched_keywords": hits[:8]}
    ranked = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
    return {"by_type": scores, "primary_guess": ranked[0][0] if ranked else None}


def score_octalysis(norm: str) -> dict[str, Any]:
    drives: dict[str, dict[str, Any]] = {}
    for name, kws in OCTALYSIS.items():
        n, hits = _hits(norm, kws)
        drives[name] = {"score": round(min(1.0, n / 3.0), 3), "matched_keywords": hits[:6]}
    # intrinsic-ish vs extrinsic-ish rough split
    intrinsic_keys = ("epic_meaning", "creativity_feedback", "ownership", "social_influence")
    extrinsic_keys = ("accomplishment", "scarcity_impatience", "unpredictability", "loss_avoidance")
    ins = sum(drives[k]["score"] for k in intrinsic_keys)
    exs = sum(drives[k]["score"] for k in extrinsic_keys)
    total = ins + exs or 1.0
    return {
        "drives": drives,
        "intrinsic_share": round(ins / total, 3),
        "extrinsic_share": round(exs / total, 3),
    }


def score_flow(norm: str) -> dict[str, Any]:
    parts: dict[str, dict[str, Any]] = {}
    for name, kws in FLOW_KEYWORDS.items():
        n, hits = _hits(norm, kws)
        parts[name] = {"score": round(min(1.0, n / 3.0), 3), "matched_keywords": hits[:6]}
    avg = sum(p["score"] for p in parts.values()) / max(1, len(parts))
    return {"dimensions": parts, "balance_index": round(avg, 3)}


def build_copilot_hints(
    flow: dict[str, Any],
    octalysis: dict[str, Any],
    mda: dict[str, Any],
    social_mix: dict[str, Any] | None = None,
) -> list[str]:
    hints: list[str] = []
    fd = flow.get("dimensions") or {}
    ch = (fd.get("skill_challenge_balance") or {}).get("score") or 0
    fb = (fd.get("immediate_feedback") or {}).get("score") or 0
    goals = (fd.get("clear_goals") or {}).get("score") or 0
    if ch > 0.35 and fb < 0.2:
        hints.append(
            "Flow risk: challenge cues are stronger than feedback cues — players may disengage without tight loops."
        )
    if ch > 0.4 and goals < 0.15:
        hints.append("Flow risk: goals are underspecified relative to challenge — clarify success criteria per task.")
    if (octalysis.get("extrinsic_share") or 0) > 0.62:
        hints.append(
            "Octalysis-style mix leans extrinsic (rewards, scarcity, loss avoidance) — balance with meaning / creativity signals."
        )
    if (octalysis.get("intrinsic_share") or 0) > 0.62:
        hints.append(
            "Strong intrinsic / meaning signals — ensure measurable business behaviors still appear in mechanics."
        )
    buckets = (mda.get("buckets") or {}) if isinstance(mda, dict) else {}
    if (buckets.get("dynamics") or {}).get("score", 0) < 0.12:
        hints.append("Co-pilot: dynamics layer is thin — add one concrete interaction loop (social, competitive, or cooperative).")
    if social_mix and (social_mix.get("competition_percent") or 0) > 70:
        hints.append("High competition lexical load — check fairness, opt-in, and non-zero-sum alternatives for mixed audiences.")
    return hints


def analyze_design_frameworks(text: str, mda: dict[str, Any], theory_social_mix: dict[str, Any] | None) -> dict[str, Any]:
    norm = _normalize(text)
    bartle = score_bartle(norm)
    octalysis = score_octalysis(norm)
    flow = score_flow(norm)
    hints = build_copilot_hints(flow, octalysis, mda, theory_social_mix)
    return {
        "bartle": bartle,
        "octalysis": octalysis,
        "flow": flow,
        "copilot_hints": hints,
        "method": "design_framework_keyword_v1",
    }
