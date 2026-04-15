import { MousePointerClick, Zap } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

const iconTile = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(99,102,241,0.28)",
  background: "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(37,99,235,0.1))",
};

const secondaryBtn = {
  borderRadius: 14,
  border: "1px solid rgba(34,197,94,0.28)",
  background: "rgba(22,163,74,0.12)",
  color: "#bbf7d0",
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const ruleBtn = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.12)",
  background: "rgba(15,23,42,0.82)",
  padding: 16,
  textAlign: "left",
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

export default function ActionSimulator({ rules, onTrigger, disabled, quickActions = [] }) {
  const list = rules.slice(0, 12);

  const fire = (e, trigger) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    onTrigger?.(trigger, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <section id="player-rules" className="gf-pr-card gf-pr-scroll-mt" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={iconTile}>
            <MousePointerClick className="h-5 w-5" style={{ color: "#c4b5fd" }} strokeWidth={2} />
          </div>
          <div>
            <h2 className="gf-pr-card-title">Rule simulator</h2>
            <p className="gf-pr-card-hint">Section 15 · run triggers locally</p>
          </div>
        </div>
        <p style={{ margin: "0 0 22px", maxWidth: 640, fontSize: 14, lineHeight: 1.65, color: "#94a3b8" }}>
          Fire realization rules here; XP, virtual currency, and badges update immediately (demo feedback).
        </p>

        {quickActions.length > 0 ? (
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                marginBottom: 10,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(74,222,128,0.85)",
              }}
            >
              Non-quiz · quick
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {quickActions.map((q) => (
                <motion.button
                  key={q.trigger}
                  type="button"
                  disabled={disabled}
                  whileHover={disabled ? {} : { scale: 1.02 }}
                  whileTap={disabled ? {} : { scale: 0.98 }}
                  style={{
                    ...secondaryBtn,
                    opacity: disabled ? 0.45 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                  onClick={(e) => fire(e, q.trigger)}
                >
                  {q.label || q.trigger}
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="gf-pr-rule-grid">
          {list.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                borderRadius: 16,
                border: "1px dashed rgba(148,163,184,0.2)",
                background: "rgba(15,23,42,0.45)",
                padding: 28,
                textAlign: "center",
                fontSize: 14,
                color: "#94a3b8",
              }}
            >
              No rules in the package. Add interaction sequences to Section 15 of your spec.
            </div>
          ) : (
            list.map((r, i) => (
              <motion.button
                key={r.id}
                type="button"
                disabled={disabled}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileHover={disabled ? {} : { y: -2 }}
                whileTap={disabled ? {} : { scale: 0.99 }}
                style={{
                  ...ruleBtn,
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
                onClick={(e) => fire(e, r.trigger_action)}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.35)";
                    e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.12)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(148,163,184,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(37,99,235,0.15)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      color: "#93c5fd",
                    }}
                  >
                    <Zap className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {(r.effect?.points_delta || 0) > 0 ? (
                    <span className="gf-pr-reward-pill" style={{ fontSize: 10, padding: "5px 10px" }}>
                      +{r.effect?.points_delta} XP
                    </span>
                  ) : null}
                </div>
                <span
                  style={{
                    marginTop: 12,
                    display: "block",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#38bdf8",
                  }}
                >
                  Run
                </span>
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "#94a3b8",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.trigger_action}
                </span>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
