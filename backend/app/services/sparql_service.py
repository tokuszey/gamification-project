"""
Load GamifyOnt (RDF/XML) into an rdflib graph and run read-only SPARQL SELECT queries.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

from rdflib import Graph
from rdflib.query import Result

_FORBIDDEN = re.compile(
    r"\b(INSERT|DELETE|DROP|CLEAR|CREATE|LOAD|COPY|MOVE|ADD)\b",
    re.IGNORECASE,
)


def _ontology_path(path: str) -> str:
    return path


@lru_cache(maxsize=2)
def _load_graph(ontology_path: str) -> Graph:
    g = Graph()
    g.parse(ontology_path, format="xml")
    return g


def run_select(ontology_path: str, query: str) -> dict[str, Any]:
    raw = (query or "").strip()
    if not raw.upper().startswith("PREFIX") and not raw.upper().startswith("SELECT"):
        raise ValueError("Only SPARQL SELECT (with optional PREFIX) is allowed.")
    if _FORBIDDEN.search(raw):
        raise ValueError("Only read-only SELECT queries are allowed.")
    g = _load_graph(_ontology_path(ontology_path))
    result: Result = g.query(raw)
    if result.type != "SELECT":
        raise ValueError("Query must be a SELECT.")
    vars_ = [str(v) for v in result.vars]
    rows: list[dict[str, str | None]] = []
    for row in result:
        d: dict[str, str | None] = {}
        for v in result.vars:
            cell = row[v]
            d[str(v)] = str(cell) if cell is not None else None
        rows.append(d)
    return {"variables": vars_, "rows": rows, "row_count": len(rows)}


# Curated examples for UI / docs (PREFIX matches GamifyOnt xml:base + #)
SAMPLE_QUERIES: dict[str, str] = {
    "game_elements_for_hexad_achiever": """PREFIX go: <http://example.org/gamifyont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?element ?type WHERE {
  ?element rdf:type ?type .
  ?type rdfs:subClassOf* go:GameElement .
  FILTER (?type != go:GameElement)
  ?element go:appealsTo go:Hexad_Achiever .
}""",
    "subclasses_of_player_type": """PREFIX go: <http://example.org/gamifyont.owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?subtype ?label WHERE {
  ?subtype rdfs:subClassOf go:PlayerType .
  OPTIONAL { ?subtype rdfs:label ?label . }
}""",
    "all_game_element_types": """PREFIX go: <http://example.org/gamifyont.owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?c ?label WHERE {
  ?c rdfs:subClassOf* go:GameElement .
  FILTER (?c != go:GameElement)
  OPTIONAL { ?c rdfs:label ?label . }
}""",
}
