import { BookOpen, Target } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

const iconTile = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(74,222,128,0.22)",
  flexShrink: 0,
};

/**
 * Workbook `core_learning_objectives` → progress bars (1:1 XP / objective_id).
 * Panel chrome comes from spec §03 via props; optional `specS03Fallback` when the workbook has no numeric objectives yet.
 */
export default function LearningObjectivesBar({
  workbook,
  objectiveXp,
  panelTitle,
  panelHint,
  specS03Fallback,
}) {
  const objs = workbook?.core_learning_objectives;
  const ox = objectiveXp || {};
  const titleLine = (panelTitle && String(panelTitle).trim()) || "";
  const hintLine = (panelHint && String(panelHint).trim()) || "";
  const fallbackBody = (specS03Fallback && String(specS03Fallback).trim()) || "";

  if (!Array.isArray(objs) || objs.length === 0) {
    if (!fallbackBody) return null;
    return (
      <section
        id="player-objectives"
        className="gf-pr-card gf-pr-scroll-mt"
        style={{ position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "relative", zIndex: 1 }} className="gf-pr-objective-map">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div style={iconTile}>
              <BookOpen className="h-5 w-5" style={{ color: "#86efac" }} strokeWidth={2} />
            </div>
            <div>
              {titleLine ? <h2 className="gf-pr-card-title">{titleLine}</h2> : null}
              {hintLine ? (
                <p className="gf-pr-card-hint" style={{ marginTop: 6 }}>
                  {hintLine}
                </p>
              ) : null}
            </div>
          </div>
          <p className="gf-pr-card-hint" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
            {fallbackBody.length > 2400 ? `${fallbackBody.slice(0, 2400)}…` : fallbackBody}
          </p>
        </div>
      </section>
    );
  }
  const nodes = objs.slice(0, 6).map((o) => {
    const id = String(o.objective_id || "");
    const th = Math.max(1, typeof o.mastery_threshold === "number" ? o.mastery_threshold : 100);
    const cur = ox[id] || 0;
    const pct = Math.min(100, Math.round((cur / th) * 100));
    const mastered = cur >= th;
    return {
      id,
      title: o.title || id,
      threshold: th,
      current: cur,
      pct,
      mastered,
    };
  });
  const cols = [nodes.slice(0, 1), nodes.slice(1, 4), nodes.slice(4, 6)];

  return (
    <section
      id="player-objectives"
      className="gf-pr-card gf-pr-scroll-mt"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "relative", zIndex: 1 }} className="gf-pr-objective-map">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <div style={iconTile}>
            <BookOpen className="h-5 w-5" style={{ color: "#86efac" }} strokeWidth={2} />
          </div>
          <div>
            <h2 className="gf-pr-card-title">
              {titleLine || "—"}
            </h2>
            {hintLine ? (
              <p className="gf-pr-card-hint" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {hintLine}
              </p>
            ) : null}
          </div>
        </div>

        <div className="gf-pr-map-grid-wrap">
          <svg className="gf-pr-map-links" viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden>
            <path d="M170 250 C 280 250, 290 120, 420 120" />
            <path d="M170 250 C 280 250, 290 260, 420 260" />
            <path d="M170 250 C 280 250, 290 400, 420 400" />
            <path d="M600 120 C 700 120, 730 110, 860 110" />
            <path d="M600 260 C 700 260, 730 260, 860 260" />
            <path d="M600 400 C 700 400, 730 410, 860 410" />
          </svg>
          <div className="gf-pr-map-grid">
            {cols.map((col, colIdx) => (
              <div key={`col-${colIdx}`} className="gf-pr-map-col">
                {col.map((node) => (
                  <motion.article
                    key={node.id || node.title}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`gf-pr-map-node ${node.mastered ? "gf-pr-map-node-mastered" : ""}`}
                  >
                    <div className="gf-pr-map-node-id">{node.id || "objective"}</div>
                    <div className="gf-pr-map-node-title">{node.title}</div>
                    <div className="gf-pr-map-node-progress-row">
                      <div className="gf-pr-map-node-progress-track">
                        <div className="gf-pr-map-node-progress-fill" style={{ width: `${node.pct}%` }} />
                      </div>
                      <span className="gf-pr-map-node-pct">{node.pct}%</span>
                    </div>
                    <div className="gf-pr-map-node-state">
                      <Target className="h-3.5 w-3.5" strokeWidth={2} />
                      {node.mastered ? "MASTERED" : `${node.current}/${node.threshold} XP`}
                    </div>
                  </motion.article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
