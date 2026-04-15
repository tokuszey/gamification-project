import { CheckCircle2, Lock, Target, User } from "lucide-react";
import { motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getQuestLockReason, isQuestDone } from "./workbookRuntime.js";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function difficultyStars(quest) {
  const label = String(quest?.difficultyLabel || "").toLowerCase();
  const cat = String(quest?.questCategory || "").toLowerCase();
  const xp = Number(quest?.rewardXp || 0);

  if (label.includes("zor") || label.includes("hard") || label.includes("uzman") || label.includes("expert")) return 3;
  if (label.includes("orta") || label.includes("medium")) return 2;
  if (label.includes("kolay") || label.includes("easy")) return 1;

  // Workbook kategorileri için tutarlı fallback:
  // formative -> kolay, social -> orta, applied -> zor.
  if (cat === "applied") return 3;
  if (cat === "social") return 2;
  if (cat === "formative") return 1;

  // Genel fallback: ödül büyüdükçe zorluk artsın.
  if (xp >= 90) return 3;
  if (xp >= 50) return 2;
  return 1;
}

function stableQuestProgress(order, title, done) {
  if (done) return 100;
  const s = `${order}\0${title || ""}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return 12 + (Math.abs(h) % 73);
}

const iconTile = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "rgba(37,99,235,0.14)",
  border: "1px solid rgba(59,130,246,0.22)",
  flexShrink: 0,
};

/** Registry + React list identity: prefer numeric `order` so a row never splits across taskId vs order keys. */
function stableBoardQuestKey(q) {
  if (!q) return "quest-unknown";
  const o = q.order;
  if (o != null && o !== "" && !Number.isNaN(Number(o))) return `order-${Number(o)}`;
  if (q.taskId) return `task-${String(q.taskId)}`;
  return `title-${String(q.title || "unknown").slice(0, 120)}`;
}

function questPolicyBadge({ quest, done, locked }) {
  if (!quest?.objectiveId) return { text: "Objective Missing", tone: "danger" };
  if (done) return { text: "Completed", tone: "success" };
  if (locked) return { text: "Locked", tone: "muted" };
  if (String(quest?.questCategory || "").toLowerCase() === "social") {
    return { text: "Contribution Required", tone: "warn" };
  }
  return { text: "Ready", tone: "info" };
}

export default function QuestTaskList({
  quests,
  completedOrders,
  unlockedOrders,
  onBeginQuest,
  workbook,
  completedTaskIds = [],
  objectiveXp = {},
}) {
  const [boardFilter, setBoardFilter] = useState("all");
  const normOrder = (v) => Number(v);
  const unlockedOrderSet = useMemo(
    () => new Set((unlockedOrders || []).map((o) => normOrder(o)).filter((o) => !Number.isNaN(o))),
    [unlockedOrders],
  );
  const progressSlice = { completedQuestOrders: completedOrders, completedTaskIds, objectiveXp };
  const [questRegistry, setQuestRegistry] = useState([]);
  const [sparkleOrder, setSparkleOrder] = useState(null);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState([]);
  const prevUnlockedRef = useRef(new Set([...unlockedOrderSet]));
  const prevDoneCountRef = useRef((completedOrders || []).length);
  const prevUnlockedCountRef = useRef(unlockedOrderSet.size);

  useEffect(() => {
    setQuestRegistry((prev) => {
      const byKey = new Map();
      for (const row of prev) {
        const k = stableBoardQuestKey(row);
        byKey.set(k, row);
      }
      for (const row of quests || []) {
        const k = stableBoardQuestKey(row);
        const existing = byKey.get(k);
        byKey.set(k, existing ? { ...existing, ...row } : row);
      }
      return Array.from(byKey.values()).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    });
  }, [quests]);

  // Once a quest row was seen, keep it in the registry; incoming props only refresh fields for the same order.
  const boardQuests = useMemo(() => questRegistry, [questRegistry]);

  const visibleQuests = useMemo(() => {
    return boardQuests.filter((q) => {
      const done = workbook ? isQuestDone(q, progressSlice, workbook) : completedOrders.includes(q.order);
      const unlocked = unlockedOrderSet.has(normOrder(q.order));
      const locked = !done && !unlocked;
      const cat = String(q?.questCategory || "").toLowerCase();
      if (boardFilter === "available") return !done && !locked;
      if (boardFilter === "locked") return locked;
      if (boardFilter === "completed") return done;
      if (boardFilter === "social") return cat === "social";
      return true;
    });
  }, [boardQuests, workbook, progressSlice, completedOrders, unlockedOrderSet, boardFilter]);

  const doneCount = boardQuests.filter((q) =>
    workbook ? isQuestDone(q, progressSlice, workbook) : completedOrders.includes(q.order),
  ).length;

  useEffect(() => {
    const prev = prevUnlockedRef.current;
    const now = new Set([...unlockedOrderSet]);
    const justOpened = [];
    now.forEach((order) => {
      if (!prev.has(order)) justOpened.push(order);
    });
    if (justOpened.length) {
      setRecentlyUnlocked(justOpened);
      const t = window.setTimeout(() => setRecentlyUnlocked([]), 1200);
      prevUnlockedRef.current = now;
      return () => window.clearTimeout(t);
    }
    prevUnlockedRef.current = now;
    return undefined;
  }, [unlockedOrderSet]);

  useEffect(() => {
    const doneCount = (completedOrders || []).length;
    const unlockedCount = unlockedOrderSet.size;
    const progressChanged =
      doneCount !== prevDoneCountRef.current || unlockedCount !== prevUnlockedCountRef.current;
    if (progressChanged && boardFilter !== "all") {
      setBoardFilter("all");
    }
    prevDoneCountRef.current = doneCount;
    prevUnlockedCountRef.current = unlockedCount;
  }, [completedOrders, unlockedOrderSet, boardFilter]);

  return (
    <section id="player-quests" className="gf-pr-card gf-pr-scroll-mt" style={{ position: "relative", overflow: "visible" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            marginBottom: 22,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={iconTile}>
              <Target className="h-5 w-5" style={{ color: "#93c5fd" }} strokeWidth={2} />
            </div>
            <div>
              <h2 className="gf-pr-card-title">{workbook ? "Workbook — quest board" : "Active quests"}</h2>
              <p className="gf-pr-card-hint">
                {workbook ? (
                  <>
                    Quests from <strong style={{ color: "#7dd3fc" }}>detailed_gameplay_flow</strong> · Formative / Social /
                    Applied labels
                  </>
                ) : (
                  <>
                    Game flow · actions beyond quizzes — <strong style={{ color: "#7dd3fc" }}>Section 13</strong>
                  </>
                )}
              </p>
              <p className="gf-pr-presenter">
                {workbook ? (
                  <>
                    <strong>Prerequisite:</strong> Cards stay locked until spec-defined prerequisite objectives are met (
                    <strong style={{ color: "#fca5a5" }}>Mastery Required</strong>).
                  </>
                ) : (
                  <>
                    <strong>Presenter:</strong> Quest titles and rewards are derived from the loaded spec package; fixed demo
                    numbers are not used.
                  </>
                )}
              </p>
            </div>
          </div>
          {quests.length > 0 ? (
            <div
              style={{
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              <span style={{ color: "#7dd3fc", fontWeight: 700 }}>{doneCount}</span>
              <span style={{ color: "#475569" }}> / </span>
              <span>{boardQuests.length}</span>
              <span style={{ marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
                completed
              </span>
            </div>
          ) : null}
        </div>
        <div className="gf-pr-quest-filters">
          {[
            { id: "all", label: "All" },
            { id: "available", label: "Available" },
            { id: "locked", label: "Locked" },
            { id: "completed", label: "Completed" },
            { id: "social", label: "Social" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`gf-pr-quest-filter-btn ${boardFilter === f.id ? "is-active" : ""}`}
              onClick={() => setBoardFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <motion.ul className="gf-pr-quest-board-grid" variants={container} initial="hidden" animate="show">
          {visibleQuests.length === 0 ? (
            <li
              className="gf-pr-quest-board-empty"
              style={{
                padding: 40,
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                New quests coming soon
              </p>
            </li>
          ) : (
            visibleQuests.map((q) => {
              const done = workbook
                ? isQuestDone(q, progressSlice, workbook)
                : completedOrders.includes(q.order);
              const unlocked = unlockedOrderSet.has(normOrder(q.order));
              const lockReason = workbook && !done ? getQuestLockReason(q, progressSlice, workbook) : null;
              const locked = !done && !unlocked;
              const opening = recentlyUnlocked.includes(normOrder(q.order));
              const pct = stableQuestProgress(q.order, q.title, done);
              const starCount = difficultyStars(q);
              const policy = questPolicyBadge({ quest: q, done, locked });
              return (
                <motion.li
                  key={stableBoardQuestKey(q)}
                  variants={item}
                  // Do not pass a partial `animate` without opacity/x — it overrides variant "show" and
                  // newly unlocked rows can stay at opacity 0 (invisible).
                  animate={
                    opening
                      ? { opacity: 1, x: 0, scale: [1, 1.02, 1] }
                      : undefined
                  }
                  transition={
                    opening
                      ? { scale: { duration: 0.8, ease: "easeOut" }, opacity: { duration: 0.2 }, x: { duration: 0.2 } }
                      : undefined
                  }
                  className={`gf-pr-quest-board-card ${done ? "gf-pr-quest-board-card-done" : ""} ${locked ? "gf-pr-quest-board-card-locked" : ""} ${sparkleOrder === q.order ? "gf-pr-quest-board-card-hot" : ""}`}
                >
                  <div className="gf-pr-quest-board-topline">spec.sections.s13_gameplay_flow</div>
                  <div className={`gf-pr-quest-policy-badge gf-pr-quest-policy-${policy.tone}`}>{policy.text}</div>
                  <div className="gf-pr-quest-board-title">{q.title}</div>
                  <div className="gf-pr-quest-board-icon">
                    {done ? (
                      <CheckCircle2 className="h-10 w-10" style={{ color: "#4ade80" }} strokeWidth={2} />
                    ) : locked ? (
                      <Lock className="h-10 w-10" style={{ color: "#94a3b8" }} strokeWidth={2} />
                    ) : (
                      <User className="h-10 w-10" style={{ color: "#38bdf8" }} strokeWidth={2} />
                    )}
                  </div>
                  {!done ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="gf-pr-quest-board-btn"
                      disabled={locked}
                      onClick={(e) => {
                        if (locked) return;
                        setSparkleOrder(q.order);
                        window.setTimeout(() => setSparkleOrder((o) => (o === q.order ? null : o)), 850);
                        const el = e.currentTarget;
                        const r = el.getBoundingClientRect();
                        onBeginQuest(q, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                      }}
                    >
                      Start now
                    </motion.button>
                  ) : (
                    <div className="gf-pr-quest-board-done">Completed</div>
                  )}
                  <div className="gf-pr-quest-board-xp">+{q.rewardXp || 0} XP</div>
                  <div className="gf-pr-quest-board-meta">
                    <span>{q.difficultyLabel || "Medium"}</span>
                    <span className="gf-pr-quest-board-stars" aria-label={`difficulty ${starCount}/3`}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={i < starCount ? "on" : ""}>
                          ★
                        </span>
                      ))}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  {locked && lockReason ? (
                    <div className="gf-pr-quest-board-lockhint">
                      Locked: {lockReason.detail || lockReason.message}
                    </div>
                  ) : null}
                </motion.li>
              );
            })
          )}
        </motion.ul>
      </div>
    </section>
  );
}
