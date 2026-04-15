import React, { useMemo } from "react";

const SIX_D_META = "__meta::six_d";

function mechanicsText(sections) {
  return String(sections["s06::Game Mechanics"] || "").toLowerCase();
}

function rewardsText(sections) {
  return String(sections["s08::Rewards and Incentives"] || "").toLowerCase();
}

function leaderboardText(sections) {
  return String(sections["s20::Execution Log and Leaderboard Design"] || "").toLowerCase();
}

function hexadNotes(sections) {
  const meta = sections[SIX_D_META];
  if (!meta || typeof meta !== "object") return "";
  const d3 = meta.phases?.d3_players;
  return String(d3?.notes || "").toLowerCase();
}

/**
 * Human-readable design hints: HEXAD + mechanics cross-check + ontology status.
 * HermiT / Owlready2 full explanations can be layered on top of ontologyCheck when available.
 */
export default function StudioCopilotPanel({ open, onToggle, sections, ontologyCheck, aiTargetHexad, styles }) {
  const hints = useMemo(() => {
    const out = [];
    const mech = mechanicsText(sections || {});
    const rew = rewardsText(sections || {});
    const lb = leaderboardText(sections || {});
    const hex = `${aiTargetHexad || ""} ${hexadNotes(sections || {})}`.toLowerCase();

    const socialNeed = ["social", "socializer", "community", "relat"].some((k) => hex.includes(k));
    const hasSocialMech = ["leaderboard", "team", "gift", "gifting", "collaborat", "forum", "chat", "share"].some(
      (k) => mech.includes(k) || lb.includes(k),
    );
    if (socialNeed && !hasSocialMech) {
      out.push({
        kind: "hint",
        title: "Social player profile",
        body: "Your HEXAD / D3 notes lean social. Consider adding a leaderboard, team challenge, or gifting loop in Game Mechanics (s06) and Execution Log (s20).",
      });
    }

    if (lb.includes("leaderboard") && !rew.includes("badge") && !rew.includes("point")) {
      out.push({
        kind: "hint",
        title: "Leaderboard + rewards",
        body: "You reference a leaderboard. Pair it with explicit points or badges in Rewards (s08) so progression is measurable.",
      });
    }

    if (ontologyCheck && ontologyCheck.ok === false) {
      out.push({
        kind: "ontology",
        title: "Ontology alignment",
        body: "The ontology service reported issues. Run Validate and compare Game Mechanics / Rewards wording with GamifyOnt classes in the Ontology Check panel.",
      });
    } else if (ontologyCheck && ontologyCheck.ok === true) {
      out.push({
        kind: "ok",
        title: "Ontology check",
        body: "Latest ontology response is OK — counts reflect loaded classes for semantic alignment.",
      });
    }

    if (!out.length) {
      out.push({
        kind: "neutral",
        title: "Co-pilot",
        body: "No hard conflicts detected. Keep sections cross-linked: mechanics ↔ rewards ↔ assessment (s18).",
      });
    }
    return out;
  }, [sections, ontologyCheck, aiTargetHexad]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "sticky",
          top: 20,
          alignSelf: "start",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          padding: "14px 8px",
          borderRadius: "0 14px 14px 0",
          border: "1px solid rgba(59,130,246,0.35)",
          background: "rgba(37,99,235,0.2)",
          color: "#bfdbfe",
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: "0.08em",
          cursor: "pointer",
        }}
      >
        AI Co-Pilot
      </button>
    );
  }

  return (
    <aside
      style={{
        position: "sticky",
        top: 20,
        alignSelf: "start",
        maxHeight: "calc(100vh - 200px)",
        overflow: "auto",
        borderRadius: 22,
        border: "1px solid rgba(59,130,246,0.22)",
        background: "linear-gradient(180deg, rgba(30,58,138,0.25), rgba(15,23,42,0.94))",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#93c5fd", letterSpacing: "0.1em" }}>AI CO-PILOT</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>Design guardrails</div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            ...styles.smallButton,
            padding: "6px 10px",
            fontSize: 11,
          }}
        >
          Hide
        </button>
      </div>
      <p style={{ ...styles.cardHint, margin: 0, lineHeight: 1.55, fontSize: 12 }}>
        Short hints from HEXAD selection, section text, and ontology check status. Full HermiT reasoning stays on the
        server; this panel translates gaps into plain language.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {hints.map((h, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              borderRadius: 14,
              border:
                h.kind === "ontology"
                  ? "1px solid rgba(248,113,113,0.35)"
                  : h.kind === "ok"
                    ? "1px solid rgba(52,211,153,0.3)"
                    : "1px solid rgba(148,163,184,0.15)",
              background: "rgba(15,23,42,0.75)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>{h.title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.55 }}>{h.body}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
