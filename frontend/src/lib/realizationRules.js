/**
 * Client-side evaluation of Madde 15 interaction rules + canonical "quiz dışı" actions.
 * Mirrors backend RuleEngine.contains matching.
 */

const CANONICAL_ACTIONS = [
  {
    id: "canonical_hazard",
    trigger_action: "Hazard report",
    match: "contains",
    effect: { points_delta: 30, badge_ids: ["Safety_First"] },
    aliases: [
      "tehlike bildirimi",
      "tehlike bildir",
      "tehlike rapor",
      "report hazard",
      "saha olayı",
      "hazard_report",
    ],
  },
  {
    id: "canonical_quiz",
    trigger_action: "Complete the quiz",
    match: "contains",
    effect: { points_delta: 50, badge_ids: [] },
    aliases: ["quiz tamamla", "quiz bitir", "quiz complete", "assessment bitir"],
  },
  {
    id: "canonical_gift",
    trigger_action: "Gift points to a friend",
    match: "contains",
    effect: { points_delta: 15, badge_ids: [] },
    aliases: ["arkadaşına puan gönder", "puan gönder", "gifting", "sosyal yardım"],
  },
  {
    id: "canonical_discovery",
    trigger_action: "Complete discovery quest",
    match: "contains",
    effect: { points_delta: 25, badge_ids: [] },
    aliases: ["keşif görevi tamamla", "keşif", "discovery", "saha denetimi yap", "saha denetim"],
  },
  {
    id: "canonical_profile",
    trigger_action: "Customize your profile",
    match: "contains",
    effect: { points_delta: 20, badge_ids: [] },
    aliases: ["profilini özelleştir", "profil", "customize profile", "avatar"],
  },
  {
    id: "canonical_streak",
    trigger_action: "Daily streak login",
    match: "contains",
    effect: { points_delta: 10, badge_ids: [] },
    aliases: ["streak günlük giriş", "giriş yap", "günlük giriş", "daily login", "streak"],
  },
];

function uniq(arr) {
  return Array.from(new Set(arr));
}

function matchCanonical(actionLower) {
  if (!actionLower) return null;
  for (const c of CANONICAL_ACTIONS) {
    const candidates = [c.trigger_action.toLowerCase(), ...(c.aliases || []).map((x) => x.toLowerCase())];
    for (const t of candidates) {
      if (!t) continue;
      if (actionLower.includes(t) || t.includes(actionLower)) {
        return {
          id: c.id,
          trigger_action: c.trigger_action,
          effect: c.effect,
          synthetic: true,
        };
      }
    }
  }
  return null;
}

/** True if player action and deployed rule trigger refer to the same canonical action (any language alias). */
function sameCanonicalAction(actionLower, ruleTriggerLower) {
  if (!actionLower || !ruleTriggerLower) return false;
  const synA = matchCanonical(actionLower);
  const synR = matchCanonical(ruleTriggerLower);
  if (synA && synR && synA.id === synR.id) return true;
  if (synA) {
    const c = CANONICAL_ACTIONS.find((x) => x.id === synA.id);
    const candidates = c
      ? [c.trigger_action.toLowerCase(), ...(c.aliases || []).map((x) => x.toLowerCase())]
      : [];
    for (const ph of candidates) {
      if (!ph) continue;
      if (ruleTriggerLower.includes(ph) || ph.includes(ruleTriggerLower)) return true;
    }
  }
  if (synR) {
    const c = CANONICAL_ACTIONS.find((x) => x.id === synR.id);
    const candidates = c
      ? [c.trigger_action.toLowerCase(), ...(c.aliases || []).map((x) => x.toLowerCase())]
      : [];
    for (const ph of candidates) {
      if (!ph) continue;
      if (actionLower.includes(ph) || ph.includes(actionLower)) return true;
    }
  }
  return false;
}

/**
 * @param {object|null} pkg deployment_package from /api/v1/realize
 * @param {string} actionLabel
 * @returns {{
 *   pointsDelta: number,
 *   badgeIds: string[],
 *   matchedRules: object[],
 *   logicDefinitions: object[],
 * }}
 */
/**
 * Resolve interaction effects from compiled `pkg.rules` (Madde 15) and echo §15 prose context.
 * @param {object|null} pkg deployment_package
 * @param {object|null} blueprint from `buildSpecBlueprint(pkg)` (needs `sections.s15_interaction_sequences`)
 * @param {string} actionLabel player or lab action label
 * @param {Record<string, unknown>} meta optional `actionId` / `ruleId` for §15 line matching
 */
export function evaluateUniversalTrigger(pkg, blueprint, actionLabel, meta = {}) {
  const ev = evaluateInteractionRules(pkg, actionLabel);
  const s15 = String(blueprint?.sections?.s15_interaction_sequences || "");
  const lines = s15
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const a = String(actionLabel || "").trim().toLowerCase();
  const actionId = String(meta?.actionId || meta?.ruleId || "").trim().toLowerCase();
  const ruleNeedles = (ev.matchedRules || [])
    .flatMap((r) => [String(r.id || "").toLowerCase(), String(r.trigger_action || "").toLowerCase().trim()])
    .filter((x) => x.length >= 2);
  const needles = uniq([a, actionId, ...ruleNeedles].filter(Boolean));

  const s15LineHits = [];
  const seen = new Set();
  for (const line of lines) {
    const ll = line.toLowerCase();
    let hit = false;
    for (const n of needles) {
      if (n.length < 2) continue;
      if (ll.includes(n)) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const r of ev.matchedRules || []) {
        const t = String(r.trigger_action || "").toLowerCase().trim();
        if (t && (ll.includes(t) || (t.length >= 4 && t.includes(ll.slice(0, Math.min(32, ll.length)))))) {
          hit = true;
          break;
        }
      }
    }
    if (!hit) continue;
    const clipped = line.length > 600 ? `${line.slice(0, 600)}…` : line;
    const key = clipped.slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    s15LineHits.push(clipped);
    if (s15LineHits.length >= 14) break;
  }

  const resolutionPath = [];
  if (s15.trim()) {
    if (s15LineHits.length) resolutionPath.push("s15_interaction_sequences");
    else resolutionPath.push("s15_present_no_line_match");
  } else {
    resolutionPath.push("s15_absent");
  }
  const specHits = (ev.matchedRules || []).filter((r) => r.source === "spec_rule").length;
  if (specHits) resolutionPath.push("compiled_pkg_rules");
  else if ((ev.matchedRules || []).some((r) => r.source === "canonical")) resolutionPath.push("canonical_action_fallback");
  if (!ev.matchedRules?.length) resolutionPath.push("no_compiled_match");

  return {
    ...ev,
    universal: {
      s15TextPresent: Boolean(s15.trim()),
      s15LineHits,
      resolutionPath,
      actionLabel: String(actionLabel || ""),
    },
  };
}

export function evaluateInteractionRules(pkg, actionLabel) {
  const a = (actionLabel || "").toLowerCase().trim();
  const matchedRules = [];
  let pointsDelta = 0;
  const badgeIds = [];

  for (const r of pkg?.rules || []) {
    const t = (r.trigger_action || "").toLowerCase().trim();
    if (!t) continue;
    const hit = a.includes(t) || t.includes(a) || sameCanonicalAction(a, t);
    if (hit) {
      matchedRules.push({
        id: r.id,
        trigger_action: r.trigger_action,
        points_delta: r.effect?.points_delta ?? 0,
        badge_ids: r.effect?.badge_ids || [],
        source: "spec_rule",
      });
      pointsDelta += r.effect?.points_delta || 0;
      badgeIds.push(...(r.effect?.badge_ids || []));
    }
  }

  if (!matchedRules.length && a) {
    const syn = matchCanonical(a);
    if (syn) {
      matchedRules.push({
        id: syn.id,
        trigger_action: syn.trigger_action,
        points_delta: syn.effect.points_delta,
        badge_ids: syn.effect.badge_ids || [],
        source: "canonical",
        synthetic: true,
      });
      pointsDelta += syn.effect.points_delta || 0;
      badgeIds.push(...(syn.effect.badge_ids || []));
    }
  }

  const logicDefinitions = (pkg?.logic || []).map((row) => ({
    id: row.id,
    source: row.source,
    when: row.when,
    then: row.then,
  }));

  return {
    pointsDelta,
    badgeIds: uniq(badgeIds),
    matchedRules,
    logicDefinitions,
  };
}

export { CANONICAL_ACTIONS };
