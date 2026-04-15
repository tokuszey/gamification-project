import React, { useEffect } from "react";
import PlayerDashboard from "./components/Runtime/PlayerDashboard";
import { useRealization } from "./context/RealizationContext.jsx";

/**
 * Phase-2: RealizationProvider supplies package + technical log; dashboard is the lab console.
 */
export default function RuntimePhase2Panel({ specId, specStatus, styles }) {
  const approved = String(specStatus || "").toLowerCase() === "approved";
  const sid = specId ? Number(specId) : null;
  const { loadPackage } = useRealization();

  useEffect(() => {
    if (approved && sid) void loadPackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when spec gate opens
  }, [approved, sid]);

  if (!specId) return null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeaderRow}>
        <div>
          <h3 style={{ ...styles.cardTitle, marginBottom: 6 }}>Realization engine (Phase 2)</h3>
          <p style={styles.cardHint}>
            Approved specs call <code>/api/v1/realize</code> for a <strong>deployment package</strong>. Events stream into the technical
            log; simulations cover quiz and <strong>non-quiz</strong> actions (hazard, gifting, discovery).
          </p>
        </div>
      </div>
      {!approved ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.22)",
            color: "#bfdbfe",
            fontSize: 13,
          }}
        >
          Approve this specification in Spec Studio to generate the deployment package.
        </div>
      ) : (
        <PlayerDashboard />
      )}
    </div>
  );
}
