"""
Workbook / Çalışma Kitabı runtime slice: learning objectives, gameplay tasks, leaderboard view, formative feedback.
Sources (in order): embedded JSON in spec sections, then synthesized from s03 + s13 (+ hints from s18/s20).
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.models.spec_model import GamificationSpec25, GameplayPhase


def _slug(text: str, salt: str = "") -> str:
    base = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")[:48] or "item"
    h = hashlib.sha256(f"{salt}:{text}".encode("utf-8", errors="ignore")).hexdigest()[:6]
    return f"{base}_{h}"


def _bullet_lines(text: str) -> list[str]:
    out: list[str] = []
    for line in (text or "").splitlines():
        s = re.sub(r"^[\-\*\d\.\)\s•]+", "", line.strip()).strip()
        if len(s) > 2:
            out.append(s[:500])
    return out


def _extract_embedded_workbook(sections: dict[str, str]) -> dict[str, Any] | None:
    """Detect a section body that is JSON with workbook keys (spec-style export)."""
    for _k, v in (sections or {}).items():
        if v is None:
            continue
        s = str(v).strip()
        if not s.startswith("{"):
            continue
        try:
            data = json.loads(s)
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(data, dict):
            continue
        if "core_learning_objectives" in data and "detailed_gameplay_flow" in data:
            return data
    return None


def _norm_category(raw: str | None) -> str:
    x = (raw or "").strip().lower()
    if x in ("social", "applied", "formative"):
        return x
    if any(w in x for w in ("team", "peer", "sosyal", "işbirliği", "collab")):
        return "social"
    if any(w in x for w in ("field", "deploy", "uygula", "saha", "apply", "pratik")):
        return "applied"
    return "formative"


def _infer_leaderboard_from_s20(text: str) -> dict[str, Any]:
    t = (text or "").lower()
    return {
        "mode": "mastery_tiers",
        "anonymize": "anon" in t or "anonim" in t or "hash" in t or True,
        "show_mastery_tiers": "mastery" in t or "tier" in t or "kademe" in t or True,
        "show_consistency_streaks": "streak" in t or "istikrar" in t or "seri" in t or True,
    }


def _infer_formative_from_s18(text: str) -> dict[str, Any]:
    return {
        "immediate_feedback": True,
        "diminishing_factor_per_retry": 0.78,
        "success_feedback": " Correct — progress applied toward your learning objective.",
        "retry_feedback": " On retries the gain multiplier decreases per the spec; read the hint.",
    }


def _synthesize_workbook(gspec: GamificationSpec25, phases: list[GameplayPhase]) -> dict[str, Any]:
    sec = gspec.sections or {}
    s03 = ""
    for k, v in sec.items():
        if "s03::" in k or "Core Learning Objectives" in k:
            s03 = str(v or "")
            break
    obj_lines = _bullet_lines(s03)
    if not obj_lines:
        obj_lines = [
            "Core competency alignment with the gameplay loop",
            "Risk-aware decision making",
            "Evidence-based reporting",
        ]
    objectives: list[dict[str, Any]] = []
    for i, line in enumerate(obj_lines[:12]):
        oid = f"LO{i + 1}"
        objectives.append(
            {
                "objective_id": oid,
                "title": line[:240],
                "description": "",
                "mastery_threshold": 120,
            }
        )

    ordered = sorted(phases or [], key=lambda p: p.order or 0)
    tasks: list[dict[str, Any]] = []
    prev_tid: str | None = None
    # Benzersiz task_id (aynı gameplay order tekrarında TASK_1 çakışmasını önler — UI'da satır kaybı).
    for i, p in enumerate(ordered[:20]):
        tid = f"FLOW_{i + 1:04d}"
        title = (p.title or f"Step {p.order}")[:240]
        desc = (p.description or "")[:500]
        cat = _infer_category_from_title(title + " " + desc)
        oid = objectives[i % len(objectives)]["objective_id"]
        prereq: list[str] = []
        if prev_tid:
            prereq.append(prev_tid)
        tasks.append(
            {
                "task_id": tid,
                "title": title,
                "description": desc,
                "prerequisite": prereq,
                "objective_id": oid,
                "quest_category": cat,
            }
        )
        prev_tid = tid

    s20 = gspec.section_contains("s20::") or gspec.section_contains("Leaderboard")
    s18 = gspec.section_contains("s18::") or gspec.section_contains("Assessment")
    return {
        "core_learning_objectives": objectives,
        "detailed_gameplay_flow": tasks,
        "leaderboard_view": _infer_leaderboard_from_s20(s20),
        "formative_quiz_flow": _infer_formative_from_s18(s18),
        "source": "synthesized",
        "_valid_prereq": {
            "objective_ids": [o["objective_id"] for o in objectives],
            "task_ids": [t["task_id"] for t in tasks],
        },
    }


def _infer_category_from_title(blob: str) -> str:
    b = blob.lower()
    if any(x in b for x in ("team", "peer", "mentor", "share", "sosyal")):
        return "social"
    if any(x in b for x in ("deploy", "field", "site", "saha", "uygula", "practice")):
        return "applied"
    return "formative"


def build_workbook_runtime(gspec: GamificationSpec25, phases: list[GameplayPhase]) -> dict[str, Any]:
    embedded = _extract_embedded_workbook(gspec.sections or {})
    if embedded:
        out = _normalize_embedded_safe(embedded)
        if not out.get("detailed_gameplay_flow"):
            return _synthesize_workbook(gspec, phases)
        return out
    return _synthesize_workbook(gspec, phases)


def _normalize_embedded_safe(data: dict[str, Any]) -> dict[str, Any]:
    objs: list[dict[str, Any]] = []
    for i, o in enumerate(data.get("core_learning_objectives") or []):
        if not isinstance(o, dict):
            continue
        oid = str(o.get("objective_id") or f"LO{i + 1}").strip()[:64]
        objs.append(
            {
                "objective_id": oid,
                "title": str(o.get("title") or oid)[:240],
                "description": str(o.get("description") or "")[:500],
                "mastery_threshold": int(o.get("mastery_threshold") or 100),
            }
        )
    obj_ids = {o["objective_id"] for o in objs}
    tasks: list[dict[str, Any]] = []
    seen_task_ids: set[str] = set()
    for i, t in enumerate(data.get("detailed_gameplay_flow") or []):
        if not isinstance(t, dict):
            continue
        raw_tid = t.get("task_id") or t.get("title") or f"task_{i}"
        tid = str(raw_tid).strip()[:80] or _slug(str(raw_tid), str(i))
        if tid in seen_task_ids:
            tid = f"{tid[:64]}__{i}"
        seen_task_ids.add(tid)
        pq = t.get("prerequisite") or t.get("prerequisites") or []
        if not isinstance(pq, list):
            pq = [pq] if pq else []
        prereq = [str(x).strip()[:80] for x in pq if str(x).strip()]
        default_oid = objs[0]["objective_id"] if objs else "LO1"
        oid = str(t.get("objective_id") or default_oid).strip()[:64]
        tasks.append(
            {
                "task_id": tid,
                "title": str(t.get("title") or tid)[:240],
                "description": str(t.get("description") or "")[:500],
                "prerequisite": prereq,
                "objective_id": oid,
                "quest_category": _norm_category(str(t.get("quest_category") or "")),
            }
        )

    task_id_set = {x["task_id"] for x in tasks}
    for row in tasks:
        row["prerequisite"] = [x for x in row["prerequisite"] if x in task_id_set or x in obj_ids]
    lb = data.get("leaderboard_view") if isinstance(data.get("leaderboard_view"), dict) else {}
    fv = data.get("formative_quiz_flow") if isinstance(data.get("formative_quiz_flow"), dict) else {}
    leaderboard_view = {
        "mode": str(lb.get("mode") or "mastery_tiers"),
        "anonymize": bool(lb.get("anonymize", True)),
        "show_mastery_tiers": bool(lb.get("show_mastery_tiers", True)),
        "show_consistency_streaks": bool(lb.get("show_consistency_streaks", True)),
    }
    base_f = _infer_formative_from_s18("")
    formative_quiz_flow = {
        "immediate_feedback": bool(fv.get("immediate_feedback", True)),
        "diminishing_factor_per_retry": float(fv.get("diminishing_factor_per_retry") or 0.78),
        "success_feedback": str(fv.get("success_feedback") or base_f["success_feedback"])[:800],
        "retry_feedback": str(fv.get("retry_feedback") or base_f["retry_feedback"])[:800],
    }
    return {
        "core_learning_objectives": objs,
        "detailed_gameplay_flow": tasks,
        "leaderboard_view": leaderboard_view,
        "formative_quiz_flow": formative_quiz_flow,
        "source": "embedded_json",
        "_valid_prereq": {"objective_ids": list(obj_ids), "task_ids": list(task_id_set)},
    }
