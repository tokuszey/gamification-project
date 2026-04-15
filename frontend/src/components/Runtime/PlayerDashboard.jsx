import { motion, AnimatePresence } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HAZARD_ACTION_LABEL, useRealization } from "../../context/RealizationContext.jsx";
import { extractS18QuizQuestions } from "../PlayerRuntime/configParser.js";
import BadgeUnlockModal from "../PlayerRuntime/BadgeUnlockModal.jsx";
import FloatingXpBurst from "../PlayerRuntime/FloatingXpBurst.jsx";
import {
  QuestHazardModal,
  QuestProfileModal,
  QuestQuizModal,
} from "../PlayerRuntime/QuestInteractionModals.jsx";
import GameplayFlowNodes from "./GameplayFlowNodes.jsx";
import MechanicVisualizer from "./MechanicVisualizer.jsx";
import TechnicalEventLog from "./TechnicalEventLog.jsx";

const SIM_SUITE = [
  { key: "quiz", label: "Finish quiz", action: "Complete the quiz", flow: "quiz" },
  { key: "hazard", label: "Report hazard", action: HAZARD_ACTION_LABEL, flow: "hazard" },
  {
    key: "profile",
    label: "Customize profile",
    action: "Customize your profile",
    flow: "profile",
  },
  { key: "login", label: "Log in (streak)", action: "Daily streak login" },
  { key: "gift", label: "Gift points", action: "Gift points to a friend" },
  { key: "discovery", label: "Discovery / field quest", action: "Complete discovery quest" },
];

/**
 * Runtime Lab: state machine viz + technical log + simulation suite (quiz dışı dahil).
 */
export default function PlayerDashboard() {
  const {
    pkg,
    loading,
    error,
    loadPackage,
    labXp,
    labBadges,
    lastLabPop,
    clearLabPop,
    applyLabAction,
    technicalLog,
    clearTechnicalLog,
    lastRuleRun,
    specBlueprint,
  } = useRealization();

  const [xpBurst, setXpBurst] = useState(null);
  const [badgeModalBadges, setBadgeModalBadges] = useState(null);
  const [simPoints, setSimPoints] = useState(0);
  const [simDurationSec, setSimDurationSec] = useState(30);
  const [suiteFlow, setSuiteFlow] = useState(null);

  const quizCatalog = useMemo(() => extractS18QuizQuestions(pkg), [pkg]);

  const clearXpBurst = useCallback(() => setXpBurst(null), []);
  const clearBadgeModal = useCallback(() => {
    setBadgeModalBadges(null);
    clearLabPop();
  }, [clearLabPop]);

  useEffect(() => {
    if (!lastLabPop) return undefined;
    if (lastLabPop.type === "badge") {
      const names = String(lastLabPop.value || "")
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length) setBadgeModalBadges(names);
    }
    const delay = lastLabPop.type === "badge" ? 4500 : 2200;
    const t = setTimeout(clearLabPop, delay);
    return () => clearTimeout(t);
  }, [lastLabPop, clearLabPop]);

  const completedStateIds = useMemo(() => {
    const states = pkg?.game_state_machine?.states || [];
    if (!states.length) return [];
    const rows = technicalLog || [];
    const done = new Set();
    rows.forEach((e) => {
      const msg = String(e?.message || "").toLowerCase();
      if (e?.kind === "quest_complete" || e?.kind === "simulation") {
        states.forEach((s) => {
          const sid = String(s.id || "").toLowerCase();
          const lbl = String(s.label || "").toLowerCase();
          if ((sid && msg.includes(sid)) || (lbl && msg.includes(lbl))) done.add(s.id);
        });
      }
    });
    return Array.from(done);
  }, [pkg, technicalLog]);
  const activeStateId = useMemo(() => {
    const states = pkg?.game_state_machine?.states || [];
    if (!states.length) return null;
    if (lastRuleRun?.matchedRules?.[0]?.id) {
      const byRule = states.find((s) =>
        String(lastRuleRun.matchedRules[0].trigger_action || "")
          .toLowerCase()
          .includes(String(s.label || "").toLowerCase()),
      );
      if (byRule) return byRule.id;
    }
    const idx = Math.min(states.length - 1, Math.floor(labXp / 45));
    return states[idx].id;
  }, [pkg, labXp, lastRuleRun]);
  const lockedStateIds = useMemo(() => {
    const states = pkg?.game_state_machine?.states || [];
    if (!states.length) return [];
    const activeIdx = states.findIndex((s) => s.id === activeStateId);
    if (activeIdx < 0) return [];
    return states.slice(activeIdx + 1).map((s) => s.id);
  }, [pkg, activeStateId]);

  const validator = useMemo(() => {
    if (!pkg) return null;
    return {
      schemaOk:
        Array.isArray(pkg.rules) &&
        Boolean(pkg.game_state_machine?.states?.length) &&
        (pkg.rules || []).some((r) => r?.trigger_action && r?.effect),
      ontologyOk: Boolean(pkg.ontology_validation?.ok),
    };
  }, [pkg]);

  const fireSimulation = (action, meta) => {
    const ev = applyLabAction(action, meta);
    if (!ev) return;
    if (ev.pointsDelta > 0) {
      setXpBurst({
        id: `${action}_${Date.now()}`,
        x: meta?.clientX ?? window.innerWidth / 2,
        y: meta?.clientY ?? window.innerHeight / 2,
        amount: ev.pointsDelta,
      });
    }
    if (ev.badgeIds?.length) {
      setBadgeModalBadges(ev.badgeIds);
    }
  };

  const fireSuiteFromModal = (s, extraMeta = {}) => {
    const rectMeta = {
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight * 0.38,
      pointsOverride: simPoints,
      durationSec: simDurationSec,
      ...extraMeta,
    };
    fireSimulation(s.action, { suite: s.key, ...rectMeta });
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(15,23,42,0.96))",
        border: "1px solid rgba(59,130,246,0.18)",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => void loadPackage()}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Load deployment package"}
        </button>
        {pkg?.api_key ? (
          <code
            style={{
              fontSize: 11,
              color: "#94a3b8",
              background: "rgba(15,23,42,0.9)",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            key …{pkg.api_key.slice(-8)}
          </code>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(248,113,113,0.35)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {pkg && specBlueprint ? <BlueprintValidationPanel blueprint={specBlueprint} /> : null}

      <AnimatePresence>
        {lastLabPop && lastLabPop.type !== "badge" ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(74,222,128,0.4)",
              color: "#ecfdf5",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {lastLabPop.value}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {pkg ? (
        <>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 800, marginBottom: 10 }}>STATE MACHINE (FULL VIEW)</div>
            <GameplayFlowNodes
              machine={pkg.game_state_machine}
              activeStateId={activeStateId}
              completedStateIds={completedStateIds}
              lockedStateIds={lockedStateIds}
            />
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, marginBottom: 8 }}>
              Initial: <strong style={{ color: "#e2e8f0" }}>{pkg.game_state_machine.initial_state}</strong> ·{" "}
              {pkg.game_state_machine.states.length} states
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 1fr)" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <ValidatorPanel validator={validator} pkg={pkg} />
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(15,23,42,0.85)",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}
              >
                <div style={{ fontSize: 12, color: "#6ee7b7", fontWeight: 800, marginBottom: 8, letterSpacing: "0.1em" }}>
                  TRIGGER SUITE
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <input
                type="number"
                value={simPoints}
                onChange={(e) => setSimPoints(Math.max(0, Number(e.target.value) || 0))}
                style={{ width: 120, borderRadius: 10, border: "1px solid rgba(148,163,184,0.25)", padding: "8px 10px", background: "rgba(15,23,42,0.8)", color: "#e2e8f0" }}
                placeholder="XP override"
              />
              <input
                type="number"
                value={simDurationSec}
                onChange={(e) => setSimDurationSec(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: 120, borderRadius: 10, border: "1px solid rgba(148,163,184,0.25)", padding: "8px 10px", background: "rgba(15,23,42,0.8)", color: "#e2e8f0" }}
                placeholder="Duration (sec)"
              />
              {SIM_SUITE.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={(e) => {
                    if (s.flow === "quiz" || s.flow === "hazard" || s.flow === "profile") {
                      setSuiteFlow(s);
                      return;
                    }
                    const r = e.currentTarget.getBoundingClientRect();
                    fireSimulation(s.action, {
                      suite: s.key,
                      pointsOverride: simPoints,
                      durationSec: simDurationSec,
                      clientX: r.left + r.width / 2,
                      clientY: r.top,
                    });
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(52,211,153,0.35)",
                    background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(15,23,42,0.9))",
                    color: "#ecfdf5",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
                </div>
              </div>
              <RuleMonitor run={lastRuleRun} />
              <OntologyHealthCheck validation={pkg.ontology_validation} />
              <MechanicVisualizer
                xp={labXp}
                xpNext={120}
                badges={labBadges}
                highlight={Boolean(lastLabPop?.type === "points")}
              />
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 16,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(148,163,184,0.18)",
            }}
          >
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>MADDE 15 RULES (Quick Fire)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(pkg.rules || []).slice(0, 10).map((r) => {
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={(e) => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      fireSimulation(r.trigger_action, {
                        ruleId: r.id,
                        clientX: rect.left + rect.width / 2,
                        clientY: rect.top,
                      });
                    }}
                    style={{
                      position: "relative",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.25)",
                      background: "rgba(30,41,59,0.9)",
                      color: "#e2e8f0",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {r.trigger_action.slice(0, 48)}
                    {r.trigger_action.length > 48 ? "…" : ""}
                  </button>
                );
              })}
              {(pkg.rules || []).length === 0 ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>Built-in demo rules active (empty §15).</span>
              ) : null}
            </div>
          </div>

          <TechnicalEventLog entries={technicalLog} onClear={clearTechnicalLog} />
        </>
      ) : null}

      <FloatingXpBurst burst={xpBurst} onComplete={clearXpBurst} />
      <BadgeUnlockModal badges={badgeModalBadges} onClose={clearBadgeModal} />
      <QuestQuizModal
        open={Boolean(suiteFlow?.flow === "quiz")}
        questions={quizCatalog}
        onClose={() => setSuiteFlow(null)}
        onComplete={() => {
          const s = suiteFlow;
          setSuiteFlow(null);
          if (s) fireSuiteFromModal(s);
        }}
      />
      <QuestHazardModal
        open={Boolean(suiteFlow?.flow === "hazard")}
        onClose={() => setSuiteFlow(null)}
        onSubmit={() => {
          const s = suiteFlow;
          setSuiteFlow(null);
          if (s) fireSuiteFromModal(s);
        }}
      />
      <QuestProfileModal
        open={Boolean(suiteFlow?.flow === "profile")}
        initialTitle=""
        initialNickname="Deney oyuncusu"
        onClose={() => setSuiteFlow(null)}
        onSave={() => {
          const s = suiteFlow;
          setSuiteFlow(null);
          if (s) fireSuiteFromModal(s);
        }}
      />
    </div>
  );
}

function BlueprintValidationPanel({ blueprint }) {
  const v = blueprint?.validation;
  if (!v || (v.ok && !(v.warnings || []).length)) return null;
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: v.ok ? "rgba(251,191,36,0.08)" : "rgba(239,68,68,0.1)",
        border: `1px solid ${v.ok ? "rgba(251,191,36,0.35)" : "rgba(248,113,113,0.45)"}`,
        color: "#e2e8f0",
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: 11, color: "#93c5fd", marginBottom: 6 }}>
        SCHEMA MAPPER · {blueprint?.narrative?.path || "narrative.theme_hint"}: {blueprint?.narrative?.theme_hint || "—"}
      </div>
      {(v.errors || []).length ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#fecaca" }}>
          {(v.errors || []).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {(v.warnings || []).length ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#fde68a" }}>
          {(v.warnings || []).map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {blueprint?.prerequisiteGraph?.nodes?.length ? (
        <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 11 }}>
          Prerequisite graph: {blueprint.prerequisiteGraph.nodes.length} nodes, {blueprint.prerequisiteGraph.edges.length}{" "}
          edges (workbook flow).
        </div>
      ) : null}
    </div>
  );
}

function ValidatorPanel({ validator, pkg }) {
  if (!validator || !pkg) return null;
  return (
    <div style={{ padding: 14, borderRadius: 16, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.18)" }}>
      <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 800, marginBottom: 8, letterSpacing: "0.12em" }}>VALIDATOR</div>
      <div style={{ fontSize: 12, color: validator.schemaOk ? "#86efac" : "#fca5a5" }}>
        {validator.schemaOk ? "✓ JSON Schema Check passed" : "✗ JSON Schema conflict (rules/if-then/state machine)"}
      </div>
      <div style={{ fontSize: 12, color: validator.ontologyOk ? "#86efac" : "#fca5a5", marginTop: 6 }}>
        {validator.ontologyOk ? "✓ Ontology matching passed" : "✗ Ontology conflict detected"}
      </div>
    </div>
  );
}

function RuleMonitor({ run }) {
  if (!run) return null;
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,23,42,0.85)",
        border: `1px solid ${run.ok ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
      }}
    >
      <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 800, marginBottom: 8, letterSpacing: "0.12em" }}>
        LOGIC CONSOLE (MADDE 15)
      </div>
      <pre
        style={{
          margin: 0,
          borderRadius: 10,
          padding: "10px 12px",
          background: "rgba(2,6,23,0.82)",
          border: "1px solid rgba(51,65,85,0.6)",
          fontSize: 12,
          lineHeight: 1.5,
          color: "#bfdbfe",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          whiteSpace: "pre-wrap",
        }}
      >
{`IF event == "${run.action}"\nTHEN award_points(${run.pointsDelta})\nTHEN badges=[${(run.badgeIds || []).join(", ")}]`}
      </pre>
      <div style={{ marginTop: 8, fontSize: 12, color: run.ok ? "#86efac" : "#fca5a5" }}>
        {run.ok ? `Rule applied: +${run.pointsDelta} XP` : "No rule match: Condition not met"}
      </div>
      {Array.isArray(run.universal?.resolutionPath) && run.universal.resolutionPath.length ? (
        <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", lineHeight: 1.45 }}>
          §15 resolution: {run.universal.resolutionPath.join(" → ")}
          {run.universal.s15LineHits?.[0] ? (
            <>
              <br />
              <span style={{ color: "#cbd5e1" }}>{String(run.universal.s15LineHits[0]).slice(0, 220)}</span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function OntologyHealthCheck({ validation }) {
  const ok = Boolean(validation?.ok);
  const components = Array.isArray(validation?.components) ? validation.components : [];
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,23,42,0.85)",
        border: `1px solid ${ok ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
      }}
    >
      <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 800, marginBottom: 10, letterSpacing: "0.12em" }}>
        ONTOLOGY HEALTH CHECK
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ok ? "#86efac" : "#fca5a5", marginBottom: 8 }}>
        {ok ? "✓ Ontology rules compatible" : "✗ Ontology mismatches detected"}
      </div>
      {components.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {components.map((c, i) => (
            <div key={`${c}-${i}`} style={{ fontSize: 12, color: "#cbd5e1" }}>
              {ok ? "✓" : "•"} {String(c)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>No component-level ontology diagnostics reported.</div>
      )}
    </div>
  );
}
