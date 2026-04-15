/**
 * Çalışma kitabı (deployment_package.workbook) — öğrenme hedefleri, görev kapıları, mastery.
 */

import { inferQuestKind, resolveRuleActionLabel, rewardsForQuestTitle } from "./configParser.js";

const CATEGORY_LABELS = {
  formative: "Formative",
  social: "Social",
  applied: "Applied",
};

/**
 * Hangi etkileşim penceresi açılacak (başlıktan quiz/profil/tehlike; aksi halde questCategory / yansıma).
 * @returns {"quiz_s18"|"profile"|"hazard"|"workbook_formative"|"workbook_social"|"workbook_applied"|"reflection"}
 */
export function resolveInteractionFlow(q) {
  if (!q) return "reflection";
  const byTitle = inferQuestKind(q.title);
  if (byTitle === "quiz") return "quiz_s18";
  if (byTitle === "profile") return "profile";
  if (byTitle === "hazard") return "hazard";
  const cat = String(q.questCategory || "").toLowerCase();
  if (cat === "social") return "workbook_social";
  if (cat === "applied") return "workbook_applied";
  if (cat === "formative") return "workbook_formative";
  return "reflection";
}

/** Göreve bağlı kısa formatif mini-quiz (2 soru). */
export function buildMicroQuizFromQuest(q) {
  const typeLabel = CATEGORY_LABELS[String(q.questCategory || "formative").toLowerCase()] || "Formative";
  const head = (q.title || "This quest").trim().slice(0, 120);
  const obj = (q.objectiveId || "objective").trim();
  return [
    {
      stem: `Which quest class best matches “${head}”?`,
      options: [typeLabel, "Score farming only", "Skip without criteria"],
      correctIndex: 0,
    },
    {
      stem: `Confirm which objective (${obj}) you advanced by finishing this step.`,
      options: [
        `Yes — I progressed in line with ${obj}`,
        "Not related to the objective",
        "I did not read it",
      ],
      correctIndex: 0,
    },
  ];
}

/** @param {any} pkg */
export function getWorkbook(pkg) {
  const wb = pkg?.workbook;
  if (!wb || typeof wb !== "object") return null;
  const tasks = wb.detailed_gameplay_flow;
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  return wb;
}

/** `buildWorkbookQuestRows` ile aynı task_id çözümlemesi (completedTaskIds ile bire bir). */
function resolveWorkbookTaskIds(rawTasks) {
  if (!Array.isArray(rawTasks)) return [];
  const seenTids = new Set();
  return rawTasks.map((t, idx) => {
    let tid = String(t.task_id || `task_${idx}`).trim().slice(0, 80);
    if (!tid) tid = `task_${idx}`;
    if (seenTids.has(tid)) tid = `${tid.slice(0, 60)}__${idx}`;
    seenTids.add(tid);
    return tid;
  });
}

const WORKBOOK_QUEST_ORDER_BASE = 2100;

/**
 * Akış görevi tamamlandı kabul edilir: completedTaskIds'te task_id varsa veya
 * buildWorkbookQuestRows ile aynı sıradaki quest order (2100+idx) completedQuestOrders içindeyse.
 * İkisi birbirinden kopuk kalınca (eski oturum / edge case) kilit mantığı ile "tamamlandı" UI'ı çelişmez.
 */
export function isWorkbookFlowTaskCompleted(progress, workbook, taskId) {
  if (!taskId || !workbook?.detailed_gameplay_flow) return false;
  const resolved = resolveWorkbookTaskIds(workbook.detailed_gameplay_flow);
  const tid = String(taskId);
  const idx = resolved.findIndex((x) => x === tid);
  if (idx < 0) return false;
  const wantOrder = WORKBOOK_QUEST_ORDER_BASE + idx;
  const orders = progress.completedQuestOrders || [];
  if (orders.some((o) => Number(o) === wantOrder)) return true;
  const ids = progress.completedTaskIds || [];
  return ids.some((x) => String(x) === tid);
}

/**
 * Görev kartları yalnızca workbook.detailed_gameplay_flow kaynaklıdır (hardcode yok).
 * @param {any} pkg
 */
export function buildWorkbookQuestRows(pkg) {
  const wb = getWorkbook(pkg);
  if (!wb) return null;

  const rules = pkg?.rules || [];
  const objectives = Array.isArray(wb.core_learning_objectives) ? wb.core_learning_objectives : [];
  const objIds = new Set(objectives.map((o) => String(o.objective_id || "").trim()).filter(Boolean));
  const rawTasks = wb.detailed_gameplay_flow || [];

  const resolvedTaskIds = resolveWorkbookTaskIds(rawTasks);
  const taskIdSet = new Set(resolvedTaskIds);

  return rawTasks.map((t, idx) => {
    const title = String(t.title || t.task_id || `Task ${idx + 1}`).slice(0, 240);
    const taskId = resolvedTaskIds[idx];
    const rawPrereq = t.prerequisite || t.prerequisites || [];
    const prereqList = Array.isArray(rawPrereq) ? rawPrereq : rawPrereq ? [rawPrereq] : [];

    const prerequisiteTaskIds = [];
    const prerequisiteObjectiveIds = [];
    for (const p of prereqList) {
      let s = String(p ?? "").trim();
      if (!s) continue;
      if (/^\d+$/.test(s)) {
        const flow = `FLOW_${s.padStart(4, "0")}`;
        const legacy = `TASK_${s}`;
        if (taskIdSet.has(flow)) s = flow;
        else if (taskIdSet.has(legacy)) s = legacy;
      }
      if (taskIdSet.has(s)) prerequisiteTaskIds.push(s);
      else if (objIds.has(s)) prerequisiteObjectiveIds.push(s);
      else if (/^LO[\w-]*$/i.test(s)) prerequisiteObjectiveIds.push(s);
    }

    const oid = String(t.objective_id || (objectives[0] && objectives[0].objective_id) || "LO1").slice(0, 64);
    const cat = String(t.quest_category || "formative").toLowerCase();
    const { rewardXp, rewardGold, rewardLabel } = rewardsForQuestTitle(pkg, title, rules);
    const questKind = inferQuestKind(title);

    return {
      order: WORKBOOK_QUEST_ORDER_BASE + idx,
      taskId,
      title,
      description: String(t.description || "").slice(0, 500),
      questCategory: cat,
      questCategoryLabel: CATEGORY_LABELS[cat] || CATEGORY_LABELS.formative,
      objectiveId: oid,
      prerequisiteTaskIds,
      prerequisiteObjectiveIds,
      prerequisiteOrder: prerequisiteTaskIds.length ? null : null,
      difficultyLabel: CATEGORY_LABELS[cat] || CATEGORY_LABELS.formative,
      rewardXp,
      rewardGold,
      rewardLabel,
      questKind,
      ruleActionLabel: resolveRuleActionLabel(questKind, title),
    };
  });
}

/** Aynı objective_id'ye sahip bir akış görevi tamamlandıysa, yüksek mastery_threshold zinciri kilitlenmesin. */
function hasCompletedFlowTaskForObjective(progress, workbook, oid) {
  if (!oid || !workbook?.detailed_gameplay_flow) return false;
  const raw = workbook.detailed_gameplay_flow;
  const resolved = resolveWorkbookTaskIds(raw);
  for (let i = 0; i < raw.length; i++) {
    if (String(raw[i].objective_id || "") !== String(oid)) continue;
    const tid = resolved[i];
    if (tid && isWorkbookFlowTaskCompleted(progress, workbook, tid)) return true;
  }
  return false;
}

/**
 * Önkoşul ihlali → mastery / görev kilidi.
 * @returns {{ code: string, message: string, detail?: string } | null}
 */
export function getQuestLockReason(quest, progress, workbook) {
  if (!workbook || !quest?.taskId) return null;
  if (isWorkbookFlowTaskCompleted(progress, workbook, quest.taskId)) return null;

  const objXp = progress.objectiveXp || {};
  const objectives = workbook.core_learning_objectives || [];

  for (const tid of quest.prerequisiteTaskIds || []) {
    if (!isWorkbookFlowTaskCompleted(progress, workbook, tid)) {
      return {
        code: "prerequisite_task",
        message: "Mastery Required",
        detail: `Complete first: ${tid}`,
      };
    }
  }
  for (const oid of quest.prerequisiteObjectiveIds || []) {
    if (oid === quest.objectiveId) continue;
    const o = objectives.find((x) => String(x.objective_id) === oid);
    if (!o) continue;
    const th = typeof o.mastery_threshold === "number" ? o.mastery_threshold : 100;
    const xpOk = (objXp[oid] || 0) >= th;
    const flowOk = hasCompletedFlowTaskForObjective(progress, workbook, oid);
    if (!xpOk && !flowOk) {
      return {
        code: "objective_mastery",
        message: "Mastery Required",
        detail: `Mastery threshold for ${oid} (${th} XP) is not met yet.`,
      };
    }
  }
  return null;
}

export function isQuestDone(quest, progress, workbook = null) {
  if (!quest) return false;
  if (workbook && quest.taskId && isWorkbookFlowTaskCompleted(progress, workbook, quest.taskId)) return true;
  if (quest.taskId && (progress.completedTaskIds || []).includes(quest.taskId)) return true;
  const qo = quest.order;
  return (progress.completedQuestOrders || []).some((o) => Number(o) === Number(qo));
}

export function computeUnlockedQuestOrders(quests, progress, workbook) {
  if (!workbook) {
    const completed = new Set(progress.completedQuestOrders || []);
    return quests
      .filter((q) => !q.prerequisiteOrder || completed.has(q.prerequisiteOrder))
      .map((q) => q.order);
  }
  return quests.filter((q) => !getQuestLockReason(q, progress, workbook)).map((q) => q.order);
}

export function countObjectivesMastered(progress, workbook) {
  const objs = workbook?.core_learning_objectives || [];
  const objXp = progress.objectiveXp || {};
  let n = 0;
  for (const o of objs) {
    const id = String(o.objective_id || "");
    const th = typeof o.mastery_threshold === "number" ? o.mastery_threshold : 100;
    if (id && (objXp[id] || 0) >= th) n += 1;
  }
  return n;
}

export function averageMasteryRatio(progress, workbook) {
  const objs = workbook?.core_learning_objectives || [];
  if (!objs.length) return 0;
  const objXp = progress.objectiveXp || {};
  let sum = 0;
  for (const o of objs) {
    const id = String(o.objective_id || "");
    const th = Math.max(1, typeof o.mastery_threshold === "number" ? o.mastery_threshold : 100);
    sum += Math.min(1, (objXp[id] || 0) / th);
  }
  return sum / objs.length;
}

export function masteryTierFromRatio(ratio) {
  if (ratio >= 0.9) return { id: "apex", label: "Apex mastery" };
  if (ratio >= 0.65) return { id: "proficient", label: "Proficient" };
  if (ratio >= 0.35) return { id: "developing", label: "Developing" };
  return { id: "foundational", label: "Foundational" };
}

/** @param {any} workbook */
export function formatDiminishingNote(workbook, factor) {
  const dim = workbook?.formative_quiz_flow?.diminishing_factor_per_retry ?? 0.78;
  const pct = Math.round(factor * 100);
  return `Gain multiplier applied this attempt: ${pct}%. On later completions the multiplier decreases by roughly ×${dim}.`;
}
