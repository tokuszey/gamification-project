import React, { useMemo } from "react";

function typeToIcon(missionType) {
  switch (missionType) {
    case "quiz":
      return "❓";
    case "timed_choice":
      return "⏱️";
    case "sequence":
      return "🧭";
    case "team_vote":
      return "👥";
    case "risk_response":
      return "⚡";
    case "maze_escape":
      return "🧩";
    case "platformer_run":
      return "🏃‍♂️";
    case "dodge_runner":
      return "🛡️";
    case "tower_climb":
      return "🗼";
    default:
      return "🧱";
  }
}

/** Smooth path through mission stops (same geometry for base track + progress). */
function smoothPathThrough(points, tension = 0.32) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** One cubic segment between pts[i] and pts[i+1], matching smoothPathThrough geometry. */
function cubicEdge(pts, i, tension = 0.32) {
  if (i < 0 || i >= pts.length - 1) return "";
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];
  const c1x = p1.x + (p2.x - p0.x) * tension;
  const c1y = p1.y + (p2.y - p0.y) * tension;
  const c2x = p2.x - (p3.x - p1.x) * tension;
  const c2y = p2.y - (p3.y - p1.y) * tension;
  return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

export default function RuntimeObstacleMap({
  missions,
  completedTaskIds,
  activeMissionId,
  selectedMissionId,
  unlockedMissionIds,
  playerEnergy,
}) {
  const nodes = useMemo(() => {
    const ms = (missions || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    return ms;
  }, [missions]);

  const completedSet = useMemo(() => new Set((completedTaskIds || []).map((x) => Number(x))), [completedTaskIds]);

  const unlockedSet = useMemo(() => new Set((unlockedMissionIds || []).map((x) => Number(x))), [unlockedMissionIds]);

  const max = Math.max(1, nodes.length);

  const layout = useMemo(() => {
    const w = 520;
    const h = 200;
    const padL = 36;
    const padR = 36;
    const usable = w - padL - padR;
    const pts = nodes.map((_, i) => {
      const t = max <= 1 ? 0.5 : i / (max - 1);
      const x = padL + t * usable;
      const wave = Math.sin(t * Math.PI * 1.35) * 32;
      const y = h / 2 + wave;
      return { x, y };
    });
    const trackD = pts.length ? smoothPathThrough(pts, 0.32) : "";
    return { w, h, pts, trackD };
  }, [nodes, max]);

  const firstIncompleteIndex = useMemo(() => {
    for (let i = 0; i < nodes.length; i++) {
      if (!completedSet.has(nodes[i].id)) return i;
    }
    return nodes.length;
  }, [nodes, completedSet]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8, color: "#e5e7eb" }}>Mission graph (spec order)</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
        Nodes follow tasks extracted from your specification. Cleared missions unlock the next; energy and locks reflect runtime rules from the realization profile.
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <svg
            width="100%"
            height="220"
            viewBox={`0 0 ${layout.w} ${layout.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block", borderRadius: 16, background: "radial-gradient(ellipse 85% 70% at 50% 45%, rgba(30,58,138,0.22), rgba(2,6,23,0.92))", border: "1px solid rgba(148,163,184,0.12)" }}
          >
            <defs>
              <linearGradient id="routeGlow" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(34,197,94,0.95)" />
                <stop offset="45%" stopColor="rgba(56,189,248,0.85)" />
                <stop offset="100%" stopColor="rgba(99,102,241,0.75)" />
              </linearGradient>
              <linearGradient id="routeDim" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(51,65,85,0.45)" />
                <stop offset="100%" stopColor="rgba(71,85,105,0.35)" />
              </linearGradient>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#020617" floodOpacity="0.55" />
              </filter>
            </defs>

            {/* subtle grid */}
            <g opacity="0.06" stroke="#94a3b8" strokeWidth="0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`v${i}`} x1={(i * layout.w) / 8} y1={0} x2={(i * layout.w) / 8} y2={layout.h} />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={(i * layout.h) / 4} x2={layout.w} y2={(i * layout.h) / 4} />
              ))}
            </g>

            {/* base track */}
            {layout.trackD ? (
              <>
                <path d={layout.trackD} fill="none" stroke="url(#routeDim)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                <path d={layout.trackD} fill="none" stroke="rgba(15,23,42,0.85)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}

            {/* progress highlight: curve matches full track between consecutive stops */}
            {layout.pts.length >= 2 &&
              nodes.map((m, i) => {
                if (i >= nodes.length - 1) return null;
                if (i >= firstIncompleteIndex) return null;
                const segD = cubicEdge(layout.pts, i);
                if (!segD) return null;
                return (
                  <path
                    key={`seg-${m.id}`}
                    d={segD}
                    fill="none"
                    stroke="url(#routeGlow)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                  />
                );
              })}

            {/* nodes */}
            {nodes.map((m, i) => {
              const { x, y } = layout.pts[i] || { x: layout.w / 2, y: layout.h / 2 };

              const completed = completedSet.has(m.id);
              const active = activeMissionId === m.id;
              const selected = selectedMissionId === m.id;

              const locked = unlockedSet.size ? !unlockedSet.has(m.id) : false;
              const energyBlocked = !locked && playerEnergy != null ? Number(playerEnergy) < Number(m.energy_cost ?? 0) : false;

              const fill = completed
                ? "rgba(34,197,94,0.95)"
                : active
                  ? "rgba(56,189,248,1)"
                  : selected
                    ? "rgba(147,197,253,0.95)"
                    : energyBlocked
                      ? "rgba(245,158,11,0.95)"
                      : locked
                        ? "rgba(71,85,105,0.55)"
                        : "rgba(100,116,139,0.75)";

              const ring = completed
                ? "rgba(52,211,153,0.9)"
                : active
                  ? "rgba(125,211,252,0.95)"
                  : selected
                    ? "rgba(186,230,253,0.75)"
                    : energyBlocked
                      ? "rgba(251,191,36,0.85)"
                      : locked
                        ? "rgba(100,116,139,0.35)"
                        : "rgba(148,163,184,0.5)";

              const r = 17;
              return (
                <g key={m.id} style={{ cursor: "default" }} filter="url(#softShadow)">
                  <circle cx={x} cy={y} r={r + 5} fill="none" stroke={ring} strokeWidth="1.5" opacity={active ? 0.85 : 0.35} />
                  <circle cx={x} cy={y} r={r + 2} fill="rgba(2,6,23,0.5)" stroke={ring} strokeWidth="2.5" />
                  <circle
                    cx={x}
                    cy={y}
                    r={r - 3}
                    fill={fill}
                    filter={active ? "url(#nodeGlow)" : undefined}
                  />
                  <text x={x} y={y + 4.5} textAnchor="middle" fontSize="12" fill="rgba(2,6,23,0.92)" style={{ fontWeight: 900 }}>
                    {typeToIcon(m.type)}
                  </text>
                  <text x={x} y={y + r + 14} textAnchor="middle" fontSize="9.5" fill="rgba(203,213,225,0.9)" style={{ fontWeight: 700 }}>
                    #{m.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ background: "rgba(15,23,42,0.65)", border: "1px solid rgba(148,163,184,0.10)", borderRadius: 16, padding: 14 }}>
            <div style={{ color: "#cbd5e1", fontWeight: 800, marginBottom: 8 }}>Progress</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
              {completedSet.size}/{nodes.length} obstacles cleared
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(completedSet.size / (nodes.length || 1)) * 100}%`,
                  background: "linear-gradient(90deg, #22c55e, #38bdf8, #6366f1)",
                }}
              />
            </div>

            <div style={{ marginTop: 12, color: "#94a3b8", fontSize: 12 }}>
              Tip: Correct answers unlock the next obstacle. Wrong attempts reset streak/combo and cost energy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
