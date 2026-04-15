"""
GamifyOnt-aligned *heuristic* checks for generated spec text.

This is not a full OWL reasoner: it scores keyword / phrase overlap against
HEXAD user types (Marczewski-style) and coarse MDA buckets so the LLM output
can be surfaced to authors before ontology export / validation.
"""

from __future__ import annotations

import re
from typing import Any

from app.services.design_framework_signals import analyze_design_frameworks
from app.services.theory_signals import analyze_theory_signals

# HEXAD (Marczewski): six types commonly used in enterprise gamification
HEXAD_KEYWORDS: dict[str, list[str]] = {
    "Achiever": [
        "goal", "goals", "mastery", "complete", "completion", "progress", "level", "levels",
        "badge", "badges", "achievement", "kpi", "metric", "skill", "certificate", "rank up",
        "challenge", "objective", "criteria", "milestone",
    ],
    "Player": [
        "reward", "points", "prize", "incentive", "bonus", "compensation", "collect", "currency",
        "exchange", "loot", "perk", "benefit",
    ],
    "Socializer": [
        "team", "peer", "collaboration", "social", "share", "community", "guild", "group",
        "together", "network", "discussion", "forum", "mentor",
    ],
    "Free Spirit": [
        "explore", "choice", "autonomy", "custom", "personal", "path", "optional", "branch",
        "creative", "sandbox", "self-directed", "discover",
    ],
    "Philanthropist": [
        "purpose", "impact", "contribute", "help others", "altru", "donat", "volunteer",
        "sustainab", "mission-driven", "values", "cause",
    ],
    "Disruptor": [
        "change", "disrupt", "innovat", "experiment", "hack", "shortcut", "rule-break",
        "challenge status", "subvert", "rebel",
    ],
}

# Coarse MDA coverage (mechanics / dynamics / aesthetics) via lexical cues
MDA_BUCKETS: dict[str, list[str]] = {
    "mechanics": [
        "rule", "rules", "point", "badge", "level", "quest", "task", "timer", "constraint",
        "unlock", "energy", "streak", "combo", "leaderboard",
    ],
    "dynamics": [
        "emerg", "competition", "cooperat", "collaborat", "pressure", "motivation", "flow",
        "feedback loop", "balance", "progression", "narrative tension",
    ],
    "aesthetics": [
        "fun", "challenge", "fantasy", "expression", "discovery", "submission", "sensation",
        "immersion", "story", "delight", "experience",
    ],
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _count_hits(norm: str, keywords: list[str]) -> tuple[int, list[str]]:
    hits: list[str] = []
    for kw in keywords:
        if kw in norm:
            hits.append(kw)
    return len(hits), hits


def score_hexad(norm: str) -> dict[str, Any]:
    scores: dict[str, dict[str, Any]] = {}
    for name, kws in HEXAD_KEYWORDS.items():
        n_hits, hits = _count_hits(norm, kws)
        # Normalize to 0..1 (cap at ~8 hits)
        score = min(1.0, n_hits / 6.0)
        scores[name] = {
            "score": round(score, 3),
            "hit_count": n_hits,
            "matched_keywords": hits[:12],
        }
    ranked = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
    primary = ranked[0][0] if ranked else None
    return {"by_type": scores, "primary_guess": primary}


def score_mda(norm: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for bucket, kws in MDA_BUCKETS.items():
        n_hits, hits = _count_hits(norm, kws)
        out[bucket] = {
            "score": round(min(1.0, n_hits / 5.0), 3),
            "matched_keywords": hits[:10],
        }
    notes: list[str] = []
    if out["mechanics"]["score"] < 0.2:
        notes.append("Few explicit mechanics (points, rules, quests) — consider naming concrete game elements.")
    if out["dynamics"]["score"] < 0.15:
        notes.append("Dynamics (how players interact, compete, or cooperate) are thin — add one emergent loop.")
    if out["aesthetics"]["score"] < 0.15:
        notes.append("Aesthetic / experience goals (challenge, story, fun) are weak — tie mechanics to felt outcomes.")
    return {"buckets": out, "notes": notes}


def analyze_alignment(text: str, target_hexad: str | None = None) -> dict[str, Any]:
    norm = _normalize(text)
    hexad = score_hexad(norm)
    mda = score_mda(norm)
    warnings: list[str] = []
    key: str | None = None

    if target_hexad:
        tt = target_hexad.strip()
        # Case-insensitive match to known types
        key = next((k for k in HEXAD_KEYWORDS if k.lower() == tt.lower()), None)
        if key:
            tscore = hexad["by_type"][key]["score"]
            if tscore < 0.25:
                warnings.append(
                    f"Target HEXAD type “{key}” is weakly supported in this draft (score {tscore:.2f}). "
                    f"Add vocabulary aligned with {key} (see matched vs missing signals in by_type)."
                )
            elif tscore < 0.45:
                warnings.append(
                    f"Draft partially aligns with “{key}” (score {tscore:.2f}); consider strengthening {key}-specific cues."
                )
        else:
            warnings.append(f"Unknown HEXAD target “{tt}”; known types: {', '.join(HEXAD_KEYWORDS)}.")

    # If primary guess conflicts with target
    if target_hexad and key and hexad.get("primary_guess"):
        pg = hexad["primary_guess"]
        if pg and pg != key and hexad["by_type"][pg]["score"] > hexad["by_type"][key]["score"] + 0.15:
            warnings.append(
                f"Strongest automatic signal is “{pg}”, not your target “{key}” — revise emphasis if intentional."
            )

    theory = analyze_theory_signals(text)
    design = analyze_design_frameworks(text, mda, theory.get("social_mix"))

    return {
        "hexad": hexad,
        "mda": mda,
        "warnings": warnings,
        "theory": theory,
        "design_frameworks": design,
        "method": "gamifyont_keyword_heuristic_v2",
    }


def analyze_spec_sections(sections: dict) -> dict[str, Any]:
    """Run full alignment + theory bundle on all section bodies (for export / reports)."""
    parts: list[str] = []
    for k, v in (sections or {}).items():
        if str(k).startswith("__"):
            continue
        parts.append(str(v or ""))
    blob = "\n\n".join(parts)
    return analyze_alignment(blob, None)
