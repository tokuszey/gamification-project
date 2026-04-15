import axios from "axios";
import confetti from "canvas-confetti";
import { Activity, Loader2, Lock, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL as API } from "../../config";
import { useRealization } from "../../context/RealizationContext.jsx";
import { firstMeaningfulLine, getAssessmentRationaleExcerpt } from "../../lib/universalSpecEngine.js";
import BadgeCollection from "./BadgeCollection.jsx";
import BadgeUnlockModal from "./BadgeUnlockModal.jsx";
import FloatingXpBurst from "./FloatingXpBurst.jsx";
import {
  AVATAR_PRESETS,
  buildQuestRows,
  collectBadgeCatalog,
  extractS18QuizQuestions,
  findProfileCustomizationQuest,
  inferQuestCategoryFromTitle,
  resolveSpecRoleTitle,
} from "./configParser.js";
import FormativeFeedbackPanel from "./FormativeFeedbackPanel.jsx";
import LearningObjectivesBar from "./LearningObjectivesBar.jsx";
import MasteryLeaderboard from "./MasteryLeaderboard.jsx";
import PlayerEventLog from "./PlayerEventLog.jsx";
import PlayerRuntimeShop from "./PlayerRuntimeShop.jsx";
import {
  QuestAppliedTaskModal,
  QuestHazardModal,
  QuestProfileModal,
  QuestQuizModal,
  QuestReflectionModal,
  QuestSocialTaskModal,
} from "./QuestInteractionModals.jsx";
import QuestTaskList from "./QuestTaskList.jsx";
import PlayerRuntimeShell from "./PlayerRuntimeShell.jsx";
import RuntimeStatusCard from "./RuntimeStatusCard.jsx";
import StatBarHeader, { roleTitleForLevel } from "./StatBarHeader.jsx";
import ToastStack from "./ToastStack.jsx";
import { usePersistedPlayerState } from "./usePersistedPlayerState.js";
import {
  averageMasteryRatio,
  buildMicroQuizFromQuest,
  buildWorkbookQuestRows,
  countObjectivesMastered,
  computeUnlockedQuestOrders,
  formatDiminishingNote,
  getQuestLockReason,
  getWorkbook,
  isQuestDone,
  masteryTierFromRatio,
  resolveInteractionFlow,
} from "./workbookRuntime.js";

function pushToast(setToasts, message, variant) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  setToasts((prev) => [...prev, { id, message, variant }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 4500);
}

function buildAlwaysOnSocialQuests(primaryObjectiveId) {
  const oid = String(primaryObjectiveId || "LO_SOCIAL_CORE").trim() || "LO_SOCIAL_CORE";
  return [
    {
      order: 9101,
      taskId: "SOCIAL_PROFILE_CORE",
      title: "Customize your profile",
      description: "Update display name, title, or avatar to strengthen your runtime identity.",
      prerequisiteOrder: null,
      difficultyLabel: "Easy",
      rewardXp: 24,
      rewardGold: 8,
      rewardLabel: "+24 XP, +8 Gold",
      questKind: "profile",
      questCategory: "social",
      objectiveId: oid,
      ruleActionLabel: "Customize your profile",
    },
    {
      order: 9102,
      taskId: "SOCIAL_SHARE_CORE",
      title: "Share this week’s learning",
      description: "Share a weekly takeaway with your team / cohort and capture feedback context.",
      prerequisiteOrder: null,
      difficultyLabel: "Medium",
      rewardXp: 32,
      rewardGold: 11,
      rewardLabel: "+32 XP, +11 Gold",
      questKind: "generic",
      questCategory: "social",
      objectiveId: oid,
      ruleActionLabel: "Social share",
    },
    {
      order: 9103,
      taskId: "SOCIAL_REFLECTION_CORE",
      title: "Write a short retrospective for the community",
      description: "Add a brief note on what you learned this week and your next step to the community flow.",
      prerequisiteOrder: null,
      difficultyLabel: "Medium",
      rewardXp: 28,
      rewardGold: 9,
      rewardLabel: "+28 XP, +9 Gold",
      questKind: "generic",
      questCategory: "social",
      objectiveId: oid,
      ruleActionLabel: "Share retrospective",
    },
  ];
}

const MILESTONE_BADGES = [
  { id: "badge_social_all", label: "Social Specialist", rarity: "rare" },
  { id: "badge_half_complete", label: "Halfway Hero", rarity: "epic" },
  { id: "badge_all_complete", label: "Mission Complete", rarity: "legendary" },
];
const MILESTONE_BADGE_IDS = new Set(MILESTONE_BADGES.map((b) => b.id));

export default function PlayerRuntime({
  specId,
  specStatus,
  specTitle,
  username,
  onGoHome,
  onGoSpecStudio,
  onLeave,
  hexadHint,
  styles: appStyles,
}) {
  const approved = String(specStatus || "").toLowerCase() === "approved";
  const sid = specId ? Number(specId) : null;
  const validSid = sid && !Number.isNaN(sid) ? sid : null;

  const { pkg, loading, error, loadPackage, handleTrigger, unlockedBadges, specBlueprint } = useRealization();
  const progress = usePersistedPlayerState(validSid);
  const { setState: setProgressState } = progress;

  const [toasts, setToasts] = useState([]);
  const [xpBurst, setXpBurst] = useState(null);
  const [badgeModalBadges, setBadgeModalBadges] = useState(null);
  const [questFlow, setQuestFlow] = useState(null);
  const [formativeFeedback, setFormativeFeedback] = useState(null);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const clearXpBurst = useCallback(() => setXpBurst(null), []);
  const clearBadgeModal = useCallback(() => setBadgeModalBadges(null), []);

  const loginName = (username && String(username).trim()) || "Player";
  const effectiveDisplayName =
    (progress.profileCosmetics?.nickname && String(progress.profileCosmetics.nickname).trim()) || loginName;

  useEffect(() => {
    if (approved && validSid) void loadPackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, validSid]);

  useEffect(() => {
    if (!validSid || !approved || !username) return;
    let alive = true;
    axios
      .get(`${API}/api/v1/game-state`, {
        params: { player_key: String(username).trim(), spec_id: validSid },
      })
      .then((res) => {
        if (!alive) return;
        const remote = res.data || {};
        setProgressState((prev) => ({
          ...prev,
          xp: typeof remote.xp === "number" ? remote.xp : prev.xp,
          virtualCurrency:
            typeof remote.virtual_currency === "number"
              ? remote.virtual_currency
              : prev.virtualCurrency,
          badges: Array.isArray(remote.badges) ? remote.badges : prev.badges,
          shopOwnedIds: Array.isArray(remote.shop_owned_ids)
            ? remote.shop_owned_ids
            : prev.shopOwnedIds,
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [validSid, approved, username, setProgressState]);

  useEffect(() => {
    if (!validSid || !approved || !username) return;
    const t = setTimeout(() => {
      axios
        .put(`${API}/api/v1/game-state`, {
          player_key: String(username).trim(),
          spec_id: validSid,
          xp: progress.xp,
          level: progress.level,
          virtual_currency: progress.virtualCurrency,
          badges: progress.badges,
          shop_owned_ids: progress.shopOwnedIds || [],
        })
        .catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [
    validSid,
    approved,
    username,
    progress.xp,
    progress.level,
    progress.virtualCurrency,
    progress.badges,
    progress.shopOwnedIds,
  ]);

  const dp = pkg;
  const displaySpecTitle = useMemo(
    () => String(specBlueprint?.meta?.title || specTitle || dp?.gamification_config?.title || "").trim(),
    [specBlueprint, specTitle, dp],
  );
  const objectivesPanelTitle = useMemo(() => {
    const s03 = String(specBlueprint?.sections?.s03_core_learning_objectives || "").trim();
    return firstMeaningfulLine(s03) || displaySpecTitle;
  }, [specBlueprint, displaySpecTitle]);
  const objectivesPanelHint = useMemo(() => {
    const s03 = String(specBlueprint?.sections?.s03_core_learning_objectives || "").trim();
    const s01 = String(specBlueprint?.sections?.s01_intro || "").trim();
    const rest03 = s03.replace(/^[^\n]+\n?/, "").trim();
    const parts = [];
    if (rest03) parts.push(rest03.length > 400 ? `${rest03.slice(0, 400)}…` : rest03);
    if (s01 && rest03.length < 120) {
      const rest01 = s01.replace(/^[^\n]+\n?/, "").trim();
      if (rest01) parts.push(rest01.length > 280 ? `${rest01.slice(0, 280)}…` : rest01);
    }
    return parts.join("\n\n");
  }, [specBlueprint]);
  const teamFlowTitle = useMemo(
    () =>
      firstMeaningfulLine(specBlueprint?.sections?.s14_user_stories) ||
      firstMeaningfulLine(specBlueprint?.sections?.s09_narrative) ||
      displaySpecTitle,
    [specBlueprint, displaySpecTitle],
  );
  const teamFlowHint = useMemo(() => {
    const s14 = String(specBlueprint?.sections?.s14_user_stories || "").trim();
    if (s14) {
      const rest = s14.replace(/^[^\n]+\n?/, "").trim();
      return rest.length > 360 ? `${rest.slice(0, 360)}…` : rest;
    }
    const s01 = String(specBlueprint?.sections?.s01_intro || "").trim();
    return s01.length > 360 ? `${s01.slice(0, 360)}…` : s01;
  }, [specBlueprint]);
  const workbook = useMemo(() => getWorkbook(dp), [dp]);
  const workbookQuests = useMemo(() => buildWorkbookQuestRows(dp), [dp]);
  const quests = useMemo(
    () => (workbookQuests && workbookQuests.length ? workbookQuests : buildQuestRows(dp)),
    [dp, workbookQuests],
  );
  const dynamicHasProfileQuest = useMemo(
    () => (quests || []).some((q) => String(q?.questKind || "") === "profile"),
    [quests],
  );
  const usingWorkbook = Boolean(workbook && workbookQuests?.length);
  /** With a workbook flow, social steps come only from the spec’s quest rows — no synthetic missions. */
  const socialMissions = useMemo(() => {
    if (usingWorkbook) {
      return (quests || []).filter((q) => String(q?.questCategory || "").toLowerCase() === "social");
    }
    const firstObjectiveId =
      (workbook?.core_learning_objectives || [])
        .map((o) => String(o?.objective_id || "").trim())
        .find(Boolean) || null;
    const alwaysOn = buildAlwaysOnSocialQuests(firstObjectiveId);
    return alwaysOn.filter(
      (q) => !(dynamicHasProfileQuest && String(q.taskId || "") === "SOCIAL_PROFILE_CORE"),
    );
  }, [usingWorkbook, quests, workbook, dynamicHasProfileQuest]);
  const quizCatalog = useMemo(() => extractS18QuizQuestions(dp), [dp]);
  const badgeCatalog = useMemo(() => [...MILESTONE_BADGES], []);
  const badgeUnlockHints = useMemo(() => {
    const rules = Array.isArray(dp?.rules) ? dp.rules : [];
    const allQuests = [...(quests || []), ...(socialMissions || [])];
    const allQuestLabels = allQuests.map((q) => [q?.title, q?.ruleActionLabel].filter(Boolean).join(" | ").toLowerCase());
    const tokenize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff\s]/gi, " ")
        .split(/\s+/)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3);
    const scoreQuestMatch = (quest, trigger, badgeId) => {
      const title = String(quest?.title || "").toLowerCase();
      const action = String(quest?.ruleActionLabel || "").toLowerCase();
      const bag = `${title} ${action}`;
      const tTokens = new Set(tokenize(trigger));
      const bTokens = new Set(tokenize(badgeId));
      let score = 0;
      if (title.includes(trigger) || trigger.includes(title)) score += 8;
      if (action.includes(trigger) || trigger.includes(action)) score += 7;
      tTokens.forEach((tk) => {
        if (bag.includes(tk)) score += 2;
      });
      bTokens.forEach((tk) => {
        if (bag.includes(tk)) score += 1;
      });
      const cat = String(quest?.questCategory || "").toLowerCase();
      if (/social|team|cohort|share|collab/.test(`${trigger} ${badgeId}`) && cat === "social") score += 3;
      if (/profile|avatar|title|nickname/.test(`${trigger} ${badgeId}`) && String(quest?.questKind || "") === "profile") score += 4;
      return score;
    };
    const hintMap = {};
    rules.forEach((r) => {
      const trigger = String(r?.trigger_action || "").trim();
      if (!trigger) return;
      const triggerLow = trigger.toLowerCase();
      for (const rawBadge of r?.effect?.badge_ids || []) {
        const bid = String(rawBadge || "").trim().replace(/\s+/g, "_").slice(0, 48);
        if (!bid || hintMap[bid]) continue;
        const ranked = allQuests
          .map((q, idx) => ({ q, idx, score: scoreQuestMatch(q, triggerLow, bid.toLowerCase()) }))
          .sort((a, b) => b.score - a.score || a.idx - b.idx);
        const picked = ranked.slice(0, 2).map((x) => x.q?.title).filter(Boolean);
        if (picked.length > 0) {
          hintMap[bid] = `Complete one of these quests: ${picked.join(" / ")}.`;
          continue;
        }
        const fallbackTitles = allQuests.map((q) => q?.title).filter(Boolean).slice(0, 2);
        hintMap[bid] =
          fallbackTitles.length > 0
            ? `Complete one of these quests: ${fallbackTitles.join(" / ")}.`
            : "Complete any runtime quest; the badge rule will trigger automatically.";
      }
    });
    // Katalogda olup kuraldan gelmeyen rozetler de mutlaka bir goreve baglansin.
    (badgeCatalog || []).forEach((b) => {
      if (!b?.id || hintMap[b.id]) return;
      const ranked = allQuests
        .map((q, idx) => ({ q, idx, score: scoreQuestMatch(q, String(b.label || ""), String(b.id || "")) }))
        .sort((a, b2) => b2.score - a.score || a.idx - b2.idx);
      const picked = ranked.slice(0, 2).map((x) => x.q?.title).filter(Boolean);
      if (picked.length > 0) {
        hintMap[b.id] = `Complete one of these quests: ${picked.join(" / ")}.`;
      } else {
        hintMap[b.id] = "Complete any runtime quest; the badge rule will trigger automatically.";
      }
    });
    hintMap.badge_social_all = "Complete every step on the team missions board.";
    hintMap.badge_half_complete = "Complete at least half of all quests.";
    hintMap.badge_all_complete = "Complete every quest.";
    return hintMap;
  }, [dp, quests, socialMissions, badgeCatalog]);
  const profileQuestForBonus = useMemo(() => findProfileCustomizationQuest(quests), [quests]);
  const unlockedQuestOrders = useMemo(
    () => computeUnlockedQuestOrders(quests, progress, usingWorkbook ? workbook : null),
    [quests, progress.completedQuestOrders, progress.completedTaskIds, progress.objectiveXp, usingWorkbook, workbook],
  );
  const specRoleTitle = useMemo(
    () => resolveSpecRoleTitle(progress.level, dp) || roleTitleForLevel(progress.level),
    [progress.level, dp],
  );
  const displayRoleTitle = progress.profileCosmetics?.displayTitle || specRoleTitle;
  const headerAvatarStyle = useMemo(() => {
    const id = progress.profileCosmetics?.avatarPresetId;
    return AVATAR_PRESETS.find((p) => p.id === id)?.style ?? null;
  }, [progress.profileCosmetics]);
  const questDone = useMemo(() => {
    if (usingWorkbook) {
      return quests.filter((q) => isQuestDone(q, progress, usingWorkbook ? workbook : null)).length;
    }
    return quests.filter((q) => progress.completedQuestOrders.includes(q.order)).length;
  }, [quests, usingWorkbook, workbook, progress]);
  const badgesEarned = progress.badges.length;
  const masteryAvg = usingWorkbook ? averageMasteryRatio(progress, workbook) : 0;
  const objectivesMastered =
    usingWorkbook && workbook ? countObjectivesMastered(progress, workbook) : 0;
  const objectiveCount = usingWorkbook ? (workbook?.core_learning_objectives || []).length : 0;
  const playerMasteryTier = usingWorkbook ? masteryTierFromRatio(masteryAvg) : null;
  const masteryCompleted = Math.round(masteryAvg * 100) >= 100;
  const hasInstructorValidation = Boolean(progress.instructorValidation?.validatedAt);
  const certificateUnlocked = masteryCompleted && hasInstructorValidation;
  const hasGameplayFlow =
    (Array.isArray(dp?.gamification_config?.gameplay_phases) && dp.gamification_config.gameplay_phases.length > 0) ||
    (Array.isArray(workbookQuests) && workbookQuests.length > 0) ||
    Boolean(quests?.length);
  const questCompletionRatio = quests.length ? questDone / quests.length : 0;
  const baseMomentum = Math.round(masteryAvg * 100);
  const questMomentumBonus = Math.round(questCompletionRatio * 28);
  const streakMomentumBonus = Math.min(10, Math.round((progress.streakDays || 0) * 0.8));
  const socialMomentumBonus = Math.min(20, Number(progress.socialContributionPoints || 0));
  const socialMissionTotal = (socialMissions || []).length;
  const socialMissionDone = useMemo(() => {
    const wb = usingWorkbook ? workbook : null;
    return (socialMissions || []).filter((m) => isQuestDone(m, progress, wb)).length;
  }, [socialMissions, progress, usingWorkbook, workbook]);
  const socialMissionFillPct =
    socialMissionTotal > 0 ? Math.min(100, Math.round((socialMissionDone / socialMissionTotal) * 100)) : 0;
  /** Cohort termometresi: Ekip gorevleri varsa 0–20 arasi tamamen gorev tamamlanma orani; yoksa katki puani. */
  const socialCohortSlice =
    socialMissionTotal > 0
      ? Math.round(20 * (socialMissionDone / socialMissionTotal))
      : socialMomentumBonus;
  const cohortMomentum = Math.max(12, Math.min(99, baseMomentum + questMomentumBonus + streakMomentumBonus + socialCohortSlice));

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const runConfetti = useCallback((strong) => {
    const count = strong ? 120 : 55;
    confetti({
      particleCount: count,
      spread: strong ? 85 : 65,
      origin: { y: 0.65 },
      colors: ["#22d3ee", "#34d399", "#a7f3d0", "#fbbf24", "#d946ef"],
    });
  }, []);

  const handleShopPurchase = useCallback(
    (itemId, cost) => {
      if (itemId === "item_gold_boost") {
        if (progress.purchaseShopItem(itemId, cost)) {
          progress.addVirtualCurrency(25);
          progress.pushEvent("Shop: +25 Gold boost purchased.", {
            actionType: "shop_purchase",
            meta: { itemId, goldBoost: 25 },
          });
        }
        return;
      }
      if (progress.purchaseShopItem(itemId, cost)) {
        progress.pushEvent(`Shop: purchased ${itemId}`, {
          actionType: "shop_purchase",
          meta: { itemId },
        });
      }
    },
    [progress],
  );

  const finalizeQuestReward = useCallback(
    (q, point, metaExtra = {}) => {
      if (!dp) return;
      const objectiveId = String(q?.objectiveId || "").trim();
      if (!objectiveId) {
        progress.pushEvent(`Policy guard: objective_id missing for '${q?.title || "quest"}'. XP blocked.`, {
          actionType: "policy_violation",
          meta: {
            policy: "xp_objective_1to1",
            questOrder: q?.order ?? null,
            taskId: q?.taskId || null,
          },
        });
        pushToast(
          setToasts,
          "This quest has no objective_id; reward blocked under the 1:1 XP policy.",
          "info",
        );
        return;
      }
      const isProfileCustomizationFlow =
        String(q?.questKind || "").toLowerCase() === "profile" || Boolean(metaExtra?.profileCustomization);
      if (
        String(q?.questCategory || "").toLowerCase() === "social" &&
        !isProfileCustomizationFlow &&
        !metaExtra?.contributionCheckPassed
      ) {
        pushToast(setToasts, "Social quest rewards require contribution confirmation.", "info");
        return;
      }
      if (usingWorkbook && workbook) {
        const reason = getQuestLockReason(q, progress, workbook);
        if (reason) {
          pushToast(setToasts, reason.detail || reason.message, "info");
          return;
        }
      } else if (q.prerequisiteOrder && !progress.completedQuestOrders.includes(q.prerequisiteOrder)) {
        pushToast(setToasts, "This quest is locked. Complete the previous quest first.", "info");
        return;
      }
      const actionLabel = q.ruleActionLabel || q.title;
      const wbFlow = dp?.workbook?.formative_quiz_flow;
      const dim = typeof wbFlow?.diminishing_factor_per_retry === "number" ? wbFlow.diminishing_factor_per_retry : 0.78;
      const attemptsBefore = q.taskId ? progress.questAttemptCounts?.[q.taskId] ?? 0 : 0;
      const factor = q.taskId ? dim ** attemptsBefore : 1;
      const estimatedXpGain = Math.max(1, Math.floor(Math.max(1, Number(q.rewardXp || 0)) * factor));
      const objectiveDef = (workbook?.core_learning_objectives || []).find(
        (o) => String(o?.objective_id || "") === objectiveId,
      );
      const objectiveThreshold = Math.max(
        1,
        typeof objectiveDef?.mastery_threshold === "number" ? objectiveDef.mastery_threshold : 100,
      );
      const objectiveBefore = Number(progress.objectiveXp?.[objectiveId] || 0);
      const ev = handleTrigger(actionLabel, {
        kind: "quest_complete",
        source: "player_runtime",
        ...metaExtra,
        objectiveId,
        objectiveMastered: objectiveBefore + estimatedXpGain >= objectiveThreshold,
      });
      const { pointsDelta } = ev;
      const xpBase = Math.max(q.rewardXp, pointsDelta);
      const xpGain = Math.max(1, Math.floor(xpBase * factor));
      const allRuntimeQuests = Array.from(
        new Map(
          [...(quests || []), ...(socialMissions || [])].map((qq) => [
            qq.taskId ? `task:${qq.taskId}` : `order:${qq.order}`,
            qq,
          ]),
        ).values(),
      );
      const wbForDone = usingWorkbook && workbook ? workbook : null;
      const ordersAfter = new Set((progress.completedQuestOrders || []).map((o) => Number(o)));
      const tasksAfter = new Set((progress.completedTaskIds || []).map((t) => String(t)));
      if (q.order != null) ordersAfter.add(Number(q.order));
      if (q.taskId) tasksAfter.add(String(q.taskId));
      const progressAfter = {
        ...progress,
        completedQuestOrders: Array.from(ordersAfter),
        completedTaskIds: Array.from(tasksAfter),
      };
      const isDoneAfter = (qq) => isQuestDone(qq, progressAfter, wbForDone);
      const isSocialQuest = (qq) => {
        if (String(qq?.questCategory || "").toLowerCase() === "social") return true;
        return inferQuestCategoryFromTitle(qq?.title || "", qq?.description || "") === "social";
      };
      // Sosyal rozet: Ekip gorevleri panosu kaynak; yoksa tum runtime'daki social kategorisi.
      const socialQuestsForBadge =
        (socialMissions || []).length > 0 ? socialMissions : allRuntimeQuests.filter(isSocialQuest);
      const socialAllDone =
        socialQuestsForBadge.length > 0 && socialQuestsForBadge.every((qq) => isDoneAfter(qq));
      const totalCount = allRuntimeQuests.length || 1;
      const completedCount = allRuntimeQuests.filter((qq) => isDoneAfter(qq)).length;
      const halfDone = completedCount >= Math.ceil(totalCount * 0.5);
      const allDone = completedCount >= totalCount;
      const earnedSet = new Set([...(progress.badges || []), ...(unlockedBadges || [])].map((x) => String(x)));
      const milestoneBadges = [];
      if (socialAllDone && !earnedSet.has("badge_social_all")) milestoneBadges.push("badge_social_all");
      if (halfDone && !earnedSet.has("badge_half_complete")) milestoneBadges.push("badge_half_complete");
      if (allDone && !earnedSet.has("badge_all_complete")) milestoneBadges.push("badge_all_complete");
      const awardedBadgeIds = Array.from(new Set([...milestoneBadges]));
      const goldExtra = q.rewardGold || 0;
      const sharedMomentumDelta = Math.max(0, Number(metaExtra?.sharedMomentumDelta || 0));
      progress.addProgress(xpGain, awardedBadgeIds, q.order, {
        goldBonus: goldExtra,
        objectiveId,
        objectiveContrib: xpGain,
        taskId: q.taskId || undefined,
        bumpTaskAttempt: Boolean(q.taskId),
      });
      if (sharedMomentumDelta > 0) {
        setProgressState((prev) => ({
          ...prev,
          socialContributionPoints: Math.max(0, Number(prev.socialContributionPoints || 0) + sharedMomentumDelta),
        }));
      }
      progress.pushEvent(
        `${effectiveDisplayName} completed ${q.title} → +${xpGain} XP (objective ${q.objectiveId || "—"})${goldExtra ? `, +${goldExtra} Gold` : ""}${sharedMomentumDelta ? `, +${sharedMomentumDelta} Cohort` : ""}`,
        {
          actionType: "quest_complete",
          meta: {
            questOrder: q.order,
            taskId: q.taskId || null,
            objectiveId,
            xpGain,
            goldExtra,
            sharedMomentumDelta,
          },
        },
      );
      if (xpGain > 0 && point) {
        setXpBurst({
          id: `${Date.now()}_qx`,
          x: point.x,
          y: point.y,
          amount: xpGain,
        });
      }
      pushToast(setToasts, `Quest complete: ${q.title} (+${xpGain} XP) · ${objectiveId}`, "success");
      if (usingWorkbook && workbook && wbFlow?.immediate_feedback !== false) {
        const successLine =
          String(wbFlow?.success_feedback || "").trim() ||
          firstMeaningfulLine(specBlueprint?.sections?.s18_assessment) ||
          "";
        const feedbackTitle =
          firstMeaningfulLine(String(wbFlow?.success_feedback || specBlueprint?.sections?.s18_assessment || q.title)) ||
          String(q.title || "").trim();
        const retryParts = [String(wbFlow?.retry_feedback || "").trim(), getAssessmentRationaleExcerpt(specBlueprint, 260)].filter(
          Boolean,
        );
        setFormativeFeedback({
          title: feedbackTitle,
          body: `${q.title} · ${objectiveId}. ${successLine}`.trim(),
          diminishingNote: q.taskId ? formatDiminishingNote(workbook, factor) : null,
          retryHint: retryParts.length ? retryParts.join("\n\n") : null,
        });
      }
      if (awardedBadgeIds.length === 0) runConfetti(false);
      if (awardedBadgeIds.length) {
        // Milestone rozetleri görev tamamlandığı anda anlık açılır.
        awardedBadgeIds.forEach((id) =>
          progress.pushEvent(`Unlocked '${String(id).replace(/_/g, " ")}' badge!`, {
            actionType: "badge_unlock",
            meta: { badgeId: id },
          }),
        );
        setBadgeModalBadges(awardedBadgeIds);
        pushToast(setToasts, `Badge: ${awardedBadgeIds.join(", ")}`, "badge");
      }
    },
    [
      dp,
      progress,
      runConfetti,
      effectiveDisplayName,
      handleTrigger,
      usingWorkbook,
      workbook,
      setProgressState,
      unlockedBadges,
      quests,
      socialMissions,
      setToasts,
      specBlueprint,
    ],
  );

  const handleBeginQuest = useCallback(
    (q, point) => {
      if (!dp) return;
      if (usingWorkbook && workbook) {
        const reason = getQuestLockReason(q, progress, workbook);
        if (reason) {
          pushToast(setToasts, reason.detail || reason.message, "info");
          return;
        }
      } else if (q.prerequisiteOrder && !progress.completedQuestOrders.includes(q.prerequisiteOrder)) {
        pushToast(setToasts, "This quest is locked. Complete the previous quest first.", "info");
        return;
      }
      setQuestFlow({ quest: q, point });
    },
    [dp, progress, usingWorkbook, workbook],
  );

  const closeQuestFlow = useCallback(() => setQuestFlow(null), []);

  const tryAwardProfileQuestFromHeader = useCallback(
    (cosPoint) => {
      const pq = profileQuestForBonus;
      if (!pq || !dp) {
        pushToast(setToasts, "Profile updated.", "success");
        return;
      }
      const wb = usingWorkbook ? workbook : null;
      const done = wb ? isQuestDone(pq, progress, wb) : isQuestDone(pq, progress);
      if (done) {
        pushToast(setToasts, "Profile updated.", "success");
        return;
      }
      if (wb && getQuestLockReason(pq, progress, wb)) {
        pushToast(
          setToasts,
          "Profile saved. No reward applied because the quest is locked.",
          "info",
        );
        return;
      }
      if (!usingWorkbook && pq.prerequisiteOrder != null) {
        const po = pq.prerequisiteOrder;
        const ok = (progress.completedQuestOrders || []).some((o) => Number(o) === Number(po));
        if (!ok) {
          pushToast(
            setToasts,
            "Profile saved. No reward applied because the quest is locked.",
            "info",
          );
          return;
        }
      }
      finalizeQuestReward(pq, cosPoint, { profileCustomization: true, source: "profile_header" });
    },
    [
      profileQuestForBonus,
      dp,
      usingWorkbook,
      workbook,
      progress,
      finalizeQuestReward,
    ],
  );

  const questInteraction = useMemo(
    () => (questFlow?.quest ? resolveInteractionFlow(questFlow.quest) : null),
    [questFlow],
  );
  const microQuizForQuest = useMemo(() => {
    if (!questFlow?.quest || questInteraction !== "workbook_formative") return [];
    return buildMicroQuizFromQuest(questFlow.quest);
  }, [questFlow, questInteraction]);

  if (!specId) {
    return (
      <RuntimeStatusCard
        tone="info"
        chipIcon={<Sparkles className="h-4 w-4" />}
        chipText="Player Runtime"
        title="No spec selected"
        description="Pick a spec to start the runtime experience. Create and approve it in Spec Studio; this screen will load quests automatically."
        primaryAction={
          <button type="button" className="gf-pr-btn-primary" onClick={() => onGoSpecStudio?.()}>
            Go to Spec Studio
          </button>
        }
        secondaryAction={
          <button
            type="button"
            className="gf-pr-icon-btn gf-pr-status-secondary-btn"
            onClick={() => onGoHome?.()}
          >
            Home
          </button>
        }
      />
    );
  }

  if (!approved) {
    return (
      <RuntimeStatusCard
        tone="warning"
        chipIcon={<Activity className="h-4 w-4" />}
        chipText="Awaiting approval"
        title="Spec approval required"
        description={
          <>
            Player Runtime only calls{" "}
            <code className="rounded-md bg-black/40 px-1.5 py-0.5 text-cyan-300/90">/api/v1/realize</code> for approved
            specs. Finish the approval step in Spec Studio.
          </>
        }
        primaryAction={
          <button type="button" className="gf-pr-btn-primary" onClick={() => onGoSpecStudio?.()}>
            Go to Spec Studio
          </button>
        }
      />
    );
  }

  const st = appStyles || {};

  return (
    <div
      className="gf-pr-page relative min-h-0 overflow-x-hidden"
      style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
    >
      <div className="gf-pr-ambient" aria-hidden />
      <div className="gf-pr-grid-accent" aria-hidden />
      <div className="gf-pr-glow-blue" aria-hidden />
      <div className="gf-pr-glow-green" aria-hidden />
      <div className="gf-pr-hud-line" aria-hidden />

      <PlayerRuntimeShell
        onGoHome={onGoHome}
        onLeave={onLeave}
        specTitle={displaySpecTitle}
        onEditProfile={() => setHeaderProfileOpen(true)}
        topProfile={
          usingWorkbook ? undefined : (
            <div id="player-header" className="gf-pr-scroll-mt">
              <StatBarHeader
                displayName={effectiveDisplayName}
                roleTitle={displayRoleTitle}
                level={progress.level}
                xp={progress.xp}
                virtualCurrency={progress.virtualCurrency}
                streakDays={progress.streakDays ?? 0}
                avatarStyle={headerAvatarStyle}
                onEditProfile={() => setHeaderProfileOpen(true)}
              />
            </div>
          )
        }
      >
        <div className="gf-pr-runtime-layout">
          <div id="player-header" className="gf-pr-runtime-header gf-pr-scroll-mt">
            <section className="gf-pr-top-profile">
              <div className="gf-pr-top-avatar" style={headerAvatarStyle || undefined}>
                {(effectiveDisplayName || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="gf-pr-top-name">{effectiveDisplayName}</div>
                <div className="gf-pr-top-role">{displayRoleTitle || "Senior Researcher"}</div>
                <button type="button" className="gf-pr-profile-edit-link" onClick={() => setHeaderProfileOpen(true)}>
                  Edit profile
                </button>
              </div>
            </section>
            <section className="gf-pr-top-mastery">
              <div className="gf-pr-top-title">Mastery Progress</div>
              <div className="gf-pr-top-meter-track">
                <div className="gf-pr-top-meter-fill" style={{ width: `${Math.round(masteryAvg * 100)}%` }} />
                <div className="gf-pr-top-meter-label">
                  {playerMasteryTier?.label ||
                    firstMeaningfulLine(specBlueprint?.sections?.s03_core_learning_objectives) ||
                    displaySpecTitle}
                </div>
              </div>
              <div className="gf-pr-top-meter-sub">Unit Mastery: %{Math.round(masteryAvg * 100)}</div>
            </section>
            <section className="gf-pr-top-streak">
              <div className="gf-pr-top-title">Consistency Streak</div>
              <div className="gf-pr-top-streak-value">{progress.streakDays || 0}</div>
              <div className="gf-pr-top-meter-sub">DAILY CONSISTENCY</div>
            </section>
          </div>

          <div id="player-objectives" className="gf-pr-objectives-section gf-pr-scroll-mt">
            <LearningObjectivesBar
              workbook={usingWorkbook && workbook ? workbook : { core_learning_objectives: [] }}
              objectiveXp={progress.objectiveXp}
              panelTitle={objectivesPanelTitle}
              panelHint={objectivesPanelHint}
              specS03Fallback={
                !(usingWorkbook && (workbook?.core_learning_objectives || []).length)
                  ? String(specBlueprint?.sections?.s03_core_learning_objectives || "").trim()
                  : ""
              }
            />
          </div>

          <div className="gf-pr-runtime-grid">
            <div className="gf-pr-runtime-left">
              <section className="gf-pr-command-deck">
                <div className="gf-pr-command-title">Quest Board</div>
                <div className="gf-pr-command-actions">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => progress.resetProgress()}
                    style={{ ...st.secondaryButton, display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Reset
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void loadPackage()}
                    disabled={loading}
                    style={{ ...st.primaryButton, display: "inline-flex", alignItems: "center", gap: 8, opacity: loading ? 0.65 : 1 }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
                    Refresh package
                  </motion.button>
                </div>
              </section>
              {socialMissions.length > 0 ? (
                <section className="gf-pr-card gf-pr-social-missions">
                  <h2 className="gf-pr-card-title">{teamFlowTitle}</h2>
                  {teamFlowHint ? <p className="gf-pr-card-hint">{teamFlowHint}</p> : null}
                  <div className="gf-pr-social-mission-grid">
                    {socialMissions.map((m) => {
                      const done = isQuestDone(m, progress, usingWorkbook ? workbook : null);
                      return (
                        <div key={m.taskId} className={`gf-pr-social-mission-card ${done ? "is-done" : ""}`}>
                          <div className="gf-pr-social-mission-title">{m.title}</div>
                          <div className="gf-pr-social-mission-desc">{m.description}</div>
                          <div className="gf-pr-social-mission-meta">
                            +{m.rewardXp} XP · {m.difficultyLabel}
                          </div>
                          <button
                            type="button"
                            className="gf-pr-quest-board-btn"
                            disabled={done}
                            onClick={(e) => {
                              if (done) return;
                              const r = e.currentTarget.getBoundingClientRect();
                              handleBeginQuest(m, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                            }}
                          >
                            {done ? "Completed" : "Start"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              <QuestTaskList
                quests={hasGameplayFlow ? quests : []}
                completedOrders={progress.completedQuestOrders}
                completedTaskIds={progress.completedTaskIds}
                objectiveXp={progress.objectiveXp}
                unlockedOrders={unlockedQuestOrders}
                onBeginQuest={handleBeginQuest}
                workbook={usingWorkbook ? workbook : null}
              />
            </div>

            <div id="player-leaderboard" className="gf-pr-runtime-right gf-pr-scroll-mt">
              <section className="gf-pr-panel gf-pr-metrics-compact" style={{ ...(st.metricsRow || { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }) }}>
                {[
                  { label: "Objective mastery", value: `${Math.round(masteryAvg * 100)}%`, sub: `${objectivesMastered}/${objectiveCount || 1}` },
                  { label: "Tier", value: playerMasteryTier?.label ?? "Recruit", sub: "mastery tier" },
                  { label: "Badges", value: `${badgesEarned}/${badgeCatalog.length || 1}`, sub: "achievement" },
                  { label: "Gold", value: `${progress.virtualCurrency}`, sub: "runtime" },
                ].map((s) => (
                  <div key={s.label} style={st.metricCard || {}}>
                    <div style={st.metricLabel || { color: "#94a3b8", fontSize: 13 }}>{s.label}</div>
                    <div style={st.metricValue || { fontSize: 24, fontWeight: 800, color: "#f8fafc" }}>{s.value}</div>
                    <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>{s.sub}</div>
                  </div>
                ))}
              </section>
              <section className="gf-pr-card">
                <h2 className="gf-pr-card-title">Certificate</h2>
                <div style={{ marginTop: 10, marginBottom: 8 }}>
                  {certificateUnlocked ? (
                    <span className="gf-pr-chip" style={{ borderColor: "rgba(74,222,128,0.45)", color: "#86efac" }}>
                      <ShieldCheck className="h-4 w-4" /> VALIDATED
                    </span>
                  ) : masteryCompleted ? (
                    <span className="gf-pr-chip" style={{ borderColor: "rgba(250,204,21,0.45)", color: "#fde68a" }}>
                      <ShieldAlert className="h-4 w-4" /> PENDING APPROVAL
                    </span>
                  ) : (
                    <span className="gf-pr-chip" style={{ borderColor: "rgba(148,163,184,0.4)", color: "#cbd5e1" }}>
                      <Lock className="h-4 w-4" /> LOCKED
                    </span>
                  )}
                </div>
                <p className="gf-pr-card-hint">
                  {certificateUnlocked
                    ? "Certificate unlocked. Instructor validation is on record."
                    : masteryCompleted
                      ? "All objectives mastered. Awaiting instructor approval."
                      : "Unlocks when all objectives are mastered."}
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="gf-pr-icon-btn"
                    disabled={!masteryCompleted || hasInstructorValidation}
                    onClick={() => {
                      progress.validateCertificate({
                        advisorId: "advisor-runtime",
                        note: "Objective mastery reviewed and approved.",
                      });
                      pushToast(setToasts, "Instructor validation saved.", "success");
                    }}
                    style={{ opacity: !masteryCompleted || hasInstructorValidation ? 0.55 : 1 }}
                  >
                    {hasInstructorValidation ? "Validated" : "Save instructor approval"}
                  </button>
                  {hasInstructorValidation ? (
                    <span className="gf-pr-chip" style={{ borderColor: "rgba(74,222,128,0.45)", color: "#86efac" }}>
                      advisor: {progress.instructorValidation?.advisorId || "advisor"}
                    </span>
                  ) : null}
                </div>
              </section>
              <section className="gf-pr-card">
                <h2 className="gf-pr-card-title">Group momentum</h2>
                <div className="gf-pr-cohort-wrap">
                  <div className="gf-pr-cohort-bar">
                    <div className="gf-pr-cohort-fill" style={{ height: `${cohortMomentum}%` }} />
                  </div>
                  <div className="gf-pr-cohort-value">%{cohortMomentum}</div>
                </div>
                <p className="gf-pr-card-hint" style={{ marginTop: 10 }}>
                  Quest completion: +{questMomentumBonus} · Consistency: +{streakMomentumBonus} · Team missions:{" "}
                  {socialMissionTotal > 0 ? (
                    <>
                      {socialMissionDone}/{socialMissionTotal} (cohort social +{socialCohortSlice}/20)
                    </>
                  ) : (
                    <>cohort social +{socialCohortSlice}/20</>
                  )}
                </p>
                <div className="gf-pr-social-breakdown">
                  {[
                    {
                      label: "Quest",
                      val: questMomentumBonus,
                      fillPct: Math.min(100, (questMomentumBonus / 28) * 100),
                      valueText: `+${questMomentumBonus}`,
                      color: "rgba(56,189,248,0.8)",
                    },
                    {
                      label: "Streak",
                      val: streakMomentumBonus,
                      fillPct: Math.min(100, (streakMomentumBonus / 10) * 100),
                      valueText: `+${streakMomentumBonus}`,
                      color: "rgba(250,204,21,0.8)",
                    },
                    {
                      label: "Social",
                      val: socialMomentumBonus,
                      fillPct: socialMissionFillPct,
                      valueText: socialMissionTotal > 0 ? `${socialMissionDone}/${socialMissionTotal}` : `+${socialMomentumBonus}`,
                      color: "rgba(74,222,128,0.82)",
                    },
                  ].map((s) => (
                    <div key={s.label} className="gf-pr-social-row">
                      <div className="gf-pr-social-label">{s.label}</div>
                      <div className="gf-pr-social-track">
                        <div
                          className="gf-pr-social-fill"
                          style={{ width: `${Math.min(100, Number(s.fillPct || 0))}%`, background: s.color }}
                        />
                      </div>
                      <div className="gf-pr-social-value">{s.valueText}</div>
                    </div>
                  ))}
                </div>
              </section>
              <PlayerRuntimeShop virtualCurrency={progress.virtualCurrency} ownedIds={progress.shopOwnedIds} onPurchase={handleShopPurchase} />
              <BadgeCollection
                catalog={badgeCatalog}
                earnedIds={Array.from(
                  new Set([...(progress.badges || []), ...(unlockedBadges || [])]).values(),
                ).filter((id) => MILESTONE_BADGE_IDS.has(String(id)))}
                hexadHint={hexadHint}
                badgeHints={badgeUnlockHints}
              />
              {usingWorkbook && workbook ? (
                <MasteryLeaderboard workbook={workbook} progress={progress} displayName={effectiveDisplayName} />
              ) : null}
              <PlayerEventLog entries={progress.eventLog} actorName={effectiveDisplayName} />
            </div>
          </div>
        </div>

        {!dp && !loading ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: "center", fontSize: 14, color: "#94a3b8" }}
          >
            Press <strong style={{ color: "#60a5fa" }}>Refresh package</strong> to load the deployment.
          </motion.p>
        ) : null}
      </PlayerRuntimeShell>
      <FloatingXpBurst burst={xpBurst} onComplete={clearXpBurst} />
      <BadgeUnlockModal badges={badgeModalBadges} onClose={clearBadgeModal} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <FormativeFeedbackPanel
        open={Boolean(formativeFeedback)}
        onClose={() => setFormativeFeedback(null)}
        title={formativeFeedback?.title || ""}
        body={formativeFeedback?.body || ""}
        diminishingNote={formativeFeedback?.diminishingNote || ""}
        retryHint={formativeFeedback?.retryHint || ""}
      />
      <QuestQuizModal
        open={questInteraction === "quiz_s18" || questInteraction === "workbook_formative"}
        questions={questInteraction === "quiz_s18" ? quizCatalog : microQuizForQuest}
        title={
          questInteraction === "workbook_formative"
            ? String(questFlow?.quest?.title || "").trim() ||
                firstMeaningfulLine(specBlueprint?.sections?.s18_assessment) ||
                displaySpecTitle
            : firstMeaningfulLine(specBlueprint?.sections?.s18_assessment) || displaySpecTitle
        }
        hint={
          questInteraction === "workbook_formative"
            ? [getAssessmentRationaleExcerpt(specBlueprint, 280), String(questFlow?.quest?.description || "").trim()]
                .filter(Boolean)
                .join("\n\n") || getAssessmentRationaleExcerpt(specBlueprint, 400)
            : getAssessmentRationaleExcerpt(specBlueprint, 520)
        }
        onClose={closeQuestFlow}
        onComplete={() => {
          const flow = questFlow;
          if (!flow) return;
          const ix = resolveInteractionFlow(flow.quest);
          setQuestFlow(null);
          finalizeQuestReward(flow.quest, flow.point, { interaction: ix });
        }}
      />
      <QuestProfileModal
        open={questInteraction === "profile" || headerProfileOpen}
        initialTitle={displayRoleTitle}
        initialNickname={effectiveDisplayName}
        initialPresetId={progress.profileCosmetics?.avatarPresetId}
        onClose={() => {
          setHeaderProfileOpen(false);
          closeQuestFlow();
        }}
        onSave={(cos) => {
          const flow = questFlow;
          const fromQuest = Boolean(flow && resolveInteractionFlow(flow.quest) === "profile");
          setHeaderProfileOpen(false);
          closeQuestFlow();
          progress.commitProfileCosmetics({
            displayTitle: cos.title,
            nickname: cos.nickname,
            avatarPresetId: cos.avatarPresetId,
          });
          if (fromQuest) {
            finalizeQuestReward(flow.quest, flow.point, { profileCustomization: true });
            return;
          }
          const pt =
            typeof window !== "undefined"
              ? { x: window.innerWidth / 2, y: 160 }
              : { x: 400, y: 160 };
          tryAwardProfileQuestFromHeader(pt);
        }}
      />
      <QuestHazardModal
        open={questInteraction === "hazard"}
        onClose={closeQuestFlow}
        onSubmit={(payload) => {
          const flow = questFlow;
          if (!flow) return;
          setQuestFlow(null);
          finalizeQuestReward(flow.quest, flow.point, { hazardReport: payload });
        }}
      />
      <QuestSocialTaskModal
        open={questInteraction === "workbook_social"}
        questTitle={questFlow?.quest?.title}
        onClose={closeQuestFlow}
        onComplete={(payload) => {
          const flow = questFlow;
          if (!flow) return;
          setQuestFlow(null);
          finalizeQuestReward(flow.quest, flow.point, payload);
        }}
      />
      <QuestAppliedTaskModal
        open={questInteraction === "workbook_applied"}
        questTitle={questFlow?.quest?.title}
        onClose={closeQuestFlow}
        onComplete={(payload) => {
          const flow = questFlow;
          if (!flow) return;
          setQuestFlow(null);
          finalizeQuestReward(flow.quest, flow.point, payload);
        }}
      />
      <QuestReflectionModal
        open={questInteraction === "reflection"}
        questTitle={questFlow?.quest?.title}
        onClose={closeQuestFlow}
        onComplete={(payload) => {
          const flow = questFlow;
          if (!flow) return;
          setQuestFlow(null);
          finalizeQuestReward(flow.quest, flow.point, payload);
        }}
      />
    </div>
  );
}
