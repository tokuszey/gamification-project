/**
 * Universal gamification realization — schema mapping, validation, dependency graph helpers.
 * No domain-specific copy ("Siber Güvenlik" etc.); strings come from the loaded package / sections.
 */

/** @typedef {{ ok: boolean, errors: string[], warnings: string[] }} ValidationResult */

const MIN_SECTION_CHARS = 24;

/**
 * Pick first section body whose key matches any of the substrings (case-insensitive).
 * @param {Record<string, string>|null|undefined} sectionsMap
 * @param {string[]} keySubstrings e.g. ["s13::", "Detailed Gameplay"]
 */
export function pickSectionBody(sectionsMap, keySubstrings) {
  if (!sectionsMap || typeof sectionsMap !== "object") return "";
  const subs = (keySubstrings || []).map((s) => String(s).toLowerCase());
  for (const [k, v] of Object.entries(sectionsMap)) {
    const kl = String(k).toLowerCase();
    if (subs.some((s) => kl.includes(s))) {
      const body = v == null ? "" : String(v);
      if (body.trim()) return body;
    }
  }
  return "";
}

/**
 * Merge `pkg.spec_sections` (studio keys), optional `pkg.sections`, then `gamification_config.raw_sections`.
 * @param {any} pkg deployment_package from /realize
 * @returns {Record<string, string>}
 */
export function mergeSectionSources(pkg) {
  const out = {};
  /** Authoritative studio keys (s01:: …) from realization API. */
  const studio = pkg?.spec_sections;
  if (studio && typeof studio === "object") {
    for (const [k, v] of Object.entries(studio)) {
      if (v != null) out[String(k)] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  const embedded = pkg?.sections;
  if (embedded && typeof embedded === "object") {
    for (const [k, v] of Object.entries(embedded)) {
      const sk = String(k);
      if (out[sk]) continue;
      if (v != null) out[sk] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  const raw = pkg?.gamification_config?.raw_sections;
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      const key = `raw::${k}`;
      if (out[key]) continue;
      out[key] = typeof v === "string" ? v : String(v ?? "");
    }
  }
  return out;
}

/**
 * First meaningful line for theme / title hints (generic).
 */
export function firstMeaningfulLine(text, maxLen = 96) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);
  const s = lines[0] || "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

/**
 * Central blueprint: all dynamic strings live under paths derived from the package.
 * @param {any} pkg
 */
export function buildSpecBlueprint(pkg) {
  if (!pkg || typeof pkg !== "object") {
    return {
      meta: { specId: null, title: "" },
      sections: {},
      structural: { rules: [], logic: [], gameStateMachine: null, workbook: null },
      narrative: { theme_hint: "", path: "narrative.theme_hint" },
      validation: { ok: true, errors: ["No deployment package loaded"], warnings: [] },
      prerequisiteGraph: { nodes: [], edges: [] },
    };
  }

  const merged = mergeSectionSources(pkg);
  const title = String(pkg.gamification_config?.title || pkg.title || "").trim();

  const s01 = pickSectionBody(merged, ["s01::", "introduction and context"]);
  const s03 = pickSectionBody(merged, ["s03::", "core learning objectives"]);
  const s09 = pickSectionBody(merged, ["s09::", "narrative framework"]);
  const s14 = pickSectionBody(merged, ["s14::", "gamified user stories", "user stories"]);
  const s13 =
    pickSectionBody(merged, ["s13::", "detailed gameplay", "gameplay_flow"]) ||
    String(merged["raw::gameplay_flow"] || "").trim();
  const s15 =
    pickSectionBody(merged, ["s15::", "key interaction", "interaction sequences"]) ||
    "";

  const s18 =
    pickSectionBody(merged, ["s18::", "assessment framework", "raw::assessment"]) ||
    "";

  const narrativeHint = firstMeaningfulLine(s09) || firstMeaningfulLine(title) || "";

  const rules = Array.isArray(pkg.rules) ? pkg.rules : [];
  const logic = Array.isArray(pkg.logic) ? pkg.logic : [];
  const wb = pkg.workbook && typeof pkg.workbook === "object" ? pkg.workbook : null;
  const flowTasks = Array.isArray(wb?.detailed_gameplay_flow) ? wb.detailed_gameplay_flow : [];

  /** @type {ValidationResult} */
  const errors = [];
  const warnings = [];

  const s13Strong = (s13 && s13.trim().length >= MIN_SECTION_CHARS) || flowTasks.length > 0;
  if (!s13Strong) {
    errors.push("Missing §13 gameplay signal: need detailed_gameplay_flow (workbook) or s13 / gameplay_flow text.");
  }

  if (!rules.length) {
    warnings.push("§15 rules array empty — studio Madde 15 lines may be missing; client canonical rules may still apply.");
  }

  if (!s15.trim() && rules.length) {
    warnings.push("Raw §15 section text not on package; using parsed `rules` / `logic` as interaction source.");
  }

  if (!s03.trim() && !(wb?.core_learning_objectives || []).length) {
    warnings.push("No §03 objectives text and no workbook.core_learning_objectives — mastery bars may fall back to defaults.");
  }

  const validation = {
    ok: errors.length === 0,
    errors,
    warnings,
  };

  const blueprint = {
    meta: {
      specId: pkg.gamification_config?.spec_id ?? null,
      title,
    },
    sections: {
      s01_intro: s01,
      s03_core_learning_objectives: s03,
      s09_narrative: s09,
      s14_user_stories: s14,
      s13_gameplay_flow: s13,
      s15_interaction_sequences: s15,
      s18_assessment: s18,
    },
    structural: {
      rules,
      logic,
      gameStateMachine: pkg.game_state_machine || null,
      workbook: wb,
      mechanics: pkg.gamification_config?.mechanics || [],
      rewards: pkg.gamification_config?.rewards || [],
      gameplayPhases: pkg.gamification_config?.gameplay_phases || [],
    },
    narrative: {
      theme_hint: narrativeHint,
      path: "narrative.theme_hint",
    },
    validation,
    prerequisiteGraph: { nodes: [], edges: [] },
    _mergedSectionKeys: Object.keys(merged),
  };

  return blueprint;
}

/**
 * Deterministic prerequisite graph from normalized quest rows (workbook flow).
 * @param {any[]} questRows from buildWorkbookQuestRows / similar
 */
export function buildPrerequisiteGraph(questRows) {
  if (!Array.isArray(questRows)) return { nodes: [], edges: [] };
  const nodes = questRows.map((q) => {
    const id = String(q.taskId || "").trim() || `order_${q.order}`;
    return {
      id,
      order: q.order,
      objective_id: q.objectiveId,
      prerequisite_task_ids: [...(q.prerequisiteTaskIds || [])],
      prerequisite_objective_ids: [...(q.prerequisiteObjectiveIds || [])],
    };
  });
  const edges = [];
  for (const n of nodes) {
    for (const tid of n.prerequisite_task_ids) {
      edges.push({ from: String(tid), to: n.id, type: "requires_task" });
    }
    for (const oid of n.prerequisite_objective_ids) {
      edges.push({ from_obj: String(oid), to: n.id, type: "requires_objective_mastery" });
    }
  }
  return { nodes, edges };
}

/**
 * Immutable-style audit row for monitoring lab (consumer may append to log store).
 * @param {{ action_id: string, result: string, detail?: any }} p
 */
/** §18 (assessment) excerpt for universal feedback modals — no canned pedagogy copy. */
export function getAssessmentRationaleExcerpt(blueprint, maxLen = 480) {
  const raw = String(blueprint?.sections?.s18_assessment || "").trim();
  if (!raw) return "";
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}

/**
 * Where prerequisite / unlock logic is sourced (§13 prose vs workbook machine graph).
 * Actual solver remains in `workbookRuntime.js` (`computeUnlockedQuestOrders`, `getQuestLockReason`).
 */
export function dependencySourceLabel(blueprint) {
  const wb = blueprint?.structural?.workbook;
  const hasFlow = Array.isArray(wb?.detailed_gameplay_flow) && wb.detailed_gameplay_flow.length > 0;
  const hasS13 = Boolean(String(blueprint?.sections?.s13_gameplay_flow || "").trim().length >= MIN_SECTION_CHARS);
  if (hasFlow) return "workbook_detailed_gameplay_flow";
  if (hasS13) return "s13_gameplay_flow_text";
  return "none";
}

export function formatUniversalAuditEntry(p) {
  const ts = Date.now();
  return {
    ts,
    timestamp_iso: new Date(ts).toISOString(),
    action_id: String(p?.action_id || "unknown_action"),
    result: String(p?.result || "unknown"),
    detail: p?.detail != null && typeof p.detail === "object" ? { ...p.detail } : p?.detail ?? null,
    schema_version: "universal_audit_v1",
  };
}
