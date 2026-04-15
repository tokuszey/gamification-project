import axios from "axios";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL as API } from "../config";
import { buildPrerequisiteGraph, buildSpecBlueprint, formatUniversalAuditEntry } from "../lib/universalSpecEngine.js";
import { evaluateInteractionRules, evaluateUniversalTrigger } from "../lib/realizationRules";
import { buildWorkbookQuestRows } from "../components/PlayerRuntime/workbookRuntime.js";

const RealizationContext = createContext(null);

/** Canonical label for hazard flow (TR + EN). */
export const HAZARD_ACTION_LABEL = "Hazard report";

export function RealizationProvider({ children, specId, specStatus }) {
  const approved = String(specStatus || "").toLowerCase() === "approved";
  const sid = specId ? Number(specId) : null;
  const validSid = sid && !Number.isNaN(sid) ? sid : null;

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [technicalLog, setTechnicalLog] = useState([]);
  const [labXp, setLabXp] = useState(0);
  const [labBadges, setLabBadges] = useState([]);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [lastLabPop, setLastLabPop] = useState(null);
  const [lastRuleRun, setLastRuleRun] = useState(null);

  const appendTechnical = useCallback((row) => {
    setTechnicalLog((prev) =>
      [{ ...row, _id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, ts: Date.now() }, ...prev].slice(0, 400),
    );
  }, []);

  const clearTechnicalLog = useCallback(() => setTechnicalLog([]), []);
  const clearLabPop = useCallback(() => setLastLabPop(null), []);

  const specBlueprint = useMemo(() => {
    const base = buildSpecBlueprint(pkg);
    if (!pkg) return base;
    const rows = buildWorkbookQuestRows(pkg);
    if (rows && rows.length) {
      return { ...base, prerequisiteGraph: buildPrerequisiteGraph(rows) };
    }
    return base;
  }, [pkg]);

  const logUniversalEvent = useCallback(
    (payload) => {
      const row = formatUniversalAuditEntry(payload);
      appendTechnical({
        channel: "lab",
        kind: "universal_audit",
        message: row.action_id,
        detail: row,
      });
    },
    [appendTechnical],
  );

  useEffect(() => {
    setUnlockedBadges([]);
  }, [validSid]);

  const loadPackage = useCallback(async () => {
    if (!validSid || !approved) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/v1/realize`, { spec_id: validSid });
      const dp = res.data?.deployment_package;
      if (!dp) throw new Error("Invalid deployment_package");
      setPkg(dp);
      const schemaChecks = {
        hasRulesArray: Array.isArray(dp.rules),
        hasStateMachine: Boolean(dp.game_state_machine?.states?.length),
        hasIfThenLikeRules: (dp.rules || []).some((r) => r?.trigger_action && r?.effect),
      };
      appendTechnical({
        channel: "system",
        kind: "realize",
        message: "Deployment package loaded",
        detail: {
          rules: (dp.rules || []).length,
          logic: (dp.logic || []).length,
          schemaChecks,
          ontologyOk: Boolean(dp.ontology_validation?.ok),
        },
      });
    } catch (e) {
      let msg = "Failed to load realization package";
      if (axios.isAxiosError(e)) {
        if (e.response?.data?.detail != null) msg = String(e.response.data.detail);
        else if (e.code === "ERR_NETWORK" || e.message === "Network Error") {
          msg = `Network error reaching ${API}/api/v1/realize`;
        } else if (e.message) msg = e.message;
      } else if (e instanceof Error && e.message) msg = e.message;
      setError(msg);
      setPkg(null);
    } finally {
      setLoading(false);
    }
  }, [validSid, approved, appendTechnical]);

  const evaluateAction = useCallback(
    (actionLabel, meta) => evaluateUniversalTrigger(pkg, specBlueprint, actionLabel, meta || {}),
    [pkg, specBlueprint],
  );

  const unlockBadgesByMastery = useCallback(
    (objectiveId) => {
      const oid = String(objectiveId || "").trim();
      if (!oid || !pkg) return [];
      const rewards = Array.isArray(pkg?.gamification_config?.rewards)
        ? pkg.gamification_config.rewards.filter((r) => String(r?.kind || "").toLowerCase() === "badge")
        : [];
      const rewardBadges = rewards
        .map((r) => String(r?.id || r?.label || "").trim().replace(/\s+/g, "_").slice(0, 48))
        .filter(Boolean);
      const ruleBadges = (pkg?.rules || [])
        .flatMap((r) => r?.effect?.badge_ids || [])
        .map((b) => String(b || "").trim().replace(/\s+/g, "_").slice(0, 48))
        .filter(Boolean);
      const pool = Array.from(new Set([...rewardBadges, ...ruleBadges]));
      if (!pool.length) return [];
      let hash = 0;
      for (let i = 0; i < oid.length; i += 1) hash = ((hash << 5) - hash + oid.charCodeAt(i)) | 0;
      const picked = pool[Math.abs(hash) % pool.length];
      return picked ? [picked] : [];
    },
    [pkg],
  );

  const handleTrigger = useCallback(
    (actionLabel, meta = {}) => {
      const ev = evaluateUniversalTrigger(pkg, specBlueprint, actionLabel, meta);
      const resolvedPoints = ev.pointsDelta;
      const objectiveId = String(meta?.objectiveId || "").trim();
      const objectiveMastered = Boolean(meta?.objectiveMastered);
      const masteryBadgeIds = objectiveMastered ? unlockBadgesByMastery(objectiveId) : [];
      const mergedBadgeIds = Array.from(new Set([...(ev.badgeIds || []), ...masteryBadgeIds]));
      if (masteryBadgeIds.length > 0) {
        masteryBadgeIds.forEach((bid) =>
          appendTechnical({
            channel: "player",
            kind: "badge_unlock",
            message: `Badge [${bid}] Unlocked - Criteria: Mastery Level Reached`,
            detail: { badgeId: bid, objectiveId },
          }),
        );
        setUnlockedBadges((prev) => Array.from(new Set([...prev, ...masteryBadgeIds])));
      }
      appendTechnical({
        channel: "player",
        kind: meta.kind || "player_action",
        message: actionLabel,
        detail: {
          ...meta,
          matchedRules: ev.matchedRules,
          pointsDelta: resolvedPoints,
          badgeIds: mergedBadgeIds,
          universal: ev.universal,
        },
      });
      setLastRuleRun({
        action: actionLabel,
        matchedRules: ev.matchedRules,
        pointsDelta: resolvedPoints,
        badgeIds: mergedBadgeIds,
        ok: ev.matchedRules.length > 0 || resolvedPoints > 0 || mergedBadgeIds.length > 0,
        universal: ev.universal,
      });
      return { ...ev, badgeIds: mergedBadgeIds };
    },
    [pkg, specBlueprint, appendTechnical, unlockBadgesByMastery],
  );

  const applyLabAction = useCallback(
    (actionLabel, meta = {}) => {
      if (!pkg) {
        appendTechnical({ channel: "lab", kind: "error", message: "No package loaded", detail: meta });
        return null;
      }
      const ev = evaluateUniversalTrigger(pkg, specBlueprint, actionLabel, meta);
      const pointsOverride = Number(meta?.pointsOverride || 0);
      const resolvedPoints = pointsOverride > 0 ? pointsOverride : ev.pointsDelta;
      appendTechnical({
        channel: "lab",
        kind: "simulation",
        message: actionLabel,
        detail: {
          ...meta,
          matchedRules: ev.matchedRules,
          pointsDelta: resolvedPoints,
          badgeIds: ev.badgeIds,
          logicDefsCount: ev.logicDefinitions?.length ?? 0,
          universal: ev.universal,
        },
      });
      setLastRuleRun({
        action: actionLabel,
        matchedRules: ev.matchedRules,
        pointsDelta: resolvedPoints,
        badgeIds: ev.badgeIds,
        ok: ev.matchedRules.length > 0 || resolvedPoints > 0 || ev.badgeIds.length > 0,
        universal: ev.universal,
      });
      if (ev.logicDefinitions?.length) {
        appendTechnical({
          channel: "lab",
          kind: "logic",
          message: "DSL logic rules present (evaluate server-side for full truth)",
          detail: { ids: ev.logicDefinitions.map((d) => d.id) },
        });
      }
      if (resolvedPoints > 0) {
        setLabXp((x) => x + resolvedPoints);
        setLastLabPop({ type: "points", value: `+${resolvedPoints} XP` });
      }
      if (ev.badgeIds.length > 0) {
        setLabBadges((b) => Array.from(new Set([...b, ...ev.badgeIds])));
        setLastLabPop({ type: "badge", value: ev.badgeIds.join(", ") });
      }
      logUniversalEvent({
        action_id: String(actionLabel).slice(0, 160),
        result:
          (ev.matchedRules || []).length > 0
            ? "rule_match"
            : resolvedPoints > 0
              ? "points_awarded"
              : "no_match",
        detail: {
          points_delta: resolvedPoints,
          rule_hits: (ev.matchedRules || []).length,
          suite: meta.suite ?? null,
          resolution_path: ev.universal?.resolutionPath,
        },
      });
      return ev;
    },
    [pkg, specBlueprint, appendTechnical, logUniversalEvent],
  );

  const recordPlayerEvent = useCallback(
    (actionLabel, meta = {}) => {
      return handleTrigger(actionLabel, meta);
    },
    [handleTrigger],
  );

  const resetLabSession = useCallback(() => {
    setLabXp(0);
    setLabBadges([]);
    setUnlockedBadges([]);
    setLastLabPop(null);
  }, []);

  const value = useMemo(
    () => ({
      specId: validSid,
      approved,
      pkg,
      specBlueprint,
      logUniversalEvent,
      loading,
      error,
      loadPackage,
      technicalLog,
      clearTechnicalLog,
      labXp,
      labBadges,
      unlockedBadges,
      lastLabPop,
      clearLabPop,
      evaluateAction,
      applyLabAction,
      handleTrigger,
      recordPlayerEvent,
      resetLabSession,
      lastRuleRun,
    }),
    [
      validSid,
      approved,
      pkg,
      specBlueprint,
      logUniversalEvent,
      loading,
      error,
      loadPackage,
      technicalLog,
      clearTechnicalLog,
      labXp,
      labBadges,
      unlockedBadges,
      lastLabPop,
      clearLabPop,
      evaluateAction,
      applyLabAction,
      handleTrigger,
      recordPlayerEvent,
      resetLabSession,
      lastRuleRun,
    ],
  );

  return <RealizationContext.Provider value={value}>{children}</RealizationContext.Provider>;
}

export function useRealization() {
  const ctx = useContext(RealizationContext);
  if (!ctx) throw new Error("useRealization must be used within RealizationProvider");
  return ctx;
}
