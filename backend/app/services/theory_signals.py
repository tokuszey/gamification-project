"""
Heuristic SDT (Self-Determination Theory) and social-climate signals for spec text.

Used alongside GamifyOnt/HEXAD heuristics — not clinical psychology instrumentation.
"""

from __future__ import annotations

import re
from typing import Any

# Self-Determination Theory: basic psychological needs (Deci & Ryan)
SDT_KEYWORDS: dict[str, list[str]] = {
    "autonomy": [
        "autonomy", "choice", "choices", "self-direct", "self-determin", "voluntary", "opt-in", "opt in",
        "own pace", "personal goal", "custom path", "elective", "optional track", "agency", "empower",
        "flexible", "participant-led", "co-design",
    ],
    "competence": [
        "mastery", "skill", "skills", "feedback", "progress", "learning", "improve", "growth",
        "challenge", "scaffold", "assessment", "kpi", "proficiency", "capability", "training outcome",
        "measurable improvement", "level up", "certificate",
    ],
    "relatedness": [
        "team", "peer", "peers", "belong", "community", "together", "relationship", "support",
        "collaboration", "mentor", "buddy", "social", "trust", "inclusion", "group", "cohort",
    ],
}

COMPETITION_KWS = [
    "compete", "competition", "competitive", "rival", "versus", "vs.", "winner", "losers",
    "leaderboard", "ranking", "rank ", "tournament", "head-to-head", "beat", "top seller",
    "sales contest", "zero-sum",
]

COLLABORATION_KWS = [
    "collaborat", "cooperat", "co-op", "team goal", "shared goal", "collective", "guild",
    "together we", "joint", "cross-functional", "pair", "squad", "mutual support", "win-win",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _hits(norm: str, kws: list[str]) -> tuple[int, list[str]]:
    found: list[str] = []
    for kw in kws:
        if kw in norm:
            found.append(kw)
    return len(found), found


def score_sdt(norm: str) -> dict[str, Any]:
    by_need: dict[str, dict[str, Any]] = {}
    for need, kws in SDT_KEYWORDS.items():
        n, hits = _hits(norm, kws)
        score = min(1.0, n / 5.0)
        by_need[need] = {"score": round(score, 3), "hit_count": n, "matched_keywords": hits[:10]}
    return {"by_need": by_need}


def sdt_support_tags(by_need: dict[str, dict[str, Any]], min_score: float = 0.22) -> dict[str, list[str]]:
    """Bilingual tags for UI and export."""
    labels = {
        "autonomy": (
            "This scenario supports Autonomy needs (Self-Determination Theory).",
            "Bu senaryo Özerklik ihtiyacını destekliyor (Öz-Belirleme Kuramı / SDT).",
        ),
        "competence": (
            "This scenario supports Competence needs (Self-Determination Theory).",
            "Bu senaryo Yeterlik ihtiyacını destekliyor (SDT).",
        ),
        "relatedness": (
            "This scenario supports Relatedness needs (Self-Determination Theory).",
            "Bu senaryo İlişkililik ihtiyacını destekliyor (SDT).",
        ),
    }
    en: list[str] = []
    tr: list[str] = []
    for need, (e, t) in labels.items():
        sc = by_need.get(need, {}).get("score") or 0
        if sc >= min_score:
            en.append(e)
            tr.append(t)
    return {"en": en, "tr": tr}


def competition_collaboration_mix(norm: str) -> dict[str, Any]:
    c_count, c_kw = _hits(norm, COMPETITION_KWS)
    co_count, co_kw = _hits(norm, COLLABORATION_KWS)
    total = c_count + co_count
    if total == 0:
        return {
            "competition_percent": 50,
            "collaboration_percent": 50,
            "competition_hits": 0,
            "collaboration_hits": 0,
            "note": "Insufficient competition/collaboration cues — defaulting to 50/50 for reporting.",
        }
    c_pct = round(100 * c_count / total)
    co_pct = 100 - c_pct
    return {
        "competition_percent": c_pct,
        "collaboration_percent": co_pct,
        "competition_hits": c_count,
        "collaboration_hits": co_count,
        "note": None,
    }


def analyze_theory_signals(text: str) -> dict[str, Any]:
    norm = _normalize(text)
    sdt = score_sdt(norm)
    tags = sdt_support_tags(sdt["by_need"])
    mix = competition_collaboration_mix(norm)
    summary_en = (
        f"This gamification design (lexical scan) reads approximately {mix['competition_percent']}% "
        f"competition-oriented and {mix['collaboration_percent']}% collaboration-oriented."
    )
    summary_tr = (
        f"Bu oyunlaştırma tasarımı (metin taraması) yaklaşık %{mix['competition_percent']} rekabet, "
        f"%{mix['collaboration_percent']} işbirliği sinyalleri içeriyor."
    )
    return {
        "sdt": sdt,
        "sdt_support_tags_en": tags["en"],
        "sdt_support_tags_tr": tags["tr"],
        "social_mix": mix,
        "summary_en": summary_en,
        "summary_tr": summary_tr,
        "method": "sdt_keyword_heuristic_v1",
    }
