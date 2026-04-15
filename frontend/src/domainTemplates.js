import { WIZARD_DOMAIN_OTHER, WIZARD_DOMAINS } from "./wizardDomains";

const S01_KEY = "s01::Introduction and Context";
const S02_KEY = "s02::Simulation/Project Context";
const S09_KEY = "s09::Narrative Framework";

/**
 * Template-based domain presets for Spec Studio AI context (gamification patterns per vertical).
 * First option is spec-driven only — no canned vertical copy until the author picks a template.
 */

/** Default: spec title + §01/§02/§09 only — vertical templates do not append bullet lists. */
export const SPEC_DRIVEN_TEMPLATE_ID = "from_spec";

export const DOMAIN_TEMPLATES = [
  {
    id: SPEC_DRIVEN_TEMPLATE_ID,
    label: "Other (document text; no automatic suggestion list)",
    contextText: "",
    patterns: [],
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity awareness",
    contextText:
      "Cybersecurity training program: phishing recognition, password hygiene, incident reporting, and safe handling of sensitive data.",
    patterns: [
      "Quest chains per threat type (phishing, malware, social engineering) with mastery badges",
      "Leaderboard for completed modules; optional team score for SOC-style collaboration",
      "Streak bonus for consecutive correct simulations; energy cost on failed drills",
      "Narrative: analyst / defender role-play with escalating scenarios",
    ],
  },
  {
    id: "education",
    label: "Education & corporate L&D",
    contextText:
      "Corporate or academic learning: modular curriculum, assessment, cohort progress, and instructor visibility.",
    patterns: [
      "XP and levels aligned to learning objectives; certification milestones (Achiever)",
      "Study groups and discussion quests (Socializer / Relatedness)",
      "Optional paths and elective modules as autonomy signals (SDT Autonomy)",
      "Formative quizzes and immediate feedback (Competence + MDA dynamics)",
    ],
  },
  {
    id: "hr_people",
    label: "HR & employee experience",
    contextText:
      "Human resources and employee experience: onboarding, performance conversations, wellbeing, DEI, internal comms, and career paths.",
    patterns: [
      "Onboarding quest chains with buddy/mentor matching (Relatedness)",
      "Visible goals and competency criteria (Competence + Achiever)",
      "Voluntary participation and opt-in rewards — avoid pressure (SDT Autonomy)",
      "Team and department collaboration scores; soften hyper-competition",
    ],
  },
  {
    id: "corporate_sales",
    label: "Enterprise sales (B2B)",
    contextText:
      "Enterprise B2B sales: discovery–proposal–negotiation–close, CRM discipline, multi-stakeholder deals, product and process knowledge.",
    patterns: [
      "Tasks tied to pipeline stages; badges at demo and proposal milestones (Achiever + Competence)",
      "Region/pod team goals and shared leaderboards — collaboration-weighted competition",
      "Objection handling and scenario-based role-play (Free Spirit / narrative)",
      "Ethical framing: reward learning and process KPIs, not revenue alone",
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare & safety",
    contextText:
      "Clinical or operational training: protocols, patient safety, compliance checklists, and handoff quality.",
    patterns: [
      "Checklist quests and error-prevention streaks (Achiever + safety narrative)",
      "Team huddles modeled as short collaborative missions (Socializer)",
      "Philanthropist angle: tie completions to quality-of-care or patient-outcome messaging",
      "Low-pressure retries with clear remediation paths after failure",
    ],
  },
  {
    id: "operations",
    label: "Operations & quality",
    contextText:
      "Operations excellence: SOP adherence, audit readiness, continuous improvement, and cross-functional handoffs.",
    patterns: [
      "Gemba / walk-the-line style micro-tasks with audit badges",
      "Kaizen suggestions as user-generated quests (Disruptor + Philanthropist)",
      "Combo multipliers for consistent on-time completions",
      "Transparent KPI dashboards linked to quests (not hidden grinding)",
    ],
  },
  {
    id: "general",
    label: "General gamification",
    contextText:
      "Generic workplace or community program: clear goals, fair rules, visible progress, and meaningful rewards.",
    patterns: [
      "Balance Achiever (goals) vs Player (rewards) vs Socializer (collaboration)",
      "Name explicit mechanics (points, badges, levels) and intended aesthetics (fun, challenge, fellowship)",
      "Adaptive difficulty: easier onboarding, harder mastery tracks",
      "Ethical design: opt-in, privacy, and avoid manipulative dark patterns",
    ],
  },
];

export const defaultDomainTemplateId = SPEC_DRIVEN_TEMPLATE_ID;

/**
 * Global AI context when no vertical template is selected: title + early spec sections only.
 * Returns "" if there is nothing to show.
 */
export function buildAiContextFromSpec(title, sections) {
  const sec = sections && typeof sections === "object" ? sections : {};
  const chunks = [];
  const ti = String(title || "").trim();
  if (ti) chunks.push(`Specification title:\n${ti}`);
  const intro = String(sec[S01_KEY] || "").trim();
  if (intro) chunks.push(`\n§01 — Introduction and context:\n${intro.slice(0, 6000)}`);
  const sim = String(sec[S02_KEY] || "").trim();
  if (sim && intro.length < 120) {
    chunks.push(`\n§02 — Simulation/project context:\n${sim.slice(0, 4000)}`);
  }
  const nar = String(sec[S09_KEY] || "").trim();
  if (nar && !intro && !sim) {
    chunks.push(`\n§09 — Narrative framework:\n${nar.slice(0, 4000)}`);
  }
  return chunks.join("").trim();
}

/**
 * Dikey şablonlarda yalnızca kısa özet (`contextText`) döner; alttaki madde listesi (`patterns`) otomatik eklenmez.
 */
export function applyDomainTemplate(id) {
  if (!id || id === SPEC_DRIVEN_TEMPLATE_ID) return "";
  const t =
    DOMAIN_TEMPLATES.find((x) => x.id === id) ||
    DOMAIN_TEMPLATES.find((x) => x.id === "general");
  if (!t) return "";
  return String(t.contextText || "").trim();
}

/** 6D wizard domain key → Spec Studio template id */
const WIZARD_DOMAIN_TO_TEMPLATE_ID = {
  edu: "education",
  corp: "hr_people",
  pm: "operations",
  health: "healthcare",
  retail: "general",
  research: "general",
  startup: "general",
  civic: "general",
  other: "general",
};

export function templateIdFromWizardDomainKey(domainKey) {
  if (!domainKey || domainKey === WIZARD_DOMAIN_OTHER) return "general";
  return WIZARD_DOMAIN_TO_TEMPLATE_ID[domainKey] || "general";
}

/**
 * Fills Spec Studio (template + AI Context) when coming from the 6D wizard.
 * @param {{ domainKey: string, domainCustom?: string, themeKeywords?: string, projectTypeLabel?: string }} meta
 */
export function buildSpecStudioStateFromWizard(meta) {
  const domainKey = meta?.domainKey || "";
  const templateId = templateIdFromWizardDomainKey(domainKey);
  const baseBlock = applyDomainTemplate(templateId);

  let domainHuman = "";
  if (domainKey === WIZARD_DOMAIN_OTHER) {
    domainHuman = (meta.domainCustom || "").trim() || "Other (custom domain)";
  } else {
    const d = WIZARD_DOMAINS.find((x) => x.id === domainKey);
    domainHuman = d ? `${d.icon} ${d.label} — ${d.desc}` : domainKey || "—";
  }

  const headerLines = [
    "═══════════════════════════════════════════════════════",
    "6D wizard — designer context (Specification Controls)",
    "═══════════════════════════════════════════════════════",
    `Project domain: ${domainHuman}`,
  ];
  if (meta.projectTypeLabel && String(meta.projectTypeLabel).trim()) {
    headerLines.push(`Project type: ${String(meta.projectTypeLabel).trim()}`);
  }
  if (meta.themeKeywords && String(meta.themeKeywords).trim()) {
    headerLines.push(`Theme / keywords: ${String(meta.themeKeywords).trim()}`);
  }
  headerLines.push(
    "",
    "— The block below is the short domain summary from the mapped template (no auto bullet list) —",
    "",
  );

  return {
    domainTemplateId: templateId,
    contextText: headerLines.join("\n") + baseBlock,
  };
}
