/**
 * 6D wizard steps: multi-select + "Other" free text.
 */

export const WIZARD_SIXD_OTHER = "__sixd_other__";

/** D1 — business objectives */
export const WIZARD_D1_OPTIONS = [
  { id: "emp_engagement", label: "Increase employee engagement" },
  { id: "training_completion", label: "Raise training completion rate" },
  { id: "rev_growth", label: "Revenue / growth" },
  { id: "retention", label: "Customer or user retention" },
  { id: "learning_outcomes", label: "Learning outcomes" },
  { id: "compliance", label: "Compliance / procedures" },
  { id: "quality_safety", label: "Quality / safety" },
  { id: "productivity", label: "Productivity" },
  { id: "innovation", label: "Innovation / experimentation" },
];

/** D2 — target behaviors (concrete actions to reward) */
export const WIZARD_D2_OPTIONS = [
  { id: "daily_login", label: "Daily login" },
  { id: "complete_module", label: "Complete module / task" },
  { id: "help_peer", label: "Help a peer" },
  { id: "peer_feedback", label: "Give peer feedback" },
  { id: "submit_report", label: "Submit report or form" },
  { id: "streak_habit", label: "Maintain streak / habit" },
  { id: "collab_task", label: "Complete collaborative task" },
  { id: "certification", label: "Pass certification / exam" },
  { id: "content_share", label: "Create or share content" },
];

/** D3 — audience segment (with HEXAD/Bartle) */
export const WIZARD_D3_AUDIENCE_OPTIONS = [
  { id: "students", label: "Students" },
  { id: "employees", label: "Employees" },
  { id: "customers", label: "Customers" },
  { id: "patients", label: "Patients / health users" },
  { id: "citizens", label: "Citizens / community" },
  { id: "volunteers", label: "Volunteers" },
  { id: "mixed_cohort", label: "Mixed cohort" },
];

/** D4 — short engagement loop */
export const WIZARD_D4_ENGAGE_OPTIONS = [
  { id: "trigger_feedback", label: "Trigger → action → immediate feedback" },
  { id: "streak_remind", label: "Streak / reminder re-engagement" },
  { id: "social_notify", label: "Social notification / nudge" },
  { id: "quest_chain", label: "Quest chain (sequential steps)" },
  { id: "random_reward", label: "Random / surprise reward" },
  { id: "micro_challenge", label: "Micro-challenge" },
];

/** D4 — progression structure */
export const WIZARD_D4_PROGRESS_OPTIONS = [
  { id: "levels_xp", label: "Levels and XP progression" },
  { id: "seasons", label: "Season / term structure" },
  { id: "badge_tiers", label: "Badge tiers" },
  { id: "skill_tree", label: "Skill tree" },
  { id: "career_ladder", label: "Career ladder" },
  { id: "mastery_path", label: "Mastery / expertise path" },
  { id: "quest_progression", label: "Long quest-chain progression" },
];

/** D5 — MDA aesthetics / fun */
export const WIZARD_D5_OPTIONS = [
  { id: "exploration_feel", label: "Sense of exploration / curiosity" },
  { id: "competition_thrill", label: "Competitive thrill" },
  { id: "collaboration_bond", label: "Collaboration / social bond" },
  { id: "mastery_feel", label: "Mastery and growth" },
  { id: "narrative", label: "Narrative / story context" },
  { id: "collection", label: "Collection / set completion" },
  { id: "expression", label: "Expression / customization (avatar, style)" },
  { id: "surprise_variety", label: "Surprise and variety" },
];

/** D6 — concrete game elements / mechanics */
export const WIZARD_D6_OPTIONS = [
  { id: "points", label: "Points / score" },
  { id: "badges", label: "Badges" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "levels_xp_mechanic", label: "Levels / XP (mechanic)" },
  { id: "streaks", label: "Streaks" },
  { id: "quests", label: "Quests / quest chains" },
  { id: "teams", label: "Teams / clans / group goals" },
  { id: "virtual_currency", label: "Virtual currency / reward store" },
  { id: "avatars", label: "Avatars / profile progression" },
];

export function labelById(options, id) {
  const o = options.find((x) => x.id === id);
  return o ? o.label : id;
}

/** presets: id list; OTHER id uses otherText */
export function combinePresetStrings(presets, otherText, options) {
  if (!presets || !presets.length) return "";
  const parts = [];
  for (const id of presets) {
    if (id === WIZARD_SIXD_OTHER) {
      const t = (otherText || "").trim();
      if (t) parts.push(t);
    } else {
      parts.push(labelById(options, id));
    }
  }
  return parts.join("; ");
}

export function validatePresetsWithOther(presets, otherText) {
  if (!presets || !presets.length) return false;
  if (presets.includes(WIZARD_SIXD_OTHER) && !(otherText || "").trim()) return false;
  return true;
}
