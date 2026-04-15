from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.runtime import _extract_tasks_from_spec
from app.db.deps import get_db
from app.models.spec import Spec, SpecStatus
from app.services.runtime_state import player_states

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/metrics")
def get_metrics():
    states = list(player_states.values())

    total_players = len(states)
    total_tasks_completed = sum(s["tasks_completed"] for s in states)
    total_xp = sum(s["xp"] for s in states)

    average_completion_per_player = round(total_tasks_completed / total_players, 2) if total_players else 0
    average_xp = round(total_xp / total_players, 2) if total_players else 0
    total_badges_awarded = sum(len(s["badges"]) for s in states)

    return {
        "total_players": total_players,
        "total_tasks_completed": total_tasks_completed,
        "average_completion_per_player": average_completion_per_player,
        "average_xp": average_xp,
        "total_badges_awarded": total_badges_awarded,
    }


def _parse_player_state_key(key: str) -> tuple[int | None, str | None]:
    # expected format: "spec:{spec_id}:{player_id}"
    if not isinstance(key, str) or not key.startswith("spec:"):
        return None, None
    parts = key.split(":", 2)
    if len(parts) < 3:
        return None, None
    try:
        return int(parts[1]), parts[2]
    except Exception:
        return None, None


def _realized_spec_ids() -> set[int]:
    out: set[int] = set()
    for k in player_states.keys():
        spec_id, _player_id = _parse_player_state_key(k)
        if spec_id is not None:
            out.add(spec_id)
    return out


@router.get("/overview")
def get_overview(spec_id: str = "all", db: Session = Depends(get_db)):
    # DB: spec counts
    specs: list[Spec] = db.query(Spec).order_by(Spec.id.desc()).all()
    realized_spec_ids = _realized_spec_ids()

    total_specs = len(specs)
    realized_specs = sum(
        1 for s in specs
        if str(getattr(s, "status", "")).lower() == str(SpecStatus.APPROVED.value).lower() and s.id in realized_spec_ids
    )

    # Runtime: players + tasks + badges
    spec_id_normalized = (spec_id or "all").lower().strip()
    selected_spec_ids: set[int]

    if spec_id_normalized == "all":
        selected_spec_ids = {s.id for s in specs}
    else:
        try:
            selected_spec_ids = {int(spec_id_normalized)}
        except Exception:
            selected_spec_ids = set()

    # Precompute tasks metadata per spec
    tasks_by_spec: dict[int, list[dict]] = {}
    tasks_total_by_spec: dict[int, int] = {}
    for s in specs:
        if s.id not in selected_spec_ids:
            continue
        tasks, _ = _extract_tasks_from_spec(s)
        tasks_by_spec[s.id] = tasks
        tasks_total_by_spec[s.id] = len(tasks)

    # Count tasks completion and badges distribution; collect leaderboard rows
    tasks_completion_counter: defaultdict[str, int] = defaultdict(int)
    badge_counter: defaultdict[str, int] = defaultdict(int)
    leaderboard_rows: list[dict] = []

    players_started = set()
    completion_percentages: list[float] = []

    for key, state in player_states.items():
        runtime_spec_id, player_id = _parse_player_state_key(key)
        if runtime_spec_id is None or player_id is None:
            continue
        if runtime_spec_id not in selected_spec_ids:
            continue

        players_started.add(player_id)

        tasks_total = tasks_total_by_spec.get(runtime_spec_id, 0) or 0
        completed_ids = state.get("completed_task_ids", []) or []
        completion_pct = (len(completed_ids) / tasks_total) * 100 if tasks_total else 0
        completion_percentages.append(round(completion_pct, 2))

        # badges
        for b in state.get("badges", []) or []:
            badge_counter[str(b)] += 1

        # tasks counts (per mission title)
        tasks = tasks_by_spec.get(runtime_spec_id, []) or []
        title_by_task_id = {t.get("id"): t.get("title") for t in tasks}
        for tid in completed_ids:
            title = title_by_task_id.get(tid)
            if title:
                tasks_completion_counter[str(title)] += 1

        leaderboard_rows.append(
            {
                "player_id": player_id,
                "xp": state.get("xp", 0),
                "level": state.get("level", 1),
                "badge_count": len(state.get("badges", []) or []),
                "badges": state.get("badges", []) or [],
            }
        )

    avg_completion_per_player_pct = round(
        (sum(completion_percentages) / len(completion_percentages)) if completion_percentages else 0,
        2,
    )

    # Spec status distribution (global + selected-spec filtered)
    def _status_counts(for_specs: list[Spec]) -> dict[str, int]:
        draft_count = sum(1 for s in for_specs if str(s.status).lower() == str(SpecStatus.DRAFT.value).lower())
        validated_count = sum(1 for s in for_specs if str(s.status).lower() == str(SpecStatus.VALIDATED.value).lower())
        approved_non_realized_count = sum(
            1
            for s in for_specs
            if str(s.status).lower() == str(SpecStatus.APPROVED.value).lower() and s.id not in realized_spec_ids
        )
        realized_count = sum(
            1
            for s in for_specs
            if str(s.status).lower() == str(SpecStatus.APPROVED.value).lower() and s.id in realized_spec_ids
        )
        return {
            "DRAFT": draft_count,
            "VALIDATED": validated_count,
            "APPROVED": approved_non_realized_count,
            "REALIZED": realized_count,
            "total": len(for_specs),
        }

    spec_status_distribution = _status_counts(specs)
    selected_specs = [s for s in specs if s.id in selected_spec_ids]
    selected_spec_status_distribution = _status_counts(selected_specs)

    # Sort badge + leaderboard payloads for stable UI rendering
    badges_distribution = sorted(
        [{"badge_name": name, "count": count} for name, count in badge_counter.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    leaderboard_rows.sort(key=lambda r: r.get("xp", 0), reverse=True)

    # Task completion chart payload (ordered by count desc)
    tasks_completion = sorted(
        [{"task_title": name, "completed_count": count} for name, count in tasks_completion_counter.items()],
        key=lambda x: x["completed_count"],
        reverse=True,
    )

    # Selected spec meta
    selected_meta = {
        "spec_id": (spec_id_normalized if spec_id_normalized != "all" else "all"),
        "players_started": len(players_started),
        "avg_completion_per_player_pct": avg_completion_per_player_pct,
    }

    return {
        "global": {
            "total_specs": total_specs,
            "realized_specs": realized_specs,
        },
        "spec": selected_meta,
        "spec_status_distribution": spec_status_distribution,
        "selected_spec_status_distribution": selected_spec_status_distribution,
        "tasks_completion": tasks_completion,
        "badges_distribution": badges_distribution,
        "leaderboard": leaderboard_rows,
    }
