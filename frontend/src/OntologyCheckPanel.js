import React, { useMemo, useState } from "react";

/**
 * Renders ontology check API payload in a readable way.
 * Known shape: { ok, ontology: { classes, individuals, ... } }
 */
export default function OntologyCheckPanel({ data, styles }) {
  const [showRaw, setShowRaw] = useState(false);

  const extraEntries = useMemo(() => {
    if (data == null || typeof data !== "object") return [];
    const reserved = new Set(["ok", "ontology"]);
    return Object.entries(data).filter(([k]) => !reserved.has(k));
  }, [data]);

  if (data == null) {
    return (
      <div style={{ ...styles.cardHint, lineHeight: 1.6 }}>
        No ontology report loaded yet. Run <strong style={{ color: "#cbd5e1" }}>Validate</strong> on this specification to
        fetch alignment results from the ontology check service.
      </div>
    );
  }

  const ok = data.ok === true;
  const ontology = data.ontology && typeof data.ontology === "object" ? data.ontology : null;

  const statRows = ontology
    ? Object.entries(ontology).map(([key, value]) => ({
        key,
        label: humanLabel(key),
        value: formatValue(value),
      }))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 12,
            background: ok ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.16)",
            border: ok ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(239,68,68,0.35)",
            color: ok ? "#86efac" : "#fecaca",
          }}
        >
          {ok ? "Ontology check: OK" : "Ontology check: issue"}
        </span>
        <span style={{ ...styles.cardHint, margin: 0, flex: "1 1 200px" }}>
          {ok
            ? "The ontology service responded successfully. Counts below reflect what is loaded for semantic alignment."
            : "The service returned ok: false. Expand technical details if you need to debug."}
        </span>
      </div>

      {statRows.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {statRows.map((row) => (
            <div
              key={row.key}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(148,163,184,0.12)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {row.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>{row.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.cardHint}>No ontology statistics were included in this response.</div>
      )}

      {extraEntries.length > 0 ? (
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#94a3b8" }}>Additional fields</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {extraEntries.map(([k, v]) => (
              <li key={k}>
                <strong>{humanLabel(k)}:</strong> {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowRaw((x) => !x)}
        style={{
          ...styles.secondaryButton,
          height: 36,
          fontSize: 12,
          alignSelf: "flex-start",
        }}
      >
        {showRaw ? "Hide technical JSON" : "Show technical JSON"}
      </button>
      {showRaw ? (
        <pre style={{ ...styles.preCompact, margin: 0, maxHeight: 220, overflow: "auto" }}>{JSON.stringify(data, null, 2)}</pre>
      ) : null}
    </div>
  );
}

function humanLabel(key) {
  const map = {
    classes: "OWL classes",
    individuals: "Named individuals",
    object_properties: "Object properties",
    data_properties: "Data properties",
    axioms: "Axioms",
    version: "Version",
    source: "Source",
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
