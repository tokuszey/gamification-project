import { Award, Radio } from "lucide-react";
import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";

function isBadgeEntry(text) {
  return /unlocked|rozet|badge|kilidi açıldı/i.test(text || "");
}

function eventTypeTag(actionType, text) {
  if (actionType === "policy_violation") return { label: "POLICY", tone: "danger" };
  if (actionType === "quest_complete") return { label: "QUEST", tone: "success" };
  if (actionType === "instructor_validation") return { label: "VALIDATION", tone: "warn" };
  if (actionType === "shop_purchase") return { label: "SHOP", tone: "info" };
  if (isBadgeEntry(text)) return { label: "BADGE", tone: "warn" };
  return { label: "EVENT", tone: "muted" };
}

const iconTile = {
  width: 40,
  height: 40,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  border: "1px solid rgba(59,130,246,0.22)",
  background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(22,163,74,0.08))",
};

export default function PlayerEventLog({ entries, actorName }) {
  const listRef = useRef(null);
  const initial = (actorName || "O").trim().charAt(0).toUpperCase() || "O";

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [entries]);

  const rows = entries || [];

  return (
    <section className="gf-pr-card" style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.35,
          background: "linear-gradient(165deg, rgba(37,99,235,0.06) 0%, transparent 50%, rgba(22,163,74,0.05) 100%)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={iconTile}>
          <Radio className="h-5 w-5" style={{ color: "#7dd3fc" }} strokeWidth={2} />
        </div>
        <div>
          <h2 className="gf-pr-card-title" style={{ fontSize: 18 }}>
            Event log
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(74,222,128,0.75)" }}>
            Live feed
          </p>
          <p className="gf-pr-presenter" style={{ marginTop: 10, maxWidth: 420 }}>
            <strong>Presenter:</strong> When a rule fires, +XP / +Gold for the player shows up here in real time.
          </p>
        </div>
      </div>

      <div ref={listRef} className="gf-pr-log-scroll" style={{ scrollbarGutter: "stable" }}>
        {rows.length === 0 ? (
          <p
            style={{
              margin: 0,
              borderRadius: 14,
              border: "1px dashed rgba(148,163,184,0.22)",
              background: "rgba(15,23,42,0.45)",
              padding: "28px 16px",
              textAlign: "center",
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            Complete a quest or fire a rule; activity appears here.
          </p>
        ) : (
          rows.map((e, i) => {
            const badgeRow = isBadgeEntry(e.text);
            const tag = eventTypeTag(e.actionType, e.text);
            const tagStyle =
              tag.tone === "danger"
                ? { color: "#fecaca", border: "1px solid rgba(248,113,113,0.45)", background: "rgba(127,29,29,0.4)" }
                : tag.tone === "success"
                  ? { color: "#86efac", border: "1px solid rgba(74,222,128,0.42)", background: "rgba(20,83,45,0.35)" }
                  : tag.tone === "warn"
                    ? { color: "#fde68a", border: "1px solid rgba(250,204,21,0.42)", background: "rgba(113,63,18,0.35)" }
                    : tag.tone === "info"
                      ? { color: "#bae6fd", border: "1px solid rgba(56,189,248,0.42)", background: "rgba(8,47,73,0.35)" }
                      : { color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.3)", background: "rgba(30,41,59,0.4)" };
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
                className="gf-pr-log-row"
              >
                <div
                  style={{
                    marginTop: 2,
                    display: "flex",
                    height: 36,
                    width: 36,
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    border: badgeRow ? "1px solid rgba(245,158,11,0.28)" : "1px solid rgba(59,130,246,0.2)",
                    background: badgeRow ? "rgba(245,158,11,0.1)" : "rgba(15,23,42,0.9)",
                    color: badgeRow ? "#fcd34d" : "#7dd3fc",
                  }}
                >
                  {badgeRow ? <Award className="h-4 w-4" aria-hidden strokeWidth={2} /> : <span style={{ fontWeight: 800, fontSize: 13 }}>{initial}</span>}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, ui-monospace, monospace",
                        fontSize: 10,
                        color: "rgba(56,189,248,0.55)",
                      }}
                    >
                      {new Date(e.ts).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        ...tagStyle,
                      }}
                    >
                      {tag.label}
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.55, color: "#e2e8f0" }}>{e.text}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}
