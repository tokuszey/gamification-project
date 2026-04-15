/**
 * Parse /api/v1/realize deployment_package for Player Runtime UI.
 * Quest rows are derived from şartname (phases, mechanics, rules) — rewards from rule engine, not hardcoded demo XP.
 */

import { evaluateInteractionRules } from "../../lib/realizationRules";

function goldFromXp(xp) {
  return Math.max(5, Math.round(Math.max(10, xp) / 5));
}

function inferDifficultyLabel(title, description, orderHint = 0) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  if (
    text.includes("kritik") ||
    text.includes("critical") ||
    text.includes("incident") ||
    text.includes("breach") ||
    orderHint >= 5
  ) {
    return "Hard";
  }
  if (
    text.includes("orta") ||
    text.includes("medium") ||
    text.includes("analysis") ||
    text.includes("triage") ||
    orderHint >= 2
  ) {
    return "Medium";
  }
  return "Easy";
}

/** Resolve XP/Gold for a quest title from deployed rules (Madde 15) + canonical matchers. */
export function rewardsForQuestTitle(pkg, title, rules) {
  const ev = evaluateInteractionRules(pkg, title);
  let xp = ev.pointsDelta;
  if (xp <= 0) {
    const low = (title || "").toLowerCase();
    for (const r of rules) {
      const t = (r.trigger_action || "").toLowerCase();
      if (!t) continue;
      if (low.includes(t.slice(0, Math.min(14, t.length))) || t.includes(low.slice(0, Math.min(14, low.length)))) {
        xp = Math.max(xp, r.effect?.points_delta || 0);
      }
    }
  }
  if (xp <= 0) xp = 10;
  const gold = goldFromXp(xp);
  return {
    rewardXp: xp,
    rewardGold: gold,
    rewardLabel: `+${xp} XP, +${gold} Gold`,
  };
}

const FALLBACK_ACTION_TITLES = [
  "Complete the weekly safety inspection",
  "Submit an incident or hazard report",
  "Run a field audit / observation walkthrough",
];

/** Çalışma kitabı / görev kartı türü — etkileşim modalı seçimi için. */
export function inferQuestCategoryFromTitle(title, description = "") {
  const t = `${title || ""} ${description || ""}`.toLowerCase();
  if (/\b(team|peer|share|sosyal|işbirlik|mentor|collab)\b/.test(t)) return "social";
  if (/\b(saha|uygul|deploy|field|pratik|uygula|applied)\b/.test(t)) return "applied";
  return "formative";
}

/** Aligns Player Runtime quests with Madde 15 canonical triggers (realizationRules). */
export function inferQuestKind(title) {
  const t = (title || "").toLowerCase();
  if (/\bquiz\b|sınav|değerlendirme|assessment|kpi|mini\s*sınav/.test(t)) return "quiz";
  if (/profil|avatar|özelleşt|unvan|customize/.test(t)) return "profile";
  if (/tehlike|hazard|kaza.*bildir|bildirimi\s*gönder|near-?miss|olay\s*bildir/.test(t)) return "hazard";
  return "generic";
}

/** Oyuncu profilini özelleştirme görevi (başlık / questKind ile eşleşen ilk kart). */
export function findProfileCustomizationQuest(quests) {
  if (!Array.isArray(quests)) return null;
  return (
    quests.find((q) => q.questKind === "profile" || inferQuestKind(q.title) === "profile") || null
  );
}

export function resolveRuleActionLabel(kind, title) {
  if (kind === "quiz") return "Complete the quiz";
  if (kind === "profile") return "Customize your profile";
  if (kind === "hazard") return "Hazard report";
  return (title || "").trim();
}

const DEFAULT_QUIZ_ITEMS = [
  {
    stem: "Which section of the spec is KPI tracking most directly tied to?",
    options: ["Section 18 — Assessment & KPIs", "Visual design only", "Economics only"],
    correctIndex: 0,
  },
  {
    stem: "When a hazard report is completed, what does the rule engine evaluate?",
    options: ["Interaction trigger (Section 15)", "Pixel count only", "Database schema only"],
    correctIndex: 0,
  },
  {
    stem: "Which action label matches the profile customization reward?",
    options: ["Customize your profile", "A random title", "Upload a file"],
    correctIndex: 0,
  },
];

/**
 * Build short MCQ list from s18 / assessment raw text (deployment package).
 */
export function extractS18QuizQuestions(pkg) {
  const raw = String(pkg?.gamification_config?.raw_sections?.assessment || "").trim();
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const stems = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[\-\*\d\.\)\s•]+/u, "").trim();
    if (cleaned.length < 12) continue;
    if (cleaned.includes("?") || /^\d+[\.\)]\s/.test(line)) stems.push(cleaned.slice(0, 280));
  }
  const picked = stems.slice(0, 4);
  if (picked.length >= 3) {
    return picked.map((stem) => ({
      stem,
      options: [
        "Fits the spec and KPI context",
        "Out of context / not appropriate",
        "Unclear — need more information",
      ],
      correctIndex: 0,
    }));
  }
  return DEFAULT_QUIZ_ITEMS.slice(0, 4);
}

/** Preset avatar styles for profile modal + StatBarHeader ring */
export const AVATAR_PRESETS = [
  {
    id: "azure",
    label: "Azure",
    style: {
      border: "2px solid rgba(59, 130, 246, 0.55)",
      background: "linear-gradient(145deg, rgba(37, 99, 235, 0.95), rgba(30, 64, 175, 0.85))",
      boxShadow: "0 14px 36px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    style: {
      border: "2px solid rgba(52, 211, 153, 0.5)",
      background: "linear-gradient(145deg, rgba(16, 185, 129, 0.92), rgba(5, 46, 22, 0.88))",
      boxShadow: "0 14px 36px rgba(16, 185, 129, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    },
  },
  {
    id: "violet",
    label: "Violet",
    style: {
      border: "2px solid rgba(167, 139, 250, 0.55)",
      background: "linear-gradient(145deg, rgba(124, 58, 237, 0.9), rgba(88, 28, 135, 0.88))",
      boxShadow: "0 14px 36px rgba(124, 58, 237, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    },
  },
  {
    id: "amber",
    label: "Amber",
    style: {
      border: "2px solid rgba(251, 191, 36, 0.55)",
      background: "linear-gradient(145deg, rgba(245, 158, 11, 0.92), rgba(120, 53, 15, 0.82))",
      boxShadow: "0 14px 36px rgba(245, 158, 11, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
    },
  },
  {
    id: "rose",
    label: "Rose",
    style: {
      border: "2px solid rgba(251, 113, 133, 0.55)",
      background: "linear-gradient(145deg, rgba(244, 63, 94, 0.9), rgba(136, 19, 55, 0.85))",
      boxShadow: "0 14px 36px rgba(244, 63, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    },
  },
  {
    id: "slate",
    label: "Slate",
    style: {
      border: "2px solid rgba(148, 163, 184, 0.45)",
      background: "linear-gradient(145deg, rgba(71, 85, 105, 0.95), rgba(15, 23, 42, 0.92))",
      boxShadow: "0 14px 36px rgba(15, 23, 42, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    },
  },
];

/**
 * Dynamic quest board: Madde 13 phases, Madde 6 mechanics (action-shaped), Madde 15 triggers; minimal TR fallback only if almost empty.
 */
export function buildQuestRows(pkg) {
  const rules = pkg?.rules || [];
  const phases = pkg?.gamification_config?.gameplay_phases || [];
  const mechanics = pkg?.gamification_config?.mechanics || [];
  const seen = new Set();
  const rows = [];

  const add = (order, title, description, opts = {}) => {
    const key = (title || "").toLowerCase().trim().slice(0, 120);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const { rewardXp, rewardGold, rewardLabel } = rewardsForQuestTitle(pkg, title, rules);
    const prerequisiteOrder =
      typeof opts.prerequisiteOrder === "number" ? opts.prerequisiteOrder : null;
    const difficultyLabel =
      opts.difficultyLabel || inferDifficultyLabel(title, description, Number(order) || 0);
    const questKind = inferQuestKind(title);
    const questCategory = opts.questCategory || inferQuestCategoryFromTitle(title, description);
    const ruleActionLabel = resolveRuleActionLabel(questKind, title);
    rows.push({
      order,
      title: (title || "").slice(0, 240),
      description: (description || "").slice(0, 500),
      prerequisiteOrder,
      difficultyLabel,
      rewardXp,
      rewardGold,
      rewardLabel,
      questKind,
      questCategory,
      ruleActionLabel,
    });
  };

  const orderedPhases = [...phases].sort((a, b) => (a.order || 0) - (b.order || 0));
  orderedPhases.forEach((p, idx) => {
    const prev = orderedPhases[idx - 1];
    add(p.order, p.title, p.description, {
      prerequisiteOrder: prev ? prev.order : null,
      difficultyLabel: inferDifficultyLabel(p.title, p.description, idx),
    });
  });

  mechanics.slice(0, 8).forEach((m, i) => {
    add(6000 + i, m.label, m.source_line || "", {
      prerequisiteOrder: i === 0 ? null : 6000 + i - 1,
      difficultyLabel: inferDifficultyLabel(m.label, m.source_line || "", i),
    });
  });

  rules.forEach((r, i) => {
    const t = (r.trigger_action || "").trim();
    if (!t) return;
    const pts = r.effect?.points_delta || 0;
    const badges = r.effect?.badge_ids || [];
    if (pts <= 0 && !badges.length) return;
    const gold = goldFromXp(pts || 10);
    const key = t.toLowerCase().slice(0, 120);
    if (seen.has(key)) return;
    seen.add(key);
    const questKind = inferQuestKind(t);
    const questCategory = inferQuestCategoryFromTitle(t, "");
    rows.push({
      order: 8000 + i,
      title: t.slice(0, 240),
      description: "Action-based quest — rewarded by Section 15 rules.",
      prerequisiteOrder: null,
      difficultyLabel: inferDifficultyLabel(t, r.id || "", i),
      rewardXp: Math.max(10, pts || 10),
      rewardGold: gold,
      rewardLabel: `+${Math.max(10, pts || 10)} XP, +${gold} Gold`,
      questKind,
      questCategory,
      ruleActionLabel: resolveRuleActionLabel(questKind, t),
    });
  });

  if (rows.length < 2) {
    FALLBACK_ACTION_TITLES.forEach((title, i) => {
      add(
        9000 + i,
        title,
        "Suggested actions when the spec has few phases; rewards are still derived from deployed rules.",
      );
    });
  }

  rows.sort((a, b) => a.order - b.order);
  return rows;
}

export function resolveSpecRoleTitle(level, pkg) {
  const rewardLevels = (pkg?.gamification_config?.rewards || [])
    .filter((r) => String(r.kind || "").toLowerCase() === "level")
    .map((r) => String(r.label || "").trim())
    .filter(Boolean);
  if (!rewardLevels.length) return null;
  if (rewardLevels.length === 1) return rewardLevels[0];
  if (level >= 12) return rewardLevels[Math.min(rewardLevels.length - 1, 3)];
  if (level >= 8) return rewardLevels[Math.min(rewardLevels.length - 1, 2)];
  if (level >= 4) return rewardLevels[Math.min(rewardLevels.length - 1, 1)];
  return rewardLevels[0];
}

function hashRarity(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const m = h % 100;
  if (m < 50) return "common";
  if (m < 78) return "rare";
  if (m < 94) return "epic";
  return "legendary";
}

export function collectBadgeCatalog(pkg) {
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const id = raw.trim().replace(/\s+/g, "_").slice(0, 48);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      label: raw.replace(/_/g, " ").slice(0, 32),
      rarity: hashRarity(id),
    });
  };
  for (const r of pkg?.rules || []) {
    for (const b of r.effect?.badge_ids || []) add(b);
  }
  for (const rw of pkg?.gamification_config?.rewards || []) {
    if (rw.kind === "badge") add(rw.label || rw.id);
  }
  if (out.length === 0) {
    ["Safety First", "Early Bird", "Team Player", "Master of Defense", "Successor", "Innovator"].forEach(add);
  }
  return out;
}
