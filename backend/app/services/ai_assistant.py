from __future__ import annotations
from typing import Dict, Any, Optional
import re
import os

import httpx
from openai import OpenAI

SIX_D_META_KEY = "__meta::six_d"


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _domain_line_from_extra(extra_context: Optional[str]) -> str:
    """Pull designer domain from bootstrap markdown (avoids model defaulting to cybersecurity)."""
    if not extra_context:
        return ""
    for pattern in (
        r"\*\*Alan \(domain\):\*\*\s*(.+)",
        r"Proje alanı:\s*(.+)",
        r"\*\*Domain:\*\*\s*(.+)",
        r"(?:Project domain|Domain):\s*(.+)",
    ):
        m = re.search(pattern, extra_context, re.IGNORECASE | re.MULTILINE)
        if m:
            return _clean(m.group(1))[:220]
    return ""


def _ontology_constraints_block(sections: Dict[str, Any]) -> str:
    """
    Human-readable constraints aligned with Studio Co-Pilot / GamifyOnt cross-checks.
    Injected into LLM system+context so drafts respect HEXAD vs mechanics consistency.
    """
    if not isinstance(sections, dict):
        return ""
    mech = str(sections.get("s06::Game Mechanics") or "").lower()
    rew = str(sections.get("s08::Rewards and Incentives") or "").lower()
    lb_sec = str(sections.get("s20::Execution Log and Leaderboard Design") or "").lower()
    meta = sections.get(SIX_D_META_KEY)
    hex_notes = ""
    if isinstance(meta, dict):
        d3 = (meta.get("phases") or {}).get("d3_players")
        if isinstance(d3, dict):
            hex_notes = str(d3.get("notes") or "").lower()
    bullets = []
    social_need = any(
        k in hex_notes for k in ("social", "socializer", "community", "relat")
    )
    has_social_mech = any(
        k in mech or k in lb_sec
        for k in (
            "leaderboard",
            "team",
            "gift",
            "gifting",
            "collaborat",
            "forum",
            "chat",
            "share",
        )
    )
    if social_need and not has_social_mech:
        bullets.append(
            "Designer profile (HEXAD/D3) is social: when editing mechanics, execution log, or player "
            "loops, include at least one explicit social interaction pattern (e.g. leaderboard, team goal, "
            "gifting, collaboration) or state why it is out of scope."
        )
    if "leaderboard" in lb_sec and "badge" not in rew and "point" not in rew:
        bullets.append(
            "Execution log mentions a leaderboard: tie it to measurable incentives (points and/or badges) "
            "when the section touches rewards or progression."
        )
    if not bullets:
        return ""
    return "ONTOLOGY / DESIGN CONSTRAINTS (must not contradict):\n" + "\n".join(f"- {b}" for b in bullets)


def _six_d_brief_from_sections(sections: Dict[str, Any]) -> str:
    """Compact 6D notes already stored on spec (bootstrap merges before fill)."""
    meta = sections.get(SIX_D_META_KEY)
    if not isinstance(meta, dict):
        return ""
    phases = meta.get("phases") or {}
    labels = {
        "d1_define": "D1 objectives",
        "d2_behaviors": "D2 behaviors",
        "d3_players": "D3 players/HEXAD",
        "d4_cycles": "D4 loops",
        "d5_fun": "D5 fun/aesthetics",
        "d6_deploy": "D6 tools/mechanics",
    }
    parts = []
    for pid, label in labels.items():
        p = phases.get(pid)
        if not isinstance(p, dict):
            continue
        n = str(p.get("notes") or "").strip()
        if n:
            parts.append(f"{label}: {_clean(n)[:280]}")
    return "\n".join(parts)[:3500]


def offline_suggest(
    section_key: str,
    sections: Dict[str, Any],
    tone: str = "academic",
    extra_context: Optional[str] = None
) -> str:
    title = section_key.split("::", 1)[-1].strip() if "::" in section_key else section_key
    ctx = _clean(extra_context) if extra_context else ""
    domain_focus = _domain_line_from_extra(extra_context)
    six_brief = _six_d_brief_from_sections(sections)

    narrative = _clean(str(sections.get("s09::Narrative Framework", "")))
    kpi = _clean(str(sections.get("s18::Assessment Framework and KPIs", "")))
    leaderboard = _clean(str(sections.get("s20::Execution Log and Leaderboard Design", "")))
    objectives = _clean(str(sections.get("s03::Core Learning Objectives", "")))

    if tone == "concise":
        style = "Short and clear"
    elif tone == "playful":
        style = "Creative and motivating"
    else:
        style = "Academic and explanatory"

    base = []
    base.append(f"[{style}] Draft suggestion for section: {title}")

    if domain_focus:
        base.append(f"MANDATORY DOMAIN (from 6D wizard): {domain_focus}")
        base.append("- Do NOT frame this specification as cybersecurity/SOC/phishing unless that domain is listed above.")
    if six_brief:
        base.append("6D designer inputs (must stay consistent):")
        base.append(six_brief[:2000])
    oc = _ontology_constraints_block(sections)
    if oc:
        base.append(oc)
    if ctx:
        base.append(f"Full context: {ctx[:6000]}")

    if "Rewards" in title or "Incentives" in title:
        base.append("- Reward types: points, badges, level progression")
        base.append("- Reward triggers: task completion, weekly streak bonuses")
        base.append("- Anti-cheat: daily limits and duplicate task prevention")
        base.append("- Feedback: instant notification and weekly summary")

    elif "Narrative" in title:
        base.append("- Story flow: introduction → challenges → mission completion")
        base.append("- Player role: participant solving narrative-driven tasks")
        if narrative:
            base.append(f"- Existing hint: {narrative[:120]}")

    elif "Assessment" in title or "KPI" in title:
        base.append("- Primary KPI: WeeklyPoints")
        base.append("- Secondary KPI: TasksCompleted, CompletionRate")
        base.append("- Measurement: event log → weekly aggregation → dashboard")
        if kpi:
            base.append(f"- Existing hint: {kpi[:120]}")

    elif "Leaderboard" in title or "Execution Log" in title:
        base.append("- Event logs: TaskCompleted, PointsAwarded, LevelUp")
        base.append("- Weekly leaderboard reset and total points ranking")
        if leaderboard:
            base.append(f"- Existing hint: {leaderboard[:120]}")

    else:
        if objectives:
            base.append(f"- Align with learning objectives: {objectives[:120]}")
        base.append("- Define scope, process, and evaluation criteria")
        base.append("- Include at least three measurable requirements")

    base.append("")
    base.append("Acceptance Criteria:")
    base.append("1. Section contains explanatory text.")
    base.append("2. At least three actionable requirements exist.")
    base.append("3. Output format or evaluation metric is defined.")

    return "\n".join(base)


def _instructions() -> str:
    return (
        "You are an AI assistant for a gamification specification tool.\n"
        "Generate a high-quality draft for the requested section.\n"
        "Rules:\n"
        "- Output plain text.\n"
        "- LANGUAGE: Write the entire draft in English only. Do not use Turkish or any other language.\n"
        "- Structure: 1 short paragraph + 4-8 bullet points + 3 acceptance criteria.\n"
        "- Be consistent with the provided signals (narrative/kpis/leaderboard/objectives).\n"
        "- Do NOT invent UI screens not present in signals unless clearly implied.\n"
        "- CRITICAL: If extra_context or six_d_designer_inputs describe a domain (e.g., education, HR, healthcare, "
        "retail, project management), the section MUST reflect THAT domain only. "
        "Do NOT substitute cybersecurity, SOC, phishing, or incident-response training unless the designer context "
        "explicitly says security/cyber is the topic.\n"
        "- If ontology_design_constraints appear in the request, treat them as hard requirements for this draft.\n"
    )


def _context_blob(section_key: str, sections: Dict[str, Any], tone: str, extra_context: Optional[str]) -> Dict[str, Any]:
    title = section_key.split("::", 1)[-1].strip() if "::" in section_key else section_key
    six_d = _six_d_brief_from_sections(sections)
    domain_focus = _domain_line_from_extra(extra_context)
    blob = {
        "section_key": section_key,
        "section_title": title,
        "tone": tone,
        "output_language": "en",
        "designer_domain_focus": domain_focus or None,
        "six_d_designer_inputs": six_d or None,
        "extra_context": extra_context,
        "existing_signals": {
            "narrative": sections.get("s09::Narrative Framework", ""),
            "kpi": sections.get("s18::Assessment Framework and KPIs", ""),
            "leaderboard": sections.get("s20::Execution Log and Leaderboard Design", ""),
            "objectives": sections.get("s03::Core Learning Objectives", ""),
        },
    }
    oc = _ontology_constraints_block(sections)
    if oc:
        blob["ontology_design_constraints"] = oc
    return blob


def _openai_chat_suggest(
    section_key: str,
    sections: Dict[str, Any],
    tone: str,
    extra_context: Optional[str],
    model: str,
    api_key: str,
    base_url: str,
) -> str:
    """OpenAI-compatible servers: Ollama, LM Studio, vLLM, etc."""
    client = OpenAI(api_key=api_key, base_url=base_url.rstrip("/"))
    instructions = _instructions()
    user = f"Fill this section:\n{_context_blob(section_key, sections, tone, extra_context)}"
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": user},
        ],
        temperature=0.35,
    )
    choice = resp.choices[0].message.content
    return (choice or "").strip()


def _openai_responses_suggest(
    section_key: str,
    sections: Dict[str, Any],
    tone: str,
    extra_context: Optional[str],
    model: str,
    api_key: str,
) -> str:
    client = OpenAI(api_key=api_key)
    instructions = _instructions()
    blob = _context_blob(section_key, sections, tone, extra_context)
    resp = client.responses.create(
        model=model,
        instructions=instructions,
        input=f"Fill this section:\n{blob}",
    )
    text = getattr(resp, "output_text", None) or str(resp)
    return text.strip()


def openai_suggest(
    section_key: str,
    sections: Dict[str, Any],
    tone: str = "academic",
    extra_context: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> str:
    """
    If base_url is set (or env OPENAI_BASE_URL), uses Chat Completions (local / compatible).
    Otherwise uses OpenAI Responses API (hosted OpenAI).
    """
    bu = (base_url or os.getenv("OPENAI_BASE_URL") or "").strip() or None
    used_model = model or os.getenv("OPENAI_MODEL", "gpt-5")
    key = api_key or os.getenv("OPENAI_API_KEY")

    if bu:
        k = key or "ollama"
        return _openai_chat_suggest(
            section_key, sections, tone, extra_context, used_model, k, bu
        )

    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set (required when OPENAI_BASE_URL is empty)")
    return _openai_responses_suggest(
        section_key, sections, tone, extra_context, used_model, key
    )


def huggingface_suggest(
    section_key: str,
    sections: Dict[str, Any],
    tone: str = "academic",
    extra_context: Optional[str] = None,
    model: Optional[str] = None,
    api_token: Optional[str] = None,
    inference_base: Optional[str] = None,
) -> str:
    token = api_token or os.getenv("HUGGINGFACE_API_TOKEN")
    if not token:
        raise RuntimeError("HUGGINGFACE_API_TOKEN is not set")
    mid = model or os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    base = (inference_base or os.getenv("HUGGINGFACE_INFERENCE_BASE") or "").strip().rstrip("/")
    if not base:
        base = "https://api-inference.huggingface.co/models"
    instructions = _instructions()
    user = f"Fill this section:\n{_context_blob(section_key, sections, tone, extra_context)}"
    prompt = f"{instructions}\n\n### User:\n{user}\n\n### Assistant:\n"
    url = f"{base}/{mid}"
    with httpx.Client(timeout=120.0) as client:
        r = client.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
            json={
                "inputs": prompt,
                "parameters": {"max_new_tokens": 900, "return_full_text": False},
            },
        )
        r.raise_for_status()
        data = r.json()
    if isinstance(data, list) and data and isinstance(data[0], dict):
        t = data[0].get("generated_text")
        if t:
            return str(t).strip()
    if isinstance(data, dict) and data.get("generated_text"):
        return str(data["generated_text"]).strip()
    if isinstance(data, dict) and "error" in data:
        raise RuntimeError(str(data["error"]))
    raise RuntimeError(f"Unexpected Hugging Face response shape: {type(data)}")