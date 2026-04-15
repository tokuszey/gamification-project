import React, { useEffect, useMemo, useState } from "react";
import RuntimePhase2Panel from "./RuntimePhase2Panel";

const PLAYER_PREFIX = "gameforge_player_runtime_v1_";

function readPlayerRuntimeSnapshot(specId) {
  if (!specId) return null;
  try {
    const raw = localStorage.getItem(`${PLAYER_PREFIX}${specId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const auditLog = Array.isArray(parsed?.auditLog) ? parsed.auditLog : [];
    return { auditLog };
  } catch {
    return null;
  }
}

export default function RuntimeLabPage({
  styles,
  specId,
  specStatus,
}) {
  const [snapshot, setSnapshot] = useState(() => readPlayerRuntimeSnapshot(specId ? String(specId) : null));

  useEffect(() => {
    const sid = specId ? String(specId) : null;
    setSnapshot(readPlayerRuntimeSnapshot(sid));
    if (!sid) return undefined;
    const tick = () => setSnapshot(readPlayerRuntimeSnapshot(sid));
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [specId]);

  const auditStats = useMemo(() => {
    const events = snapshot?.auditLog || [];
    const byType = events.reduce((acc, e) => {
      const k = String(e?.actionType || "runtime_event");
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const violations = events.filter((e) => String(e?.actionType || "") === "policy_violation");
    const objectiveGuardViolations = violations.filter(
      (e) => String(e?.meta?.policy || "") === "xp_objective_1to1",
    );
    const instructorValidations = byType.instructor_validation || 0;
    const recentViolations = violations
      .slice(-5)
      .reverse()
      .map((e) => ({
        id: e?.id || `${e?.ts || Date.now()}`,
        text: e?.text || "Policy violation",
        ts: e?.ts || Date.now(),
        policy: e?.meta?.policy || "unknown_policy",
      }));
    return {
      totalEvents: events.length,
      violationCount: violations.length,
      objectiveGuardViolations: objectiveGuardViolations.length,
      instructorValidations,
      byType,
      violationTrend: events.slice(-20).map((e) => (String(e?.actionType || "") === "policy_violation" ? 1 : 0)),
      recentViolations,
    };
  }, [snapshot]);

  return (
    <>
      <div style={styles.card}>
        <div style={styles.cardHeaderRow}>
          <div>
            <h3 style={{ ...styles.cardTitle, marginBottom: 6 }}>Runtime Lab (developer / technical audit desk)</h3>
            <p style={styles.cardHint}>
              This screen is for technical validation only: <strong>State Machine Visualizer</strong>,{" "}
              <strong>Action Simulator</strong>, <strong>Section 15 Rule Monitor</strong>, <strong>Live Event Log</strong>, and{" "}
              <strong>Ontology Health Check</strong>.
            </p>
          </div>
        </div>
        {specId ? (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {[
                { label: "Audit Events", value: auditStats.totalEvents },
                { label: "Policy Violations", value: auditStats.violationCount },
                { label: "XP-Objective Guard", value: auditStats.objectiveGuardViolations },
                { label: "Instructor Validations", value: auditStats.instructorValidations },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(59,130,246,0.28)",
                    background: "rgba(2,6,23,0.45)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: "1px solid rgba(56,189,248,0.28)",
                background: "rgba(2,6,23,0.42)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#bae6fd", marginBottom: 8 }}>Action Type Distribution</div>
              {Object.entries(auditStats.byType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => {
                  const ratio = auditStats.totalEvents > 0 ? (count / auditStats.totalEvents) * 100 : 0;
                  return (
                    <div key={name} style={{ display: "grid", gridTemplateColumns: "120px 1fr 42px", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: "#cbd5e1" }}>{name}</div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(30,41,59,0.8)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${ratio}%`, background: "linear-gradient(90deg, #38bdf8, #22c55e)" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#e2e8f0", textAlign: "right" }}>{count}</div>
                    </div>
                  );
                })}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: "1px solid rgba(251,191,36,0.3)",
                background: "rgba(120,53,15,0.2)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fde68a", marginBottom: 8 }}>Violation Trend (Last 20)</div>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", minHeight: 20 }}>
                {auditStats.violationTrend.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#cbd5e1" }}>No data yet.</div>
                ) : (
                  auditStats.violationTrend.map((v, i) => (
                    <div
                      key={`trend-${i}`}
                      style={{
                        flex: 1,
                        height: v ? 18 : 6,
                        borderRadius: 4,
                        background: v ? "rgba(248,113,113,0.92)" : "rgba(148,163,184,0.36)",
                      }}
                    />
                  ))
                )}
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: "1px solid rgba(248,113,113,0.3)",
                background: "rgba(127,29,29,0.18)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fecaca", marginBottom: 8 }}>Recent Policy Violations</div>
              {auditStats.recentViolations.length === 0 ? (
                <div style={{ fontSize: 12, color: "#cbd5e1" }}>No violations in local audit snapshot.</div>
              ) : (
                auditStats.recentViolations.map((v) => (
                  <div key={v.id} style={{ fontSize: 12, color: "#fee2e2", marginBottom: 6 }}>
                    [{new Date(v.ts).toLocaleTimeString()}] {v.policy} - {v.text}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      {specId ? (
        <RuntimePhase2Panel specId={String(specId)} specStatus={specStatus || ""} styles={styles} />
      ) : (
        <div style={styles.cardHint}>Select an active spec to load the technical audit panel.</div>
      )}
    </>
  );
}
