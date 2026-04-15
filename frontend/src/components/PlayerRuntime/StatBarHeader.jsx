import { Coins, Flame, PencilLine, Sparkles, TrendingUp, User, Zap } from "lucide-react";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

function tierForLevel(level) {
  if (level >= 12) {
    return {
      name: "Apex",
      color: "#dbeafe",
      background: "rgba(37,99,235,0.18)",
      border: "1px solid rgba(59,130,246,0.32)",
    };
  }
  if (level >= 8) {
    return {
      name: "Elite",
      color: "#a7f3d0",
      background: "rgba(22,163,74,0.14)",
      border: "1px solid rgba(34,197,94,0.28)",
    };
  }
  if (level >= 4) {
    return {
      name: "Operative",
      color: "#bae6fd",
      background: "rgba(14,165,233,0.12)",
      border: "1px solid rgba(56,189,248,0.25)",
    };
  }
  return {
    name: "Recruit",
    color: "#cbd5e1",
    background: "rgba(148,163,184,0.1)",
    border: "1px solid rgba(148,163,184,0.2)",
  };
}

export function roleTitleForLevel(level) {
  if (level >= 16) return "Commander";
  if (level >= 12) return "Senior Guard";
  if (level >= 8) return "Specialist";
  if (level >= 4) return "Operative";
  return "Recruit";
}

function CircularStat({ icon: Icon, label, value, sub, ringClass, iconColor = "#7dd3fc" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div className={`gf-pr-stat-ring ${ringClass}`}>
        <Icon style={{ marginBottom: 4, color: iconColor }} className="h-4 w-4" strokeWidth={2} />
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            letterSpacing: "-0.03em",
            color: "#f8fafc",
          }}
        >
          {value}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {label}
        </div>
        {sub ? (
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{sub}</div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function StatBarHeader({
  displayName,
  roleTitle,
  level,
  xp,
  virtualCurrency,
  streakDays,
  avatarStyle,
  onEditProfile,
}) {
  const prevLevelRef = useRef(level);
  const [levelUpFlash, setLevelUpFlash] = useState(false);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelUpFlash(true);
      const t = setTimeout(() => setLevelUpFlash(false), 1400);
      prevLevelRef.current = level;
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
    return undefined;
  }, [level]);

  const accentBlue = "#2563eb";
  const nextLevelXp = level * 150;
  const prevThreshold = (level - 1) * 150;
  const span = Math.max(1, nextLevelXp - prevThreshold);
  const segmentXp = xp - prevThreshold;
  const barPct = Math.min(100, Math.round((segmentXp / span) * 100));
  const tier = tierForLevel(level);
  const initial = (displayName || "?").trim().charAt(0).toUpperCase() || "?";
  const rt = roleTitle || roleTitleForLevel(level);
  const streakVal = streakDays > 0 ? String(streakDays) : "0";
  const streakSub = "consecutive";

  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: levelUpFlash
          ? "0 0 0 2px rgba(37,99,235,0.45), 0 24px 56px rgba(22,163,74,0.18)"
          : "0 20px 50px rgba(0,0,0,0.25)",
      }}
      transition={{ duration: levelUpFlash ? 0.35 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="gf-pr-profile-hero"
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
        className="xl:flex-row xl:items-center xl:justify-between"
      >
        <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 24 }} className="sm:flex-row sm:items-start">
          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 26 }}>
            {typeof onEditProfile === "function" ? (
              <button
                type="button"
                className="gf-pr-avatar-hit"
                onClick={onEditProfile}
                aria-label="Edit profile"
                title="Edit profile"
              >
                <div className="gf-pr-avatar" style={avatarStyle || undefined}>
                  {initial}
                  <PencilLine
                    className="pointer-events-none absolute bottom-1 right-1 h-4 w-4 text-white/55"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </div>
              </button>
            ) : (
              <div className="gf-pr-avatar" style={avatarStyle || undefined}>
                {initial}
                <User
                  className="pointer-events-none absolute bottom-1 right-1 h-4 w-4 text-white/35"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            )}
          </motion.div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(1.35rem, 2.5vw, 1.85rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#f8fafc",
                }}
              >
                {displayName}
              </h1>
              {typeof onEditProfile === "function" ? (
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="gf-pr-btn-primary gf-pr-profile-edit-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    boxShadow: "0 6px 16px rgba(37,99,235,0.2)",
                  }}
                >
                  <PencilLine className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  Edit profile
                </button>
              ) : null}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: tier.color,
                  background: tier.background,
                  border: tier.border,
                }}
              >
                <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                {tier.name}
              </span>
            </div>
            {typeof onEditProfile === "function" ? (
              <button type="button" className="gf-pr-profile-edit-link" onClick={onEditProfile}>
                Edit profile
              </button>
            ) : null}
            <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600, color: "#86efac" }}>
              Level {level}
              <span style={{ margin: "0 10px", color: "#334155" }}>—</span>
              <span style={{ color: "#7dd3fc" }}>{rt}</span>
            </p>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <span
                className="gf-pr-chip"
                style={{ borderColor: `${accentBlue}44`, color: "#e0f2fe" }}
              >
                <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                Progress
              </span>
              <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
                <Sparkles className="mr-1 inline h-4 w-4 text-sky-400" strokeWidth={2} />
                <span
                  style={{
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    fontWeight: 600,
                    color: "#bae6fd",
                  }}
                >
                  {xp.toLocaleString()}
                </span>
                <span style={{ color: "#64748b" }}> total XP</span>
              </p>
            </div>

            <div style={{ marginTop: 22, maxWidth: 640 }}>
              <div
                style={{
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                <span style={{ color: "#4ade80" }}>Progress to next level</span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    color: "#7dd3fc",
                  }}
                >
                  {Math.max(0, segmentXp)} / {span} XP
                </span>
              </div>
              <motion.div
                className="gf-pr-progress-track"
                style={{ height: 12 }}
                animate={
                  levelUpFlash
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(34,197,94,0)",
                          "0 0 20px 2px rgba(34,197,94,0.35)",
                          "0 0 0 0 rgba(34,197,94,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.85, ease: "easeOut" }}
              >
                <motion.div
                  className="gf-pr-progress-fill gf-pr-progress-fill-wide"
                  initial={false}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </motion.div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexShrink: 0,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
          }}
          className="xl:pl-4"
        >
          <CircularStat
            icon={Flame}
            label="Streak"
            value={streakVal}
            sub={streakSub}
            ringClass="gf-pr-stat-ring-streak"
            iconColor="#fdba74"
          />
          <CircularStat
            icon={Coins}
            label="Gold"
            value={virtualCurrency.toLocaleString()}
            sub="balance"
            ringClass="gf-pr-stat-ring-gold"
            iconColor="#fcd34d"
          />
        </div>
      </div>
    </motion.header>
  );
}
