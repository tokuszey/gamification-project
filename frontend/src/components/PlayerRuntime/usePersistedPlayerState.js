import { useCallback, useEffect, useState } from "react";

const PREFIX = "gameforge_player_runtime_v1_";

const defaultState = {
  xp: 0,
  virtualCurrency: 0,
  badges: [],
  completedQuestOrders: [],
  completedTaskIds: [],
  objectiveXp: {},
  questAttemptCounts: {},
  streakDays: 0,
  lastStreakDate: null,
  eventLog: [],
  auditLog: [],
  shopOwnedIds: [],
  socialContributionPoints: 0,
  instructorValidation: null,
  profileCosmetics: null,
};

const MAX_AUDIT_ENTRIES = 160;
const AUDIT_VERSION = 1;

function hashString(input) {
  const s = String(input || "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function buildAuditHash(entryCore, prevHash) {
  return hashString(
    [
      prevHash || "GENESIS",
      entryCore.id,
      entryCore.ts,
      entryCore.actionType,
      entryCore.text,
      JSON.stringify(entryCore.meta || {}),
      entryCore.compensates || "",
      AUDIT_VERSION,
    ].join("|"),
  );
}

function appendAuditEntry(prevAuditLog, payload) {
  const prev = Array.isArray(prevAuditLog) ? prevAuditLog : [];
  const last = prev[prev.length - 1];
  const prevHash = last?.hash || "GENESIS";
  const ts = Date.now();
  const entryCore = {
    id: `${ts}_${Math.random().toString(36).slice(2, 9)}`,
    ts,
    actionType: String(payload.actionType || "runtime_event").slice(0, 64),
    text: String(payload.text || "").slice(0, 500),
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    compensates: payload.compensates ? String(payload.compensates).slice(0, 64) : null,
    prevHash,
    version: AUDIT_VERSION,
  };
  const entry = { ...entryCore, hash: buildAuditHash(entryCore, prevHash) };
  return [...prev, entry].slice(-MAX_AUDIT_ENTRIES);
}

function validateAndNormalizeAuditLog(rawAuditLog) {
  if (!Array.isArray(rawAuditLog)) return [];
  const normalized = [];
  let prevHash = "GENESIS";
  for (const item of rawAuditLog) {
    if (!item || typeof item !== "object") continue;
    const entryCore = {
      id: typeof item.id === "string" ? item.id.slice(0, 64) : "",
      ts: typeof item.ts === "number" ? item.ts : 0,
      actionType: typeof item.actionType === "string" ? item.actionType.slice(0, 64) : "runtime_event",
      text: typeof item.text === "string" ? item.text.slice(0, 500) : "",
      meta: item.meta && typeof item.meta === "object" ? item.meta : {},
      compensates: typeof item.compensates === "string" ? item.compensates.slice(0, 64) : null,
      prevHash: typeof item.prevHash === "string" ? item.prevHash : "",
      version: typeof item.version === "number" ? item.version : AUDIT_VERSION,
    };
    if (!entryCore.id || !entryCore.ts || !entryCore.text) continue;
    const expectedPrev = prevHash;
    const expectedHash = buildAuditHash({ ...entryCore, prevHash: expectedPrev }, expectedPrev);
    if (entryCore.prevHash !== expectedPrev) break;
    if (String(item.hash || "") !== expectedHash) break;
    normalized.push({ ...entryCore, hash: expectedHash });
    prevHash = expectedHash;
  }
  return normalized.slice(-MAX_AUDIT_ENTRIES);
}

function eventRowsFromAudit(auditLog) {
  return (auditLog || [])
    .slice()
    .reverse()
    .map((e) => ({
      id: e.id,
      ts: e.ts,
      text: e.text,
      actionType: e.actionType || "runtime_event",
    }))
    .slice(0, 40);
}

function bumpStreak(prev) {
  const today = new Date().toISOString().slice(0, 10);
  if (prev.lastStreakDate === today) {
    return { streakDays: prev.streakDays || 0, lastStreakDate: today };
  }
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  if (prev.lastStreakDate === yesterday) {
    return { streakDays: Math.min(999, (prev.streakDays || 0) + 1), lastStreakDate: today };
  }
  return { streakDays: 1, lastStreakDate: today };
}

function readStorage(specId) {
  if (!specId) return { ...defaultState };
  try {
    const raw = localStorage.getItem(PREFIX + specId);
    if (!raw) return { ...defaultState };
    const p = JSON.parse(raw);
    const cos = p.profileCosmetics;
    const profileCosmetics =
      cos && typeof cos === "object"
        ? {
            nickname: typeof cos.nickname === "string" ? cos.nickname.slice(0, 40) : "",
            displayTitle: typeof cos.displayTitle === "string" ? cos.displayTitle.slice(0, 80) : "",
            avatarPresetId: typeof cos.avatarPresetId === "string" ? cos.avatarPresetId.slice(0, 32) : "azure",
          }
        : null;
    const ox = p.objectiveXp && typeof p.objectiveXp === "object" ? p.objectiveXp : {};
    const objectiveXp = {};
    for (const [k, v] of Object.entries(ox)) {
      if (typeof v === "number" && v >= 0) objectiveXp[String(k).slice(0, 64)] = v;
    }
    const auditLog = validateAndNormalizeAuditLog(p.auditLog);
    const hasValidAudit = auditLog.length > 0;
    const fallbackEventLog = Array.isArray(p.eventLog) ? p.eventLog : [];
    const nextEventLog = hasValidAudit ? eventRowsFromAudit(auditLog) : fallbackEventLog;
    return {
      xp: typeof p.xp === "number" ? p.xp : 0,
      virtualCurrency: typeof p.virtualCurrency === "number" ? p.virtualCurrency : 0,
      badges: Array.isArray(p.badges) ? p.badges : [],
      completedQuestOrders: Array.isArray(p.completedQuestOrders) ? p.completedQuestOrders : [],
      completedTaskIds: Array.isArray(p.completedTaskIds) ? p.completedTaskIds : [],
      objectiveXp,
      questAttemptCounts:
        p.questAttemptCounts && typeof p.questAttemptCounts === "object" ? p.questAttemptCounts : {},
      streakDays: typeof p.streakDays === "number" ? p.streakDays : 0,
      lastStreakDate: typeof p.lastStreakDate === "string" ? p.lastStreakDate : null,
      eventLog: nextEventLog,
      auditLog,
      shopOwnedIds: Array.isArray(p.shopOwnedIds) ? p.shopOwnedIds : [],
      socialContributionPoints: typeof p.socialContributionPoints === "number" ? Math.max(0, p.socialContributionPoints) : 0,
      instructorValidation:
        p.instructorValidation &&
        typeof p.instructorValidation === "object" &&
        typeof p.instructorValidation.validatedAt === "number"
          ? {
              validatedAt: p.instructorValidation.validatedAt,
              advisorId:
                typeof p.instructorValidation.advisorId === "string"
                  ? p.instructorValidation.advisorId.slice(0, 48)
                  : "advisor",
              note:
                typeof p.instructorValidation.note === "string"
                  ? p.instructorValidation.note.slice(0, 220)
                  : "Mastery criteria verified.",
            }
          : null,
      profileCosmetics:
        profileCosmetics &&
        (profileCosmetics.nickname.length >= 2 ||
          profileCosmetics.displayTitle.length >= 2 ||
          (profileCosmetics.avatarPresetId && profileCosmetics.avatarPresetId !== "azure"))
          ? profileCosmetics
          : null,
    };
  } catch {
    return { ...defaultState };
  }
}

function writeStorage(specId, s) {
  if (!specId) return;
  try {
    localStorage.setItem(PREFIX + specId, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

export function usePersistedPlayerState(specId) {
  const [state, setState] = useState(() => readStorage(specId));

  useEffect(() => {
    setState(readStorage(specId));
  }, [specId]);

  useEffect(() => {
    writeStorage(specId, state);
  }, [specId, state]);

  const pushEvent = useCallback((text, options = {}) => {
    if (!text) return;
    setState((prev) => {
      const nextAuditLog = appendAuditEntry(prev.auditLog, {
        text,
        actionType: options.actionType || "runtime_event",
        meta: options.meta || {},
        compensates: options.compensates || null,
      });
      return {
        ...prev,
        auditLog: nextAuditLog,
        eventLog: eventRowsFromAudit(nextAuditLog),
        shopOwnedIds: prev.shopOwnedIds || [],
      };
    });
  }, []);

  const addProgress = useCallback((pointsDelta, newBadges, questOrder, extra = {}) => {
    const goldBonus = typeof extra.goldBonus === "number" ? extra.goldBonus : 0;
    const objectiveId = typeof extra.objectiveId === "string" ? extra.objectiveId.slice(0, 64) : null;
    const objectiveContrib = typeof extra.objectiveContrib === "number" ? extra.objectiveContrib : pointsDelta;
    const taskId = typeof extra.taskId === "string" ? extra.taskId.slice(0, 80) : null;
    const bumpTaskAttempt = Boolean(extra.bumpTaskAttempt);

    setState((prev) => {
      const meaningful = pointsDelta > 0 || newBadges.length > 0 || questOrder != null;
      const streakInfo = meaningful ? bumpStreak(prev) : { streakDays: prev.streakDays, lastStreakDate: prev.lastStreakDate };
      const baseGold =
        Math.max(0, Math.floor(pointsDelta / 3)) + (newBadges.length > 0 ? 5 : 0) + goldBonus;

      const nextObjectiveXp = { ...(prev.objectiveXp || {}) };
      if (objectiveId && objectiveContrib > 0) {
        nextObjectiveXp[objectiveId] = (nextObjectiveXp[objectiveId] || 0) + objectiveContrib;
      }

      const completedNew =
        questOrder != null && !prev.completedQuestOrders.includes(questOrder)
          ? [...prev.completedQuestOrders, questOrder]
          : prev.completedQuestOrders;

      const nextTaskIds = [...(prev.completedTaskIds || [])];
      if (taskId && !nextTaskIds.includes(taskId)) {
        nextTaskIds.push(taskId);
      }

      const qac = { ...(prev.questAttemptCounts || {}) };
      if (bumpTaskAttempt && taskId) {
        qac[taskId] = (qac[taskId] || 0) + 1;
      }

      return {
        xp: prev.xp + pointsDelta,
        virtualCurrency: prev.virtualCurrency + baseGold,
        badges: Array.from(new Set([...prev.badges, ...newBadges])),
        completedQuestOrders: completedNew,
        completedTaskIds: nextTaskIds,
        objectiveXp: nextObjectiveXp,
        questAttemptCounts: qac,
        streakDays: streakInfo.streakDays,
        lastStreakDate: streakInfo.lastStreakDate,
        eventLog: prev.eventLog || [],
        auditLog: prev.auditLog || [],
        shopOwnedIds: prev.shopOwnedIds || [],
        socialContributionPoints: prev.socialContributionPoints || 0,
        instructorValidation: prev.instructorValidation || null,
        profileCosmetics: prev.profileCosmetics,
      };
    });
  }, []);

  const addVirtualCurrency = useCallback((delta) => {
    const d = Math.floor(delta);
    if (!d) return;
    setState((prev) => ({
      ...prev,
      virtualCurrency: Math.max(0, prev.virtualCurrency + d),
    }));
  }, []);

  const purchaseShopItem = useCallback((itemId, costGold) => {
    if (!itemId || costGold < 0) return false;
    let ok = false;
    setState((prev) => {
      const owned = prev.shopOwnedIds || [];
      if (owned.includes(itemId)) return prev;
      if (prev.virtualCurrency < costGold) return prev;
      ok = true;
      return {
        ...prev,
        virtualCurrency: prev.virtualCurrency - costGold,
        shopOwnedIds: [...owned, itemId],
      };
    });
    return ok;
  }, []);

  const resetProgress = useCallback(() => {
    setState({ ...defaultState });
    if (specId) localStorage.removeItem(PREFIX + specId);
  }, [specId]);

  const commitProfileCosmetics = useCallback((payload) => {
    if (!payload || typeof payload !== "object") return;
    const displayTitle = String(payload.displayTitle ?? payload.title ?? "").trim().slice(0, 80);
    const nickname = String(payload.nickname ?? "").trim().slice(0, 40);
    const avatarPresetId = String(payload.avatarPresetId || "azure").trim().slice(0, 32);
    setState((prev) => {
      const prevCos = prev.profileCosmetics || {};
      const nextNickname = nickname.length >= 2 ? nickname : prevCos.nickname || "";
      const nextDisplayTitle = displayTitle.length >= 2 ? displayTitle : prevCos.displayTitle || "";
      if (nextNickname.length < 2 && nextDisplayTitle.length < 2) return prev;
      return {
        ...prev,
        profileCosmetics: {
          nickname: nextNickname,
          displayTitle: nextDisplayTitle,
          avatarPresetId,
        },
      };
    });
  }, []);

  const validateCertificate = useCallback((payload = {}) => {
    const advisorId = String(payload.advisorId || "advisor").trim().slice(0, 48) || "advisor";
    const note =
      String(payload.note || "Mastery criteria verified.").trim().slice(0, 220) ||
      "Mastery criteria verified.";
    const validatedAt = Date.now();
    setState((prev) => {
      const already = prev.instructorValidation;
      if (already && typeof already.validatedAt === "number") return prev;
      const nextAuditLog = appendAuditEntry(prev.auditLog, {
        text: `Instructor validation recorded by ${advisorId}.`,
        actionType: "instructor_validation",
        meta: { advisorId, note },
      });
      return {
        ...prev,
        instructorValidation: { validatedAt, advisorId, note },
        auditLog: nextAuditLog,
        eventLog: eventRowsFromAudit(nextAuditLog),
      };
    });
  }, []);

  const level = 1 + Math.floor(state.xp / 150);

  return {
    ...state,
    level,
    setState,
    addProgress,
    pushEvent,
    purchaseShopItem,
    addVirtualCurrency,
    resetProgress,
    commitProfileCosmetics,
    validateCertificate,
  };
}
