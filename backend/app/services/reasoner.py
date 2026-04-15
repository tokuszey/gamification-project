# app/services/reasoner.py
import os, re
from owlready2 import get_ontology, sync_reasoner_hermit
from app.core.config import settings


def _normalize_windows_path(p: str) -> str:
    p = str(p).replace("\\", "/")
    if re.match(r"^/[A-Za-z]:/", p):
        p = p[1:]
    return os.path.abspath(p).replace("\\", "/")


def check_consistency(onto_path: str = None) -> dict:
    """
    onto_path verilirse o ontoloji üzerinde,
    verilmezse base ontoloji üzerinde HermiT çalıştırır.
    """
    path = _normalize_windows_path(onto_path or settings.ONTOLOGY_PATH)
    onto = get_ontology(path).load()
    try:
        with onto:
            sync_reasoner_hermit(infer_property_values=True)
        return {"ok": True, "message": "Ontology is consistent (HermiT)."}
    except Exception as e:
        return {"ok": False, "message": f"Ontology consistency check failed: {e}"}