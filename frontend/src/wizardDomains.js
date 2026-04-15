/**
 * GPPT-style domain / project type options.
 * "other" uses free text when preset labels do not fit.
 */

export const WIZARD_DOMAIN_OTHER = "other";

export const WIZARD_DOMAINS = [
  { id: "edu", icon: "🎓", label: "Education / Learning", desc: "Classroom, e-learning, skills training" },
  { id: "corp", icon: "🏢", label: "Corporate / Workplace", desc: "HR, productivity, knowledge management" },
  { id: "pm", icon: "📋", label: "Project Management", desc: "Agile, sprints, team dynamics" },
  { id: "health", icon: "❤️", label: "Health & Wellness", desc: "Fitness, behavior change, wellbeing" },
  { id: "retail", icon: "🛒", label: "Retail / E-commerce", desc: "Loyalty, customer engagement" },
  { id: "research", icon: "🔬", label: "Research / Academic", desc: "Research workflows, knowledge systems" },
  { id: "startup", icon: "🚀", label: "Startup / Product", desc: "MVP, growth, onboarding" },
  { id: "civic", icon: "🌍", label: "Civic / Social", desc: "Community, NGOs, social impact" },
];

/** GPPT Step 1 project type chips + Other */
export const WIZARD_PROJECT_TYPES = [
  "Digital Platform",
  "Web Application",
  "Mobile App",
  "Physical Board Game",
  "Card Game",
  "Hybrid (Physical + Digital)",
  "Serious Game",
  "Simulation",
  "AR/VR Experience",
  "Role-Play Game",
  "Gamification Layer",
];

export const WIZARD_PROJECT_TYPE_OTHER = "__other__";

export function resolveDomainLabel(domainKey, domainCustom) {
  if (!domainKey) return "";
  if (domainKey === WIZARD_DOMAIN_OTHER) return (domainCustom || "").trim() || "Other (undefined)";
  const d = WIZARD_DOMAINS.find((x) => x.id === domainKey);
  return d ? `${d.icon} ${d.label}` : domainKey;
}
