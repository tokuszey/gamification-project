/** Helpers for Spec Studio: phased navigation, coverage hints, external LLM prompts. */

export function getSectionPhases(sectionOrder) {
  return [
    { label: "Context & ontology", keys: sectionOrder.slice(0, 5) },
    { label: "Mechanics & dynamics", keys: sectionOrder.slice(5, 9) },
    { label: "Narrative & flow", keys: sectionOrder.slice(9, 13) },
    { label: "Stories & interfaces", keys: sectionOrder.slice(13, 17) },
    { label: "Assessment & risks", keys: sectionOrder.slice(17, 21) },
    { label: "Data, closure, appendices", keys: sectionOrder.slice(21, 25) },
  ];
}

/** Typical items reviewers expect in each section (gap-style checklist). */
export function getCoverageHints(sectionKey) {
  const k = String(sectionKey || "");
  const map = {
    "s01::Introduction and Context": [
      "Program name, sponsor, and success definition",
      "Why gamification fits this audience",
    ],
    "s02::Simulation/Project Context": [
      "Environment constraints (online / classroom / hybrid)",
      "Tools and duration available",
    ],
    "s03::Core Learning Objectives": [
      "Measurable outcomes (verbs + criteria)",
      "Priority ranking if scope is tight",
    ],
    "s04::Participant Profiles and Role-Mapping": [
      "Roles, skill levels, and motivators",
      "Accessibility or language needs",
    ],
    "s05::Core Gamification Ontology (concept-to-game-element mappings)": [
      "Concept → mechanic / dynamic / reward links",
      "Terms aligned with your ontology (e.g. GamifyOnt)",
    ],
    "s06::Game Mechanics": [
      "Core loops, progression rules, failure handling",
      "Fairness and anti-gaming measures",
    ],
    "s07::Emergent Game Dynamics": [
      "Social pressure, competition vs collaboration",
      "Unintended behaviors and mitigations",
    ],
    "s08::Rewards and Incentives": [
      "Intrinsic vs extrinsic balance",
      "Tiers, badges, or redemption rules",
    ],
    "s09::Narrative Framework": [
      "Setting, characters or metaphors",
      "How narrative supports learning goals",
    ],
    "s10::Social Interaction Design": [
      "Teams, chat, forums, moderation",
      "Privacy and harassment safeguards",
    ],
    "s11::Customization and Adaptability": [
      "Difficulty paths or personalization",
      "Data used to adapt experience",
    ],
    "s12::Tangible Elements and Environmental Setup": [
      "Physical or hybrid props",
      "Setup and teardown responsibilities",
    ],
    "s13::Detailed Gameplay Flow": [
      "Step-by-step session timeline",
      "Facilitator and player actions per phase",
    ],
    "s14::Gamified User Stories": [
      "As a [role], I want… so that…",
      "Links to mechanics and KPIs",
    ],
    "s15::Key Interaction Sequences": [
      "Critical UI or dialogue flows",
      "Error and recovery paths",
    ],
    "s16::Illustrative Storyboards": [
      "Sketches or text panels per beat",
      "Emotional arc of the experience",
    ],
    "s17::Interface Wireframes": [
      "Key screens and navigation",
      "Accessibility notes (contrast, keyboard)",
    ],
    "s18::Assessment Framework and KPIs": [
      "KPI definitions and targets",
      "How scores map to learning evidence",
    ],
    "s19::Game Management Structure": [
      "Roles: admin, facilitator, support",
      "Escalation and audit trail",
    ],
    "s20::Execution Log and Leaderboard Design": [
      "What is logged, retention period",
      "Leaderboard categories and anti-cheat",
    ],
    "s21::Implementation Risks": [
      "Top risks with likelihood / impact",
      "Mitigations and owners",
    ],
    "s22::Data Collection and Feedback": [
      "Instruments (surveys, telemetry)",
      "Consent and GDPR-style considerations",
    ],
    "s23::Continuous Improvement Framework": [
      "Review cadence and decision gates",
      "How specs evolve after launch",
    ],
    "s24::Conclusion": [
      "Summary of value and limitations",
      "Next steps for stakeholders",
    ],
    "s25::Appendices (Role sheets, card catalogs, glossary, references)": [
      "Glossary of terms",
      "References and templates",
    ],
  };
  return map[k] || ["Concrete bullets, examples, and acceptance criteria for this section."];
}

export function buildExternalSectionPrompt({
  specTitle,
  specId,
  sectionKey,
  shortDescription,
  coverageHints,
  contextText,
  draft,
}) {
  const title = sectionKey ? sectionKey.split("::")[1] || sectionKey : "";
  const code = sectionKey ? sectionKey.split("::")[0] || "" : "";
  const hints = (coverageHints || []).map((h) => `- ${h}`).join("\n");
  const body = String(draft || "").trim();
  const ctx = String(contextText || "").trim();
  return `You are assisting with a formal gamification design specification (GameForge AI, 25-section template).
The product is a management / design tool: organizations gamify real workflows (training, operations) with points, badges, leaderboards, and goals—not a Unity-style game engine or full game authoring tool.

Specification: ${specTitle || "Untitled"} (id: ${specId || "—"})
Section code: ${code}
Section title: ${title}

Guidance for this section:
${shortDescription || "(see template)"}

Typical coverage to address:
${hints || "- (use section title and domain best practices)"}

Global product / domain context (author-provided):
${ctx || "(none)"}

Current draft (may be empty — improve or replace, keep academic tone):
---
${body || "(empty)"}
---

Task: Produce an improved, self-contained section body in clear prose. Use headings or bullet lists where helpful. Stay consistent with the context. Do not add meta-commentary outside the section content.

Language: Write the entire section body in English only (no Turkish or other languages).`;
}

export function listEmptySectionKeys(sectionOrder, sections) {
  return sectionOrder.filter((key) => !String(sections?.[key] || "").trim());
}

export async function copyTextToClipboard(text) {
  const t = String(text || "");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(t);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = t;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}
