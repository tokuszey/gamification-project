# app/services/owl_export.py
from __future__ import annotations
from typing import Any, Dict
from datetime import datetime
import os, re

from owlready2 import World
from app.core.config import settings


def _normalize_windows_path(p: str) -> str:
    p = str(p).replace("\\", "/")
    if re.match(r"^/[A-Za-z]:/", p):
        p = p[1:]
    return os.path.abspath(p).replace("\\", "/")


def _safe_name(s: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in s)[:80]


def export_spec_instance(spec_id: int, title: str, sections: Dict[str, Any]) -> str:
    """
    Her çağrıda izole bir World kullanır — spec'ler arası individual karışması engellenir.
    """
    base_onto_path = _normalize_windows_path(settings.ONTOLOGY_PATH)

    # Her export için tamamen izole bir world
    world = World()
    onto = world.get_ontology(base_onto_path).load()

    with onto:
        SpecDocument = onto.search_one(iri="*SpecDocument")
        SpecSection  = onto.search_one(iri="*SpecSection")
        UIComponent  = onto.search_one(iri="*UIComponent")
        Leaderboard  = onto.search_one(iri="*Leaderboard")
        KPI          = onto.search_one(iri="*KPI")
        Badge        = onto.search_one(iri="*Badge")
        Points       = onto.search_one(iri="*Points")

        if SpecDocument is None or SpecSection is None:
            raise RuntimeError("Ontology missing SpecDocument or SpecSection class")

        doc = SpecDocument(f"Spec_{spec_id}")
        try:
            doc.label.append(title)
        except Exception:
            pass

        hasSection    = onto.search_one(iri="*hasSection")
        hasUIComponent= onto.search_one(iri="*hasUIComponent")
        realizedAsUI  = onto.search_one(iri="*realizedAsUI")
        hasKPI        = onto.search_one(iri="*hasKPI")
        hasGameElement= onto.search_one(iri="*hasGameElement")

        for key, value in (sections or {}).items():
            if not str(key).startswith("s"):
                continue
            sec = SpecSection(f"Sec_{spec_id}_{_safe_name(key)}")
            try:
                sec.label.append(key)
            except Exception:
                pass
            if hasSection is not None:
                doc.hasSection.append(sec)
            content = "" if value is None else str(value).strip()
            if content:
                try:
                    sec.comment.append(content)
                except Exception:
                    pass

        def _get(contains: str) -> str:
            k = next((kk for kk in (sections or {}).keys() if contains in kk), None)
            if not k:
                return ""
            v = (sections or {}).get(k, "")
            return "" if v is None else str(v).strip()

        if _get("Execution Log and Leaderboard Design") and Leaderboard is not None:
            lb = Leaderboard(f"Leaderboard_{spec_id}")
            if hasGameElement:
                doc.hasGameElement.append(lb)
            if UIComponent:
                ui = UIComponent(f"LeaderboardUI_{spec_id}")
                if hasUIComponent:
                    doc.hasUIComponent.append(ui)
                if realizedAsUI:
                    lb.realizedAsUI.append(ui)

        if _get("Assessment Framework and KPIs") and KPI is not None:
            kpi = KPI(f"KPI_WeeklyPoints_{spec_id}")
            if hasKPI:
                doc.hasKPI.append(kpi)
            if UIComponent:
                ui = UIComponent(f"KpiDashboardUI_{spec_id}")
                if hasUIComponent:
                    doc.hasUIComponent.append(ui)

        if _get("Narrative Framework") and UIComponent is not None:
            ui = UIComponent(f"NarrativePanelUI_{spec_id}")
            if hasUIComponent:
                doc.hasUIComponent.append(ui)

        if _get("Rewards and Incentives"):
            if Badge is not None:
                b = Badge(f"Badge_{spec_id}")
                if hasGameElement:
                    doc.hasGameElement.append(b)
                if UIComponent:
                    ui = UIComponent(f"BadgeGalleryUI_{spec_id}")
                    if hasUIComponent:
                        doc.hasUIComponent.append(ui)
                    if realizedAsUI:
                        b.realizedAsUI.append(ui)
            if Points is not None:
                p = Points(f"Points_{spec_id}")
                if hasGameElement:
                    doc.hasGameElement.append(p)

    out_dir = os.path.join(os.path.dirname(base_onto_path), "instances")
    os.makedirs(out_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join(out_dir, f"spec_{spec_id}_{ts}.owl")
    onto.save(file=out_path, format="rdfxml")
    return out_path