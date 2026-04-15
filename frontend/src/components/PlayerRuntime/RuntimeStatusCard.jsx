import { motion } from "framer-motion";
import React from "react";

export default function RuntimeStatusCard({
  tone = "info",
  chipIcon = null,
  chipText = "",
  title = "",
  description = "",
  primaryAction = null,
  secondaryAction = null,
}) {
  const isWarning = tone === "warning";
  const accentClass = isWarning ? "gf-pr-status-card-warning" : "gf-pr-status-card-info";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`gf-pr-card ${accentClass}`}
      style={{ position: "relative", overflow: "hidden", maxWidth: 860, margin: "20px 0 0", padding: 26 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-20" style={{ backgroundSize: "28px 28px" }} />
      {isWarning ? <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-500/20 blur-3xl" /> : null}
      <div style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          className="gf-pr-chip"
          style={
            isWarning
              ? { display: "inline-flex", alignItems: "center", gap: 8, borderColor: "rgba(251,191,36,0.4)", color: "#fde68a" }
              : { display: "inline-flex", alignItems: "center", gap: 8 }
          }
          animate={
            isWarning
              ? { boxShadow: ["0 0 0 rgba(251,191,36,0)", "0 0 16px rgba(251,191,36,0.28)", "0 0 0 rgba(251,191,36,0)"] }
              : { boxShadow: ["0 0 0 rgba(56,189,248,0)", "0 0 14px rgba(56,189,248,0.24)", "0 0 0 rgba(56,189,248,0)"] }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {chipIcon}
          {chipText}
        </motion.div>
        <h2 className="gf-pr-card-title" style={{ marginTop: 14, color: isWarning ? "#fef3c7" : undefined }}>
          {title}
        </h2>
        <p className="gf-pr-card-hint" style={{ marginTop: 8, maxWidth: 700, color: isWarning ? "#fcd34d" : undefined }}>
          {description}
        </p>
        <div className="gf-pr-status-card-actions" style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {primaryAction}
          {secondaryAction}
        </div>
      </div>
    </motion.div>
  );
}
