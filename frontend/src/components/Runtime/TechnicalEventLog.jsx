import React, { useEffect, useRef } from "react";

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour12: false });
  } catch {
    return "";
  }
}

export default function TechnicalEventLog({ entries, onClear }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [entries]);

  const rows = entries || [];

  return (
    <div>
      <div
        style={{
          padding: 14,
          borderRadius: 16,
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(52,211,153,0.18)",
          maxHeight: 280,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 800, letterSpacing: "0.12em" }}>LIVE EVENT STREAM</div>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div
          ref={ref}
          style={{
            overflowY: "auto",
            flex: 1,
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            lineHeight: 1.45,
            color: "#cbd5e1",
          }}
        >
          {rows.length === 0 ? (
            <span style={{ color: "#64748b" }}>Run simulations to stream rule + logic traces…</span>
          ) : (
            rows.map((e) => (
              <div
                key={e._id || `${e.ts}-${e.message}`}
                style={{
                  padding: "8px 6px",
                  borderBottom: "1px solid rgba(148,163,184,0.08)",
                }}
              >
                <span style={{ color: "#22d3ee", marginRight: 8 }}>{formatTime(e.ts)}</span>
                <span
                  style={{
                    display: "inline-block",
                    marginRight: 8,
                    padding: "2px 6px",
                    borderRadius: 6,
                    background:
                      e.channel === "player"
                        ? "rgba(168,85,247,0.15)"
                        : e.channel === "lab"
                          ? "rgba(34,211,238,0.12)"
                          : "rgba(148,163,184,0.12)",
                    color: "#e2e8f0",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {e.channel || "sys"}
                </span>
                <span style={{ color: "#f8fafc", fontWeight: 600 }}>
                  {e.kind === "simulation" ? "Received Event" : e.message || e.kind}
                </span>
                {e.kind === "simulation" ? (
                  <span style={{ marginLeft: 8, color: "#94a3b8" }}>
                    {`| Action: ${e.message} | Delta: +${e.detail?.pointsDelta || 0}XP`}
                    {e.detail?.durationSec ? ` | T: ${e.detail.durationSec}s` : ""}
                  </span>
                ) : null}
                {e.detail?.matchedRules?.length ? (
                  <div style={{ marginTop: 4, color: "#86efac", paddingLeft: 4 }}>
                    Rules:{" "}
                    {e.detail.matchedRules.map((r) => (r.trigger_action || r.id || "").slice(0, 40)).join(" · ")}
                    {e.detail.pointsDelta ? ` → +${e.detail.pointsDelta} XP` : ""}
                    {e.detail.badgeIds?.length ? ` badges [${e.detail.badgeIds.join(", ")}]` : ""}
                  </div>
                ) : null}
                {e.kind === "simulation" && !e.detail?.matchedRules?.length ? (
                  <div style={{ marginTop: 4, color: "#fca5a5", paddingLeft: 4 }}>
                    [Error] Condition not met: no matching rule in section 15
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
