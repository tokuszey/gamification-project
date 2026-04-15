import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Node-style viz for pkg.game_state_machine (Madde 13-derived).
 * Rows are horizontal flex (no diagonal "staircase"); snake alternates LTR / RTL.
 */
export default function GameplayFlowNodes({
  machine,
  activeStateId,
  completedStateIds = [],
  lockedStateIds = [],
}) {
  const states = useMemo(() => machine?.states || [], [machine]);
  const initial = machine?.initial_state || "";

  const highlightId = useMemo(() => {
    if (activeStateId) return activeStateId;
    return initial || (states[0] && states[0].id) || "";
  }, [activeStateId, initial, states]);
  const completedSet = useMemo(() => new Set(completedStateIds || []), [completedStateIds]);
  const lockedSet = useMemo(() => new Set(lockedStateIds || []), [lockedStateIds]);
  const hostRef = useRef(null);
  const [rowSize, setRowSize] = useState(5);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !states.length) return undefined;
    const gap = 10;
    const minCard = 120;
    const calcCols = () => {
      const width = el.clientWidth || 0;
      const cols = Math.max(2, Math.floor((width + gap) / (minCard + gap)));
      setRowSize(Math.min(8, cols || 2));
    };
    calcCols();
    const ro = new ResizeObserver(calcCols);
    ro.observe(el);
    return () => ro.disconnect();
  }, [states.length]);

  if (!states.length) return null;
  const rows = chunkStates(states, rowSize);

  return (
    <div
      ref={hostRef}
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,23,42,0.75)",
        border: "1px solid rgba(34,211,238,0.2)",
        overflowX: "hidden",
      }}
    >
      <div style={{ fontSize: 11, color: "#5eead4", fontWeight: 800, marginBottom: 10, letterSpacing: "0.14em" }}>
        STATE MACHINE (MADDE 13)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((rowStates, rowIndex) => {
          const reverse = rowIndex % 2 === 1;
          const nextExists = rowIndex < rows.length - 1;
          return (
            <React.Fragment key={`row_${rowIndex}`}>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: reverse ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: reverse ? "row-reverse" : "row",
                    flexWrap: "nowrap",
                    alignItems: "stretch",
                    gap: 10,
                    maxWidth: "100%",
                  }}
                >
                  {rowStates.map((s, i) => {
                    const on = s.id === highlightId;
                    const done = completedSet.has(s.id);
                    const locked = lockedSet.has(s.id) && !done && !on;
                    const hasNextInRow = i < rowStates.length - 1;
                    return (
                      <React.Fragment key={s.id}>
                        <StateNode s={s} on={on} done={done} locked={locked} />
                        {hasNextInRow ? (
                          <span
                            style={{
                              alignSelf: "center",
                              color: "#64748b",
                              fontSize: 14,
                              fontWeight: 700,
                              flexShrink: 0,
                              userSelect: "none",
                            }}
                            aria-hidden
                          >
                            {reverse ? "←" : "→"}
                          </span>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
              {nextExists ? (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: reverse ? "flex-end" : "flex-end",
                    color: "#64748b",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "2px 0 4px",
                  }}
                >
                  <span style={{ width: 120, textAlign: "center" }}>↓</span>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#64748b" }}>
        Active node follows lab simulation XP (heuristic). Transitions:{" "}
        <code style={{ color: "#93c5fd" }}>advance</code>, <code style={{ color: "#93c5fd" }}>rule_fired</code>.
      </p>
    </div>
  );
}

function StateNode({ s, on, done, locked }) {
  return (
    <div
      title={`${s.label}${s.description ? ` — ${s.description}` : ""}`}
      style={{
        flex: "0 1 auto",
        minWidth: 0,
        width: 128,
        maxWidth: 140,
        boxSizing: "border-box",
        padding: "10px 8px",
        borderRadius: 12,
        border: locked
          ? "1px solid rgba(100,116,139,0.45)"
          : done
            ? "2px solid rgba(74,222,128,0.85)"
            : on
              ? "2px solid rgba(34,211,238,0.85)"
              : "1px solid rgba(148,163,184,0.25)",
        background: locked
          ? "rgba(51,65,85,0.65)"
          : done
            ? "linear-gradient(145deg, rgba(22,163,74,0.24), rgba(16,185,129,0.1))"
            : on
              ? "linear-gradient(145deg, rgba(34,211,238,0.15), rgba(16,185,129,0.08))"
              : "rgba(30,41,59,0.85)",
        boxShadow: done ? "0 0 22px rgba(74,222,128,0.24)" : on ? "0 0 22px rgba(34,211,238,0.2)" : "none",
        color: locked ? "#94a3b8" : "#f1f5f9",
        fontSize: 11,
        fontWeight: 700,
        textAlign: "center",
        opacity: locked ? 0.7 : 1,
      }}
    >
      <div style={{ fontSize: 9, color: "#64748b", marginBottom: 4, fontFamily: "monospace" }}>
        {shortenToken(s.id, 18)}
      </div>
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortenToken(s.label, 22)}</div>
    </div>
  );
}

function chunkStates(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function shortenToken(v, max) {
  const s = String(v || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 1))}…`;
}
