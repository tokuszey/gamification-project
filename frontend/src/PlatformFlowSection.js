import React from "react";

/** End-to-end path: Specification → Realization. */
export default function PlatformFlowSection({ styles, onNavigate }) {
  const go = (page) => () => onNavigate?.(page);

  const phase1Steps = [
    {
      n: 1,
      title: "Project framing (6D)",
      body:
        "Name the project and capture business goals, target behaviors, and context in an academic design-doc style. The template enforces the standard 25-section specification structure.",
      map: { label: "6D specification wizard", page: "sixdwizard" },
    },
    {
      n: 2,
      title: "Player analysis (HEXAD & Bartle)",
      body:
        "Choose audience cues such as competition, collaboration, or exploration; mapped to HEXAD behind the scenes. Optional target HEXAD filters AI suggestions.",
      map: { label: "6D wizard (HEXAD/Bartle)", page: "sixdwizard" },
    },
    {
      n: 3,
      title: "Ontology-driven hints (GamifyOnt)",
      body:
        "The ontology links mechanics, rewards, and players semantically; validation panels support conceptual consistency.",
      map: { label: "Ontology Check", page: "spec" },
    },
    {
      n: 4,
      title: "AI-assisted drafting (LLM)",
      body:
        "Generate text per section or for the full specification. Output follows the 25-section template and export pipeline.",
      map: { label: "AI workspace", page: "spec" },
    },
  ];

  const phase2Steps = [
    {
      n: 5,
      title: "Template selection & customization",
      body:
        "Domain templates and section copy shape the experience; badges and leaderboard design live in the specification.",
      map: { label: "Template + sections", page: "spec" },
    },
    {
      n: 6,
      title: "Dynamic rule configuration",
      body:
        "After validate and approve, “Realize” produces tasks, XP, and unlock rules; persisted via FastAPI.",
      map: { label: "Validate → Approve → Realize", page: "spec" },
    },
    {
      n: 7,
      title: "API & integration",
      body:
        "The platform exposes a REST API. Keys and a full SDK can extend the roadmap.",
      map: { label: "Export hub", page: "export" },
    },
    {
      n: 8,
      title: "Monitoring & analytics",
      body:
        "Preview sessions surface completion, badges, and leaderboard signals; Flow-balance hints included.",
      map: { label: "Analytics", page: "analytics" },
    },
  ];

  const architecture = [
    { key: "dashboard", title: "Home", desc: "Summary metrics, lifecycle, spec list, and this flow.", page: "home" },
    { key: "wizard", title: "6D → 25-section wizard", desc: "Inputs → ontology + AI → standard spec.", page: "sixdwizard" },
    { key: "ai", title: "AI workspace", desc: "Suggestions, alignment report, bulk fill.", page: "spec" },
    { key: "ontology", title: "Ontology Viewer", desc: "GamifyOnt-aligned controls.", page: "spec" },
    { key: "export", title: "Export / API", desc: "DOCX and integration outputs.", page: "export" },
  ];

  const stepCard = {
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    background: "rgba(15,23,42,0.55)",
    border: "1px solid rgba(148,163,184,0.1)",
    marginBottom: 12,
  };

  const stepNum = {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    background: "rgba(37,99,235,0.2)",
    border: "1px solid rgba(59,130,246,0.35)",
    color: "#bfdbfe",
  };

  const archTile = {
    padding: 16,
    borderRadius: 16,
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 120,
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div
        style={{
          marginBottom: 28,
          padding: "28px 26px",
          borderRadius: 24,
          background:
            "linear-gradient(125deg, rgba(37,99,235,0.18) 0%, rgba(15,23,42,0.95) 42%, rgba(20,184,166,0.12) 100%)",
          border: "1px solid rgba(59,130,246,0.22)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#93c5fd",
            marginBottom: 10,
          }}
        >
          End-to-end journey
        </div>
        <h2 style={{ margin: "0 0 12px", fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "#f8fafc" }}>
          Two phases: Specification → Realization
        </h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "#cbd5e1", maxWidth: 920 }}>
          Ontology and AI for a scientific design document; then rules, preview, and API to carry outcomes into your own
          apps. The steps below align with a research report or project proposal narrative.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
          <button type="button" style={styles.primaryButton} onClick={go("spec")}>
            Specification studio
          </button>
          <button type="button" style={styles.secondaryButton} onClick={go("runtime")}>
            Realization preview
          </button>
          <button type="button" style={styles.secondaryButton} onClick={go("analytics")}>
            Monitoring & analytics
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <div>
              <h3 style={styles.cardTitle}>Phase 1 · Specification</h3>
              <p style={{ ...styles.cardHint, margin: "6px 0 0" }}>Where the design document is produced</p>
            </div>
            <span style={styles.inlineBadge}>1–4</span>
          </div>
          {phase1Steps.map((s) => (
            <div key={s.n} style={stepCard}>
              <div style={stepNum}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6, fontSize: 15 }}>{s.title}</div>
                <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.65, color: "#94a3b8" }}>{s.body}</p>
                <button type="button" style={styles.smallButton} onClick={go(s.map.page)}>
                  {s.map.label} →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <div>
              <h3 style={styles.cardTitle}>Phase 2 · Realization</h3>
              <p style={{ ...styles.cardHint, margin: "6px 0 0" }}>Rules, integration, and measurement</p>
            </div>
            <span style={styles.inlineBadge}>5–8</span>
          </div>
          {phase2Steps.map((s) => (
            <div key={s.n} style={stepCard}>
              <div style={{ ...stepNum, background: "rgba(20,184,166,0.15)", borderColor: "rgba(45,212,191,0.35)", color: "#5eead4" }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6, fontSize: 15 }}>{s.title}</div>
                <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.65, color: "#94a3b8" }}>{s.body}</p>
                <button type="button" style={styles.smallButton} onClick={go(s.map.page)}>
                  {s.map.label} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeaderRow}>
          <div>
            <h3 style={styles.cardTitle}>Web architecture</h3>
            <p style={{ ...styles.cardHint, margin: "6px 0 0" }}>Modules and the left navigation</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {architecture.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={go(a.page)}
              style={{
                ...archTile,
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
                color: "inherit",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: 15 }}>{a.title}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.55, flex: 1 }}>{a.desc}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd" }}>Open →</div>
            </button>
          ))}
        </div>
        <p style={{ ...styles.cardHint, marginTop: 16, marginBottom: 0, lineHeight: 1.65 }}>
          <strong style={{ color: "#cbd5e1" }}>Runtime lab</strong> is not a game engine; after approval it is a behavioral
          pilot of tasks and points derived from the spec.
        </p>
        <div style={{ marginTop: 14 }}>
          <button type="button" style={styles.secondaryButton} onClick={go("runtime")}>
            Go to runtime lab
          </button>
        </div>
      </div>
    </div>
  );
}
