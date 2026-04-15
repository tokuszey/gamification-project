import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

/**
 * Compact points + badge strip for live gamification feedback (Runtime Lab).
 */
export default function MechanicVisualizer({
  xp,
  xpNext = 100,
  badges,
  highlight,
}) {
  const pct = Math.min(100, Math.round((xp / Math.max(1, xpNext)) * 100));
  const level = 1 + Math.floor(xp / 120);
  const prevLevel = useRef(level);
  const [levelUpFlash, setLevelUpFlash] = useState(false);

  useEffect(() => {
    if (level > prevLevel.current) {
      setLevelUpFlash(true);
      const t = setTimeout(() => setLevelUpFlash(false), 1200);
      prevLevel.current = level;
      return () => clearTimeout(t);
    }
    prevLevel.current = level;
    return undefined;
  }, [level, xp]);

  return (
    <motion.div
      animate={
        levelUpFlash
          ? { boxShadow: "0 0 0 2px rgba(56,189,248,0.45), 0 0 28px rgba(34,197,94,0.25)" }
          : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
      }
      transition={{ duration: 0.35 }}
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(59,130,246,0.25)",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#94a3b8",
            marginBottom: 6,
          }}
        >
          <span>Experience · Lv {level}</span>
          <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{xp} XP</span>
        </div>
        <motion.div
          animate={levelUpFlash ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.6 }}
          style={{
            height: 10,
            borderRadius: 999,
            background: "rgba(148,163,184,0.15)",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%",
              borderRadius: 999,
              background: highlight
                ? "linear-gradient(90deg,#22c55e,#4ade80)"
                : "linear-gradient(90deg,#2563eb,#38bdf8)",
            }}
          />
        </motion.div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Badges</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {badges.length === 0 ? (
            <span style={{ fontSize: 12, color: "#64748b" }}>None yet</span>
          ) : (
            badges.map((b) => (
              <span
                key={b}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(234,179,8,0.18)",
                  border: "1px solid rgba(250,204,21,0.45)",
                  color: "#fde68a",
                }}
              >
                {b}
              </span>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
