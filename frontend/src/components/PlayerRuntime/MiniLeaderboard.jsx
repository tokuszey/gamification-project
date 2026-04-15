import { Crown, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import React, { useMemo } from "react";

const MOCK_NAMES = ["Nexus_07", "FlowWalker", "QuestNova", "PixelMentor", "SynthHero"];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function rankMedal(rank) {
  if (rank === 1) return { emoji: "🥇", color: "#fcd34d" };
  if (rank === 2) return { emoji: "🥈", color: "#e2e8f0" };
  if (rank === 3) return { emoji: "🥉", color: "#d97706" };
  return { emoji: null, color: "#64748b" };
}

const iconTile = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(245,158,11,0.28)",
  background: "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(234,179,8,0.08))",
};

export default function MiniLeaderboard({ playerName, playerXp }) {
  const rows = useMemo(() => {
    const xp = typeof playerXp === "number" ? playerXp : 0;
    const base = MOCK_NAMES.map((name, i) => {
      const h = hashStr(`${name}:${xp}`);
      const jitter = (h % 241) - 120;
      const botXp = Math.max(0, xp + jitter - i * 7);
      return { rank: 0, name, xp: botXp };
    });
    base.push({ rank: 0, name: playerName || "You", xp, isYou: true });
    base.sort((a, b) => b.xp - a.xp);
    return base.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [playerName, playerXp]);

  const top = rows.slice(0, 6);
  const showPodium = top.length >= 3;
  const listRows = showPodium ? top.slice(3) : top;
  const podiumHeights = [64, 96, 56];

  return (
    <section id="player-leaderboard" className="gf-pr-card gf-pr-scroll-mt" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={iconTile}>
            <Trophy className="h-5 w-5" style={{ color: "#fcd34d" }} strokeWidth={2} />
          </div>
          <div>
            <h2 className="gf-pr-card-title">Leaderboard</h2>
            <p className="gf-pr-card-hint">Sample cohort · ranked by your XP</p>
          </div>
        </div>

        {showPodium ? (
          <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, padding: "0 8px" }}>
            {[top[1], top[0], top[2]].map((r, i) => (
              <motion.div
                key={r.name + String(i)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.38 }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  maxWidth: 108,
                  opacity: i === 1 ? 1 : 0.92,
                  zIndex: i === 1 ? 2 : 1,
                }}
              >
                <div style={{ marginBottom: 6, fontSize: 26 }}>{["🥈", "🥇", "🥉"][i]}</div>
                <div
                  style={{
                    width: "100%",
                    height: podiumHeights[i],
                    borderRadius: "12px 12px 0 0",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: 6,
                    background: "linear-gradient(180deg, rgba(51,65,85,0.5), rgba(30,41,59,0.85))",
                    border: "1px solid rgba(148,163,184,0.12)",
                    boxShadow: i === 1 ? "0 12px 32px rgba(37,99,235,0.15)" : undefined,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#cbd5e1", textAlign: "center", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                    {r.name}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#7dd3fc",
                  }}
                >
                  {r.xp} XP
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {listRows.map((r, idx) => {
            const m = rankMedal(r.rank);
            return (
              <motion.li
                key={r.name + r.rank}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * idx }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: r.isYou ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(148,163,184,0.1)",
                  background: r.isYou ? "linear-gradient(90deg, rgba(37,99,235,0.14), transparent)" : "rgba(15,23,42,0.55)",
                  fontSize: 14,
                }}
              >
                <span style={{ display: "flex", minWidth: 0, flex: 1, alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      display: "flex",
                      width: 36,
                      flexShrink: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: m.color,
                    }}
                  >
                    {m.emoji ? <span aria-hidden>{m.emoji}</span> : `#${r.rank}`}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      minWidth: 0,
                      alignItems: "center",
                      gap: 6,
                      fontWeight: r.isYou ? 700 : 500,
                      color: r.isYou ? "#e0f2fe" : "#cbd5e1",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.isYou ? <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "#38bdf8" }} strokeWidth={2} /> : null}
                    <span>{r.name}</span>
                  </span>
                </span>
                <span style={{ flexShrink: 0, fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 600, color: "#7dd3fc" }}>
                  {r.xp}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
