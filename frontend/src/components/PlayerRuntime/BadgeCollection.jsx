import { Lock, Medal, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

const rarityUi = {
  common: {
    label: "Common",
    border: "1px solid rgba(148,163,184,0.18)",
    background: "linear-gradient(165deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))",
    text: "#e2e8f0",
    glow: "none",
    iconUnlocked: "#93c5fd",
  },
  rare: {
    label: "Rare",
    border: "1px solid rgba(59,130,246,0.28)",
    background: "linear-gradient(165deg, rgba(30,58,138,0.35), rgba(15,23,42,0.94))",
    text: "#e0f2fe",
    glow: "0 0 22px rgba(59,130,246,0.18)",
    iconUnlocked: "#7dd3fc",
  },
  epic: {
    label: "Epic",
    border: "1px solid rgba(99,102,241,0.32)",
    background: "linear-gradient(165deg, rgba(67,56,202,0.28), rgba(15,23,42,0.94))",
    text: "#e0e7ff",
    glow: "0 0 24px rgba(99,102,241,0.2)",
    iconUnlocked: "#a5b4fc",
  },
  legendary: {
    label: "Legendary",
    border: "1px solid rgba(245,158,11,0.35)",
    background: "linear-gradient(165deg, rgba(120,53,15,0.35), rgba(15,23,42,0.94))",
    text: "#fef3c7",
    glow: "0 0 26px rgba(245,158,11,0.2)",
    iconUnlocked: "#fcd34d",
  },
};

const medalTile = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(245,158,11,0.28)",
  background: "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(22,163,74,0.1))",
};

function unlockHintForBadge(badge, badgeHints) {
  const bid = String(badge?.id || "").trim();
  if (bid && badgeHints && typeof badgeHints[bid] === "string" && badgeHints[bid].trim()) {
    return badgeHints[bid].trim();
  }
  const raw = String(badge?.id || badge?.label || "").toLowerCase();
  if (/team|social|collab|paylas|share|cohort/.test(raw)) {
    return "Finish the sharing step on social quests and confirm your contribution.";
  }
  if (/early|streak|bird|istikrar/.test(raw)) {
    return "Complete quests on consecutive days to build a streak.";
  }
  if (/safety|hazard|defense|security/.test(raw)) {
    return "Complete hazard reports or safety-focused quests.";
  }
  if (/master|apex|legend|uzman/.test(raw)) {
    return "Reach high mastery on objectives and complete advanced quests.";
  }
  return "Unlocks automatically when you complete the quest that triggers the rule.";
}

export default function BadgeCollection({ catalog, earnedIds, hexadHint, badgeHints = {} }) {
  const gEarned = new Set(earnedIds);
  const nEarned = catalog.filter((b) => gEarned.has(b.id)).length;

  return (
    <section id="player-badges" className="gf-pr-card gf-pr-scroll-mt" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            marginBottom: 22,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
            <div style={medalTile}>
              <Medal className="h-5 w-5" style={{ color: "#fcd34d" }} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 className="gf-pr-card-title">Badge gallery</h2>
              <p style={{ ...subtitle, margin: "6px 0 0" }}>Rewards · Sections 6 &amp; 8</p>
              <p className="gf-pr-presenter" style={{ marginTop: 10, maxWidth: 440 }}>
                <strong>Presenter:</strong>{" "}
                {hexadHint ? (
                  <>
                    With HEXAD profile{" "}
                    <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#7dd3fc" }}>{hexadHint}</span>, the Section
                    8 reward layout is reflected here.
                  </>
                ) : (
                  <>
                    The Section 8 reward system for the learner&apos;s HEXAD player type is reflected here.
                  </>
                )}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(245,158,11,0.25)",
              background: "rgba(245,158,11,0.08)",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              fontSize: 12,
              fontWeight: 700,
              color: "#fde68a",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: "#fcd34d" }} strokeWidth={2} />
            {nEarned}/{catalog.length}
          </div>
        </div>

        <div className="gf-pr-badge-grid">
          {catalog.map((b, i) => {
            const unlocked = gEarned.has(b.id);
            const rs = rarityUi[b.rarity] || rarityUi.common;
            const shield = i % 2 === 1;
            const clip = shield ? "polygon(50% 0%, 100% 14%, 100% 72%, 50% 100%, 0% 72%, 0% 14%)" : undefined;
            const unlockHint = unlockHintForBadge(b, badgeHints);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.32 }}
                whileHover={{ y: -2, transition: { duration: 0.18 } }}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: 16,
                  borderRadius: shield ? undefined : 16,
                  clipPath: clip,
                  border: rs.border,
                  background: rs.background,
                  boxShadow: unlocked ? rs.glow : "0 8px 24px rgba(0,0,0,0.12)",
                }}
                className="gf-pr-badge-card"
                title={unlockHint}
              >
                {!unlocked ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 10,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(15,23,42,0.88)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <Lock className="mb-1 h-6 w-6" style={{ color: "#64748b" }} strokeWidth={2} />
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase" }}>
                      Locked
                    </span>
                  </div>
                ) : null}
                <div style={{ textAlign: "center", color: unlocked ? rs.text : "#64748b" }}>
                  <motion.div
                    style={{
                      margin: "0 auto 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: shield ? 64 : 52,
                      height: shield ? 64 : 52,
                      borderRadius: shield ? undefined : "50%",
                      background: "rgba(0,0,0,0.28)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    animate={unlocked ? { rotate: [0, -3, 3, 0] } : {}}
                    transition={{ duration: 0.6, delay: i * 0.04 }}
                  >
                    {shield ? (
                      <Shield className="h-11 w-11" style={{ color: unlocked ? rs.iconUnlocked : "#475569" }} strokeWidth={1.35} />
                    ) : unlocked ? (
                      <div
                        aria-hidden
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "linear-gradient(145deg, #22c55e, #2563eb)",
                          boxShadow: "0 0 18px rgba(34,197,94,0.35)",
                          border: "2px solid rgba(167,243,208,0.35)",
                        }}
                      />
                    ) : (
                      <div
                        aria-hidden
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          border: "2px dashed #475569",
                          background: "rgba(15,23,42,0.5)",
                        }}
                      />
                    )}
                  </motion.div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      minHeight: "2.5rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {b.label}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: 0.85,
                    }}
                  >
                    {rs.label}
                  </div>
                </div>
                <div className="gf-pr-badge-tooltip">{unlockHint}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const subtitle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(74,222,128,0.75)",
};
