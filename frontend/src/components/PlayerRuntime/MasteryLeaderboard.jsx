import { Flame, Layers, Shield } from "lucide-react";
import { motion } from "framer-motion";
import React, { useMemo } from "react";
import { averageMasteryRatio, masteryTierFromRatio } from "./workbookRuntime.js";

function hashStr(s) {
  let h = 2166136261;
  const str = String(s || "anon");
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return Math.abs(h).toString(36).slice(0, 6);
}

function anonymizedKey(seed) {
  return `GK_${hashStr(seed)}`;
}

const iconTile = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "rgba(99,102,241,0.12)",
  border: "1px solid rgba(129,140,248,0.25)",
  flexShrink: 0,
};

/**
 * spec.leaderboard_view — mastery kademeleri + istikrar; klasik XP sıralaması yok.
 */
export default function MasteryLeaderboard({ workbook, progress, displayName }) {
  const lb = workbook?.leaderboard_view || {};
  const showTiers = lb.show_mastery_tiers !== false;
  const showStreaks = lb.show_consistency_streaks !== false;
  const anonymize = lb.anonymize !== false;

  const playerRatio = averageMasteryRatio(progress, workbook);
  const playerTier = masteryTierFromRatio(playerRatio);
  const playerStreak = progress.streakDays || 0;

  const rows = useMemo(() => {
    const seeds = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
    const base = seeds.map((s, i) => {
      const h = hashStr(s + String(i));
      const ratio = Math.max(0.08, Math.min(0.98, playerRatio + (h % 17) / 100 - 0.08));
      const tier = masteryTierFromRatio(ratio);
      const streak = Math.max(0, playerStreak + (h % 5) - 2);
      return {
        key: anonymizedKey(s + h),
        ratio,
        tier: tier.label,
        tierId: tier.id,
        streak,
        isYou: false,
      };
    });
    const youKey = anonymize ? anonymizedKey(displayName || "player") : String(displayName || "You");
    base.push({
      key: youKey,
      ratio: playerRatio,
      tier: playerTier.label,
      tierId: playerTier.id,
      streak: playerStreak,
      isYou: true,
    });
    base.sort((a, b) => b.ratio - a.ratio || b.streak - a.streak);
    return base.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [playerRatio, playerStreak, playerTier.label, playerTier.id, displayName, anonymize]);

  if (!workbook) return null;

  return (
    <section id="player-mastery-board" className="gf-pr-card gf-pr-scroll-mt" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={iconTile}>
            <Layers className="h-5 w-5" style={{ color: "#a5b5fc" }} strokeWidth={2} />
          </div>
          <div>
            <h2 className="gf-pr-card-title">Mastery board</h2>
            <p className="gf-pr-card-hint">
              Spec <strong style={{ color: "#a5b5fc" }}>leaderboard_view</strong> · learning objective mastery &amp; consistency
              {anonymize ? " · anonymized key" : ""}
            </p>
          </div>
        </div>

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, idx) => (
            <motion.li
              key={r.key + r.rank}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 * idx }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                border: r.isYou ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(148,163,184,0.1)",
                background: r.isYou ? "linear-gradient(90deg, rgba(79,70,229,0.12), transparent)" : "rgba(15,23,42,0.55)",
                fontSize: 14,
              }}
            >
              <span style={{ display: "flex", minWidth: 0, flex: 1, alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#64748b", width: 32 }}>
                  #{r.rank}
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontWeight: r.isYou ? 700 : 500, color: r.isYou ? "#e0e7ff" : "#cbd5e1" }}>
                    {r.key}
                    {r.isYou ? (
                      <Shield className="ml-1 inline h-3.5 w-3.5" style={{ color: "#818cf8" }} strokeWidth={2} />
                    ) : null}
                  </span>
                  {showTiers ? (
                    <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Tier: {r.tier}</span>
                  ) : null}
                </span>
              </span>
              {showStreaks ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 12, color: "#fdba74" }}>
                  <Flame className="h-4 w-4" strokeWidth={2} />
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{r.streak}</span>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>streak</span>
                </span>
              ) : null}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
