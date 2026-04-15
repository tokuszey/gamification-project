/**
 * Client-side proposal exports (HTML, Markdown, JSON, backlog CSV/MD/HTML, LLM dev prompt).
 */

const SIX_D_META = "__meta::six_d";
const SIX_D_IDS = [
  "d1_define",
  "d2_behaviors",
  "d3_players",
  "d4_cycles",
  "d5_fun",
  "d6_deploy",
];
const SIX_D_TITLES = {
  d1_define: "Define business objectives",
  d2_behaviors: "Delineate target behaviors",
  d3_players: "Describe your players",
  d4_cycles: "Devise activity cycles",
  d5_fun: "Don't forget the fun",
  d6_deploy: "Deploy appropriate tools",
};

const BACKLOG_SECTION_PREFIXES = [
  "s03::",
  "s04::",
  "s06::",
  "s08::",
  "s13::",
  "s15::",
  "s18::",
  "s19::",
];

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeSixD(raw) {
  const phases = {};
  for (const id of SIX_D_IDS) {
    phases[id] = { done: false, notes: "" };
  }
  if (!raw || typeof raw !== "object") return { phases };
  const p = raw.phases;
  if (!p || typeof p !== "object") return { phases };
  for (const id of SIX_D_IDS) {
    const cell = p[id];
    if (cell && typeof cell === "object") {
      phases[id] = {
        done: Boolean(cell.done),
        notes: String(cell.notes ?? ""),
      };
    }
  }
  return { phases };
}

/**
 * @param {Record<string, string>} sections
 * @param {string[]} sectionOrder
 * @param {string[]} emptyKeys
 */
export function buildQualityDiagnostics(sections, sectionOrder, emptyKeys) {
  const six = normalizeSixD(sections[SIX_D_META]);
  const incompleteSixD = SIX_D_IDS.filter((id) => !six.phases[id]?.done).map(
    (id) => ({ id, title: SIX_D_TITLES[id] || id }),
  );
  const criticalEmpty = emptyKeys.filter((k) =>
    /s13::|s15::|s18::|s06::|s08::/.test(k),
  );
  return {
    emptyCount: emptyKeys.length,
    emptyKeys,
    incompleteSixD,
    criticalEmpty,
    sixDoneCount: SIX_D_IDS.filter((id) => six.phases[id]?.done).length,
  };
}

export function buildSpecJsonPayload(spec, sections, sectionOrder) {
  const sid = spec?.id ?? null;
  const ordered = {};
  for (const k of sectionOrder) {
    if (Object.prototype.hasOwnProperty.call(sections, k)) ordered[k] = sections[k];
  }
  for (const k of Object.keys(sections)) {
    if (!ordered[k]) ordered[k] = sections[k];
  }
  return {
    exported_at: new Date().toISOString(),
    format: "gameforge_spec_bundle_v1",
    spec: {
      id: sid,
      title: spec?.title ?? "",
      status: spec?.status ?? "",
    },
    sections: ordered,
  };
}

export function exportSpecJsonDownload(spec, sections, sectionOrder) {
  const payload = buildSpecJsonPayload(spec, sections, sectionOrder);
  const text = JSON.stringify(payload, null, 2);
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_export.json`, text, "application/json;charset=utf-8");
}

export function exportMarkdownDownload(spec, sections, sectionOrder) {
  const lines = [];
  lines.push(`# ${spec?.title || "Gamification specification"}`);
  lines.push("");
  lines.push(`**Status:** ${spec?.status || "—"}  `);
  lines.push(`**Spec ID:** ${spec?.id ?? "—"}  `);
  lines.push(`**Exported:** ${new Date().toISOString()}`);
  lines.push("");
  for (const key of sectionOrder) {
    const body = String(sections[key] ?? "").trim();
    const short = key.includes("::") ? key.split("::")[1] : key;
    lines.push(`## ${short}`);
    lines.push("");
    lines.push(body || "_Empty_");
    lines.push("");
  }
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_proposal.md`, lines.join("\n"), "text/markdown;charset=utf-8");
}

export function exportHtmlProposalDownload(spec, sections, sectionOrder) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const blocks = sectionOrder
    .map((key) => {
      const short = key.includes("::") ? key.split("::")[1] : key;
      const body = esc(String(sections[key] ?? "").trim()).replace(/\n/g, "<br>\n");
      const id = `sec-${key.replace(/[^a-z0-9]+/gi, "-")}`;
      return `<section class="block" id="${id}"><h2>${esc(short)}</h2><div class="body">${body || "<em>Empty</em>"}</div></section>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(spec?.title || "Proposal")}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;background:#0f172a;color:#e2e8f0;line-height:1.55}
header{border-bottom:1px solid #334155;padding-bottom:16px;margin-bottom:24px}
h1{font-size:1.5rem;margin:0 0 8px}
.meta{color:#94a3b8;font-size:.9rem}
nav{position:sticky;top:0;background:#0f172a;padding:12px 0;border-bottom:1px solid #1e293b;margin-bottom:20px;z-index:2}
nav a{color:#7dd3fc;margin-right:12px;font-size:.82rem}
.block{margin-bottom:28px;padding:16px;border:1px solid #334155;border-radius:12px;background:#111827}
.block h2{font-size:1.05rem;margin:0 0 10px;color:#93c5fd}
.body{white-space:pre-wrap;font-size:.9rem;color:#cbd5e1}
</style>
</head>
<body>
<header>
  <h1>${esc(spec?.title || "Gamification proposal")}</h1>
  <div class="meta">Status: ${esc(spec?.status || "—")} · Spec #${esc(String(spec?.id ?? "—"))} · ${esc(new Date().toISOString())}</div>
</header>
<nav>${sectionOrder
    .map((key) => {
      const short = key.includes("::") ? key.split("::")[1] : key;
      const id = `sec-${key.replace(/[^a-z0-9]+/gi, "-")}`;
      return `<a href="#${id}">${esc(short)}</a>`;
    })
    .join("")}</nav>
<main>${blocks}</main>
</body>
</html>`;
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_proposal.html`, html, "text/html;charset=utf-8");
}

function stripBullet(line) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function extractBacklogRows(sections, sectionOrder) {
  /** @type {{ epic: string; id: string; title: string; type: string; section: string }[]} */
  const rows = [];
  for (const key of sectionOrder) {
    if (!BACKLOG_SECTION_PREFIXES.some((p) => key.startsWith(p))) continue;
    const body = String(sections[key] || "").trim();
    if (!body) continue;
    const epicName = (key.split("::")[1] || key).slice(0, 120);
    const lines = body
      .split(/\n/)
      .map((l) => stripBullet(l))
      .filter((l) => l.length > 8 && l.length < 800);
    const seen = new Set();
    lines.slice(0, 40).forEach((line, i) => {
      let type = "Task";
      if (/^FR[-\s]/i.test(line)) type = "Functional requirement";
      else if (/^US[-\s]/i.test(line) || /^as a\b/i.test(line)) type = "User story";
      const id = `${key.match(/^s\d+/)?.[0] || "s"}-${i + 1}`;
      const dedupe = `${key}|${line.slice(0, 200)}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      rows.push({
        epic: epicName,
        id,
        title: line,
        type,
        section: key,
      });
    });
  }
  return rows;
}

function csvEscape(s) {
  const t = String(s).replace(/"/g, '""');
  return `"${t}"`;
}

export function exportBacklogCsvDownload(spec, sections, sectionOrder) {
  const rows = extractBacklogRows(sections, sectionOrder);
  const header = ["Epic", "Work item ID", "Title", "Type", "Source section"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.epic, r.id, r.title, r.type, r.section].map(csvEscape).join(","),
    );
  }
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_backlog.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

export function exportBacklogMarkdownDownload(spec, sections, sectionOrder) {
  const rows = extractBacklogRows(sections, sectionOrder);
  const lines = [];
  lines.push(`# Product backlog — ${spec?.title || "Spec"}`);
  lines.push("");
  lines.push(`Generated from section bullets (gameplay, mechanics, objectives, …). Ready to paste into Jira / GitHub / Azure Boards.`);
  lines.push("");
  let epic = "";
  for (const r of rows) {
    if (r.epic !== epic) {
      epic = r.epic;
      lines.push(`## Epic: ${epic}`);
      lines.push("");
    }
    lines.push(`- **${r.id}** (${r.type}) — ${r.title}`);
    lines.push(`  - _Source:_ \`${r.section}\``);
    lines.push("");
  }
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_backlog.md`, lines.join("\n"), "text/markdown;charset=utf-8");
}

export function exportBacklogHtmlDownload(spec, sections, sectionOrder) {
  const rows = extractBacklogRows(sections, sectionOrder);
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Backlog — ${esc(spec?.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:24px auto;color:#1e293b} h1{font-size:1.25rem} .epic{margin-top:22px;color:#1d4ed8} li{margin:6px 0}</style></head><body>`;
  html += `<h1>Product backlog</h1><p>${esc(spec?.title || "")} · #${esc(String(spec?.id ?? ""))}</p>`;
  if (!rows.length) {
    html += "<p>No backlog lines extracted (add bullets to objectives, profiles, mechanics, gameplay, rules, assessment, or game management sections).</p>";
  } else {
    let epic = "";
    let ulOpen = false;
    for (const r of rows) {
      if (r.epic !== epic) {
        if (ulOpen) html += "</ul>";
        epic = r.epic;
        html += `<h2 class="epic">${esc(epic)}</h2><ul>`;
        ulOpen = true;
      }
      html += `<li><strong>${esc(r.id)}</strong> (${esc(r.type)}) — ${esc(r.title)}<br><small>${esc(r.section)}</small></li>`;
    }
    if (ulOpen) html += "</ul>";
  }
  html += "</body></html>";
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_backlog.html`, html, "text/html;charset=utf-8");
}

export function exportLlmDevPromptDownload(spec, sections, sectionOrder, emptyKeys) {
  const title = spec?.title || "Untitled specification";
  const summaryLines = sectionOrder.slice(0, 12).map((k) => {
    const snippet = String(sections[k] || "")
      .trim()
      .slice(0, 180)
      .replace(/\s+/g, " ");
    return `- **${k}:** ${snippet || "(empty)"}`;
  });
  const prompt = `You are a senior engineer helping implement a gamified learning / serious-game experience.

## Product
**Title:** ${title}
**Spec ID:** ${spec?.id ?? "N/A"}
**Status:** ${spec?.status ?? "unknown"}

## Instructions
1. Read the section summaries below, then ask clarifying questions if needed.
2. Propose a technical architecture (frontend + API + persistence) aligned with the spec.
3. Include: auth boundaries, rule engine hooks for "interaction sequences", XP/badges, and export of analytics events.
4. Prefer concrete file/module names and REST shapes.

## Section summaries (truncated)
${summaryLines.join("\n")}

## Completeness hint
- Empty section count: ${emptyKeys.length}
- Prioritize filling: gameplay flow (s13), interaction rules (s15), assessment/KPIs (s18) if missing.

## Output format
Respond with: (1) Architecture diagram in ASCII or Mermaid, (2) Task list for a 2-week sprint, (3) Risk register.

---
This file was auto-generated by GameForge AI — attach the full spec JSON export for more context.
`;
  const id = spec?.id ?? "draft";
  downloadBlob(`spec_${id}_llm_dev_prompt.txt`, prompt, "text/plain;charset=utf-8");
}
