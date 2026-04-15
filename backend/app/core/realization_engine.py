"""
Phase-2 realization engine: spec → gamification_config, rule engine, game state machine.
"""

from __future__ import annotations

import hashlib
import re
import uuid
from typing import Any

from app.models.spec_model import (
    GamificationConfigJSON,
    GamificationSpec25,
    GameplayPhase,
    GameState,
    GameStateMachine,
    InteractionRule,
    MechanicItem,
    RewardItem,
    RuleEffect,
    StateTransition,
)


def _section(sections: dict[str, str], needle: str) -> str:
    for k, v in (sections or {}).items():
        if needle in k:
            return "" if v is None else str(v).strip()
    return ""


def _bullet_lines(text: str) -> list[str]:
    out: list[str] = []
    for line in (text or "").splitlines():
        s = re.sub(r"^[\-\*\d\.\)\s•]+", "", line.strip()).strip()
        if len(s) > 2:
            out.append(s)
    return out


def _slug(s: str) -> str:
    h = hashlib.sha256(s.encode("utf-8", errors="ignore")).hexdigest()[:10]
    base = re.sub(r"[^a-z0-9]+", "_", s.lower())[:40].strip("_") or "item"
    return f"{base}_{h[:6]}"


def parse_mechanics_section(text: str) -> list[MechanicItem]:
    items: list[MechanicItem] = []
    for line in _bullet_lines(text):
        items.append(MechanicItem(id=_slug(line), label=line[:200], source_line=line[:500]))
    if not items and text.strip():
        items.append(MechanicItem(id=_slug(text[:80]), label=text.strip()[:200], source_line=text.strip()[:500]))
    return items


def parse_rewards_section(text: str) -> list[RewardItem]:
    items: list[RewardItem] = []
    lower = text.lower()
    lines = _bullet_lines(text) or ([text.strip()] if text.strip() else [])
    for line in lines:
        kind = "other"
        l = line.lower()
        if "point" in l or "puan" in l or "xp" in l:
            kind = "points"
        elif "badge" in l or "rozet" in l:
            kind = "badge"
        elif "level" in l or "tier" in l:
            kind = "level"
        items.append(RewardItem(id=_slug(line), kind=kind, label=line[:200], source_line=line[:500]))
    if "leaderboard" in lower and not any("leader" in i.label.lower() for i in items):
        items.append(RewardItem(id="leaderboard_implicit", kind="other", label="Leaderboard (inferred)", source_line=None))
    return items


def parse_gameplay_flow(text: str) -> list[GameplayPhase]:
    phases: list[GameplayPhase] = []
    numbered = re.findall(r"(?:^|\n)\s*(?:Step|Phase|Stage)\s*(\d+)[:.\)]\s*([^\n]+)", text, re.I)
    if numbered:
        for order_s, title in numbered:
            phases.append(GameplayPhase(order=int(order_s), title=title.strip()[:200], description=""))
    if not phases:
        for i, line in enumerate(_bullet_lines(text)[:12], start=1):
            phases.append(GameplayPhase(order=i, title=line[:120], description=line[:500]))
    if not phases and text.strip():
        phases.append(GameplayPhase(order=1, title="Main flow", description=text.strip()[:800]))
    return sorted(phases, key=lambda p: p.order)


def transform_spec_to_gamification_config(spec: GamificationSpec25) -> GamificationConfigJSON:
    sec = spec.sections
    mechanics_text = _section(sec, "s06::") or _section(sec, "Game Mechanics")
    rewards_text = _section(sec, "s08::") or _section(sec, "Rewards and Incentives")
    gameplay_text = _section(sec, "s13::") or _section(sec, "Detailed Gameplay Flow")
    assessment_text = _section(sec, "s18::") or _section(sec, "Assessment")
    return GamificationConfigJSON(
        spec_id=spec.spec_id or 0,
        title=spec.title,
        mechanics=parse_mechanics_section(mechanics_text),
        rewards=parse_rewards_section(rewards_text),
        gameplay_phases=parse_gameplay_flow(gameplay_text),
        raw_sections={
            "mechanics": mechanics_text[:8000],
            "rewards": rewards_text[:8000],
            "gameplay_flow": gameplay_text[:8000],
            "assessment": (assessment_text or "")[:8000],
        },
    )


# --- Rule patterns (s15) -------------------------------------------------

_RULE_PATTERNS = [
    re.compile(
        r"(?P<act>[^,\n]+?)\s*(?:→|->|yields?|gives?|award)\s*(?P<pts>\d+)\s*(?:points?|xp|puan)",
        re.I,
    ),
    re.compile(
        r"(?:if|when)\s+(?P<act>[^,\n]+?)\s+(?:then|,)\s*(?P<pts>\d+)\s*(?:points?|xp)",
        re.I,
    ),
    re.compile(
        r"(?P<act>[^,\n]+?)\s*:\s*(?P<pts>\d+)\s*(?:points?|xp)",
        re.I,
    ),
]

_BADGE_PATTERN = re.compile(r"(?:badge|rozet)\s+['\"]?([A-Za-z0-9_\-\s]{2,40})['\"]?", re.I)


def parse_interaction_rules(text: str) -> list[InteractionRule]:
    rules: list[InteractionRule] = []
    for line in _bullet_lines(text) or ([text.strip()] if text.strip() else []):
        pts = 0
        action = line
        for pat in _RULE_PATTERNS:
            m = pat.search(line)
            if m:
                action = (m.groupdict().get("act") or line).strip()
                try:
                    pts = int(m.groupdict().get("pts") or 0)
                except (TypeError, ValueError):
                    pts = 0
                break
        badges: list[str] = []
        for bm in _BADGE_PATTERN.finditer(line):
            badges.append(bm.group(1).strip().replace(" ", "_")[:48])
        if pts or badges:
            rules.append(
                InteractionRule(
                    id=f"rule_{uuid.uuid4().hex[:10]}",
                    trigger_action=action[:300],
                    match="contains",
                    effect=RuleEffect(points_delta=pts, badge_ids=badges),
                )
            )
    return rules


def _action_bucket(s: str) -> str | None:
    """Group Turkish / English action labels so RuleEngine matches across languages."""
    if not s:
        return None
    x = s.strip().lower()
    if any(k in x for k in ("tehlike", "hazard", "near-miss", "near miss", "saha olayı", "hazard_report")):
        return "hazard"
    if any(k in x for k in ("quiz", "sınav", "assessment", "complete the quiz", "quiz tamamla")):
        return "quiz"
    if any(k in x for k in ("gift points", "puan gönder", "arkadaşına", "gifting")):
        return "gift"
    if any(k in x for k in ("keşif", "discovery", "saha denetim", "complete discovery")):
        return "discovery"
    if any(k in x for k in ("profil", "profile", "customize", "avatar", "özelleşt")):
        return "profile"
    if any(k in x for k in ("streak", "günlük giriş", "daily login", "giriş yap")):
        return "streak"
    return None


def _default_interaction_rules() -> list[InteractionRule]:
    """When section 15 is empty: ship quiz-adjacent + discovery + social stubs for Runtime Lab demos."""
    return [
        InteractionRule(
            id="builtin_hazard_report",
            trigger_action="Hazard report",
            match="contains",
            effect=RuleEffect(points_delta=30, badge_ids=["Safety_First"]),
        ),
        InteractionRule(
            id="builtin_quiz_complete",
            trigger_action="Complete the quiz",
            match="contains",
            effect=RuleEffect(points_delta=50, badge_ids=[]),
        ),
        InteractionRule(
            id="builtin_gift_points",
            trigger_action="Gift points to a friend",
            match="contains",
            effect=RuleEffect(points_delta=15, badge_ids=[]),
        ),
        InteractionRule(
            id="builtin_discovery",
            trigger_action="Complete discovery quest",
            match="contains",
            effect=RuleEffect(points_delta=25, badge_ids=[]),
        ),
        InteractionRule(
            id="builtin_profile",
            trigger_action="Customize your profile",
            match="contains",
            effect=RuleEffect(points_delta=20, badge_ids=[]),
        ),
    ]


# --- Logic DSL (s15): if (a > 1 AND b < 2) then grant_badge('X') -----------------

_LOGIC_LINE = re.compile(
    r"if\s*\(\s*(?P<cond>.+?)\s*\)\s*then\s+(?P<then>.+?)\s*$",
    re.I | re.DOTALL,
)
_COMPARISON = re.compile(
    r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(<=|>=|!=|==|[><=])\s*(\d+)\s*$",
)
_GRANT_BADGE = re.compile(
    r"grant_badge\s*\(\s*['\"]([^'\"]{1,64})['\"]\s*\)",
    re.I,
)
_AWARD_POINTS = re.compile(
    r"award_points\s*\(\s*(\d+)\s*\)",
    re.I,
)


def _parse_condition_expr(expr: str) -> dict[str, Any]:
    """Split top-level AND / OR (no nested parens in v1)."""
    s = (expr or "").strip()
    if not s:
        return {"op": "and", "clauses": []}
    upper = s.upper()
    if " AND " in upper:
        parts = re.split(r"\s+AND\s+", s, flags=re.I)
        return {
            "op": "and",
            "clauses": [_parse_atom(p.strip()) for p in parts if p.strip()],
        }
    if " OR " in upper:
        parts = re.split(r"\s+OR\s+", s, flags=re.I)
        return {
            "op": "or",
            "clauses": [_parse_atom(p.strip()) for p in parts if p.strip()],
        }
    return {"op": "and", "clauses": [_parse_atom(s)]}


def _parse_atom(atom: str) -> dict[str, Any]:
    m = _COMPARISON.match(atom.strip())
    if not m:
        return {"type": "raw", "text": atom[:200]}
    left, op, right_s = m.group(1), m.group(2), m.group(3)
    try:
        right = int(right_s)
    except ValueError:
        right = 0
    return {"type": "compare", "left": left.lower(), "op": op, "right": right}


def _parse_then_actions(then_part: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    t = (then_part or "").strip()
    for bm in _GRANT_BADGE.finditer(t):
        out.append({"action": "grant_badge", "badge_id": bm.group(1).strip().replace(" ", "_")[:48]})
    for pm in _AWARD_POINTS.finditer(t):
        try:
            pts = int(pm.group(1))
        except (TypeError, ValueError):
            pts = 0
        out.append({"action": "award_points", "points": pts})
    return out


def parse_logic_dsl_from_text(text: str) -> list[dict[str, Any]]:
    """
    Parse Madde-15 lines like:
      if (action_count > 5 AND level < 2) then grant_badge('Starter')
      if (xp >= 100) then award_points(10)
    Emits JSON-safe dicts under deployment_package.logic.
    """
    logic: list[dict[str, Any]] = []
    for line in _bullet_lines(text) or ([] if not (text or "").strip() else [text.strip()]):
        m = _LOGIC_LINE.match(line.strip())
        if not m:
            continue
        cond_raw = m.group("cond").strip()
        then_raw = m.group("then").strip()
        when = _parse_condition_expr(cond_raw)
        actions = _parse_then_actions(then_raw)
        if not actions:
            continue
        logic.append(
            {
                "id": f"logic_{uuid.uuid4().hex[:12]}",
                "source": line[:500],
                "when": when,
                "then": actions,
            }
        )
    return logic


class RuleEngine:
    """Evaluate 'action X → points + badge' style rules from spec section 15."""

    def __init__(self, rules: list[InteractionRule] | None = None):
        self.rules = rules or []

    @classmethod
    def from_section_text(cls, text: str) -> RuleEngine:
        rules = parse_interaction_rules(text or "")
        if not rules:
            rules = _default_interaction_rules()
        return cls(rules)

    def evaluate(self, action: str) -> RuleEffect:
        a = (action or "").strip().lower()
        total_pts = 0
        badges: list[str] = []
        if not a:
            return RuleEffect()
        for r in self.rules:
            t = r.trigger_action.lower()
            if r.match == "exact" and a == t:
                hit = True
            else:
                hit = t in a or a in t
                if not hit:
                    ba, bt = _action_bucket(a), _action_bucket(t)
                    hit = ba is not None and ba == bt
            if hit:
                total_pts += r.effect.points_delta
                badges.extend(r.effect.badge_ids)
        return RuleEffect(points_delta=total_pts, badge_ids=badges)

    def to_serializable(self) -> list[dict[str, Any]]:
        return [r.model_dump() for r in self.rules]


def build_game_state_machine(
    config: GamificationConfigJSON,
    rules: list[InteractionRule],
) -> GameStateMachine:
    phases = config.gameplay_phases or [
        GameplayPhase(order=1, title="start", description="Enter experience"),
        GameplayPhase(order=2, title="complete", description="Finish core loop"),
    ]
    states: list[GameState] = []
    for i, ph in enumerate(phases):
        sid = f"state_{ph.order}"
        next_id = f"state_{phases[i + 1].order}" if i + 1 < len(phases) else "state_done"
        transitions = [StateTransition(event="advance", target=next_id if i + 1 < len(phases) else "state_done")]
        if rules:
            transitions.append(StateTransition(event="rule_fired", target=sid))
        states.append(
            GameState(
                id=sid,
                label=ph.title,
                description=ph.description or ph.title,
                transitions=transitions,
            )
        )
    states.append(
        GameState(
            id="state_done",
            label="Complete",
            description="Terminal / recap",
            transitions=[],
        )
    )
    initial = states[0].id if states else "state_done"
    return GameStateMachine(initial_state=initial, states=states)


def extract_kpi_slugs_from_s18(text: str) -> list[str]:
    """Lightweight KPI names from assessment section for analytics mapping."""
    found: list[str] = []
    for m in re.finditer(r"\b([A-Z][a-zA-Z0-9]{2,24})\b", text or ""):
        w = m.group(1)
        if w.lower() in {"the", "and", "for", "with", "from", "this", "that", "kpi"}:
            continue
        if "KPI" in text[max(0, m.start() - 20) : m.end() + 20].upper():
            found.append(w)
    for line in _bullet_lines(text):
        if ":" in line:
            head = line.split(":", 1)[0].strip()
            if 2 < len(head) < 60:
                found.append(re.sub(r"\s+", "_", head)[:48])
    # dedupe preserve order
    out: list[str] = []
    seen = set()
    for x in found:
        k = x.lower()
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out[:24]
