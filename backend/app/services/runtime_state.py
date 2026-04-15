from collections import defaultdict

player_states = defaultdict(lambda: {
    "xp": 0,
    "level": 1,
    "tasks_completed": 0,
    "badges": [],
    "completed_task_ids": [],
    "streak": 0,
    "combo_multiplier": 1.0,
    "energy": 100,
    "active_mission_id": None,
    "active_mission_step_index": 0,  # 0..step_count-1
    "active_mission_step_deducted_energy": False,  # energy_cost deducted on first step attempt
    "missions_started": [],
    "missions_unlocked": [],
    "last_outcome": None,
    # Multi-step preview: per-step time limit scales from recent step outcomes (success tightens, fail loosens).
    "preview_time_scale": 1.0,
    "preview_step_streak": 0,
})
