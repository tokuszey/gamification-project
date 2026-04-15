import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { AVATAR_PRESETS } from "./configParser.js";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 160,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(2, 6, 23, 0.72)",
  backdropFilter: "blur(8px)",
};

const panelStyle = {
  position: "relative",
  width: "min(440px, 100%)",
  maxHeight: "min(88vh, 720px)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  borderRadius: 22,
  border: "1px solid rgba(59, 130, 246, 0.28)",
  background: "linear-gradient(165deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))",
  boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
};

function prepareQuizRows(items) {
  if (!items?.length) return [];
  return items.map((q) => {
    const labels = [...q.options];
    const correctLabel = labels[q.correctIndex];
    for (let i = labels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [labels[i], labels[j]] = [labels[j], labels[i]];
    }
    return { stem: q.stem, options: labels, correctAnswer: correctLabel };
  });
}

function ModalShell({ open, title, hint, children, footer, onClose }) {
  if (!open) return null;
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="gf-quest-modal-title">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={panelStyle}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(15,23,42,0.9)",
            color: "#94a3b8",
            cursor: "pointer",
          }}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <div style={{ padding: "22px 22px 12px", borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
          <h2 id="gf-quest-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
            {title}
          </h2>
          {hint ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.55, color: "#94a3b8" }}>{hint}</p>
          ) : null}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>{children}</div>
        <div
          style={{
            padding: "14px 22px 20px",
            borderTop: "1px solid rgba(51,65,85,0.45)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {footer}
        </div>
      </motion.div>
    </div>
  );
}

const btnPrimary = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 14,
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  color: "#0f172a",
  background: "linear-gradient(135deg, #38bdf8, #22d3ee)",
  boxShadow: "0 8px 24px rgba(56,189,248,0.25)",
};

const btnGhost = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.25)",
  background: "rgba(15,23,42,0.65)",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

/** s18-derived MCQ veya görev mini-quiz; Gönder ile doğrula, sonra onComplete(). */
export function QuestQuizModal({ open, onClose, questions, onComplete, title, hint }) {
  const [rows, setRows] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const prep = prepareQuizRows(questions);
    setRows(prep);
    setAnswers({});
    setError("");
  }, [open, questions]);

  const ready = rows.length > 0;

  const handleBitir = () => {
    if (!ready) return;
    for (let i = 0; i < rows.length; i++) {
      if (answers[i] == null || answers[i] === "") {
        setError("Answer every question.");
        return;
      }
      if (answers[i] !== rows[i].correctAnswer) {
        setError("Some answers are incorrect. Try again.");
        return;
      }
    }
    setError("");
    onComplete?.();
  };

  return (
    <AnimatePresence>
      {open ? (
        <ModalShell
          open={open}
          onClose={onClose}
          footer={
            <>
              {error ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(127,29,29,0.35)",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#fecaca",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ ...btnGhost, flex: 1 }} onClick={onClose}>
                  Cancel
                </button>
                <button type="button" style={{ ...btnPrimary, flex: 2 }} onClick={handleBitir}>
                  Submit
                </button>
              </div>
            </>
          }
          title={title || "Complete the quiz"}
          hint={hint || ""}
        >
          {!ready ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading questions…</p>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 18 }}>
              {rows.map((q, qi) => (
                <li key={qi} style={{ borderRadius: 16, border: "1px solid rgba(51,65,85,0.65)", padding: 14 }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.5 }}>
                    <span style={{ color: "#38bdf8", marginRight: 8 }}>{qi + 1}.</span>
                    {q.stem}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {q.options.map((opt) => {
                      const id = `q_${qi}_${opt}`;
                      const picked = answers[qi] === opt;
                      return (
                        <label
                          key={id}
                          htmlFor={id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            cursor: "pointer",
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: picked ? "1px solid rgba(56,189,248,0.45)" : "1px solid rgba(51,65,85,0.5)",
                            background: picked ? "rgba(56,189,248,0.08)" : "rgba(15,23,42,0.5)",
                          }}
                        >
                          <input
                            id={id}
                            type="radio"
                            name={`quest_q_${qi}`}
                            checked={picked}
                            onChange={() => setAnswers((a) => ({ ...a, [qi]: opt }))}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ModalShell>
      ) : null}
    </AnimatePresence>
  );
}

export function QuestProfileModal({ open, onClose, initialTitle, initialNickname, initialPresetId, hint, onSave }) {
  const [title, setTitle] = useState("");
  const [nickname, setNickname] = useState("");
  const [presetId, setPresetId] = useState(AVATAR_PRESETS[0]?.id || "azure");

  useEffect(() => {
    if (open) {
      setTitle((initialTitle || "").trim());
      const nick =
        typeof initialNickname === "string" && initialNickname.trim().length > 0
          ? initialNickname.trim()
          : "";
      setNickname(nick);
      const fallback = AVATAR_PRESETS[0]?.id || "azure";
      const want = initialPresetId && AVATAR_PRESETS.some((p) => p.id === initialPresetId) ? initialPresetId : fallback;
      setPresetId(want);
    }
  }, [open, initialTitle, initialNickname, initialPresetId]);

  const preset = useMemo(() => AVATAR_PRESETS.find((p) => p.id === presetId) || AVATAR_PRESETS[0], [presetId]);

  const canSave = nickname.trim().length >= 2 || title.trim().length >= 2;

  const handleKaydet = () => {
    const t = title.trim();
    const n = nickname.trim();
    if (n.length < 2 && t.length < 2) {
      return;
    }
    onSave?.({
      title: t.slice(0, 80),
      nickname: n.slice(0, 40),
      avatarPresetId: preset.id,
      avatarStyle: preset.style,
    });
  };

  return (
    <AnimatePresence>
      {open ? (
        <ModalShell
          open={open}
          onClose={onClose}
          title="Customize your profile"
          hint={
            hint ||
            "Display name, title, and avatar. Saving from the header or a quest applies rewards when a profile quest exists and is eligible; you can still edit otherwise."
          }
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={{ ...btnGhost, flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...btnPrimary, flex: 2, opacity: canSave ? 1 : 0.5 }}
                disabled={!canSave}
                onClick={handleKaydet}
              >
                Save
              </button>
            </div>
          }
        >
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
            Display name
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Name shown in the UI"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
              }}
            />
          </label>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginTop: 16, marginBottom: 8 }}>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Field Safety Lead"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
              }}
            />
          </label>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>Avatar color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {AVATAR_PRESETS.map((p) => {
                const sel = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    onClick={() => setPresetId(p.id)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      cursor: "pointer",
                      ...p.style,
                      outline: sel ? "2px solid #e0f2fe" : "none",
                      outlineOffset: 2,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </AnimatePresence>
  );
}

export function QuestHazardModal({ open, onClose, onSubmit }) {
  const [kind, setKind] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (open) {
      setKind("");
      setLocation("");
    }
  }, [open]);

  const handleBildir = () => {
    if (kind.trim().length < 2 || location.trim().length < 2) return;
    onSubmit?.({
      hazardKind: kind.trim().slice(0, 120),
      location: location.trim().slice(0, 160),
    });
  };

  const valid = kind.trim().length >= 2 && location.trim().length >= 2;

  return (
    <AnimatePresence>
      {open ? (
        <ModalShell
          open={open}
          onClose={onClose}
          title="Hazard report"
          hint="Enter hazard type and location; Report sends it to the rule engine."
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={{ ...btnGhost, flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...btnPrimary, flex: 2, opacity: valid ? 1 : 0.5 }}
                disabled={!valid}
                onClick={handleBildir}
              >
                Report
              </button>
            </div>
          }
        >
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 14 }}>
            What type of hazard?
            <input
              type="text"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder="e.g. Slippery floor, chemical spill"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
              }}
            />
          </label>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
            Where is it?
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Warehouse A — ramp"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
              }}
            />
          </label>
        </ModalShell>
      ) : null}
    </AnimatePresence>
  );
}

/** Özet yazmadan ödül yok — genel görevler için. */
export function QuestReflectionModal({ open, onClose, questTitle, onComplete }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
      setError("");
    }
  }, [open]);

  const handleDone = () => {
    const t = note.trim();
    if (t.length < 20) {
      setError("Briefly describe what you did (at least 20 characters).");
      return;
    }
    setError("");
    onComplete?.({ reflection: t.slice(0, 800) });
  };

  return (
    <AnimatePresence>
      {open ? (
        <ModalShell
          open={open}
          onClose={onClose}
          title="Complete quest"
          hint={
            questTitle
              ? `Write a short summary for “${questTitle}”; this text is saved as completion evidence.`
              : "Summarize how you completed the quest."
          }
          footer={
            <>
              {error ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(127,29,29,0.35)",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#fecaca",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ ...btnGhost, flex: 1 }} onClick={onClose}>
                  Cancel
                </button>
                <button type="button" style={{ ...btnPrimary, flex: 2 }} onClick={handleDone}>
                  Finish and claim reward
                </button>
              </div>
            </>
          }
        >
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
            What did you do?
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="e.g. worked through the checklist, shared results with a teammate, updated the report…"
              style={{
                marginTop: 8,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
                resize: "vertical",
              }}
            />
          </label>
        </ModalShell>
      ) : null}
    </AnimatePresence>
  );
}

/** Sosyal görev — paylaşım / iş birliği özeti. */
export function QuestSocialTaskModal({ open, onClose, questTitle, onComplete }) {
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [contributionCheck, setContributionCheck] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSummary("");
      setContext("");
      setContributionCheck(false);
      setError("");
    }
  }, [open]);

  const handleDone = () => {
    if (summary.trim().length < 15 || context.trim().length < 5 || !contributionCheck) {
      setError("Sharing summary (≥15), context / role (≥5), and contribution confirmation are required.");
      return;
    }
    setError("");
    const sharedMomentumDelta = Math.min(8, Math.max(2, Math.ceil(summary.trim().length / 90)));
    onComplete?.({
      socialSummary: summary.trim().slice(0, 500),
      socialContext: context.trim().slice(0, 240),
      contributionCheckPassed: true,
      sharedMomentumDelta,
    });
  };

  return (
    <AnimatePresence>
      {open ? (
        <ModalShell
          open={open}
          onClose={onClose}
          title="Social step"
          hint={
            questTitle
              ? `Briefly document collaboration or sharing for “${questTitle}”.`
              : "Who did you interact with and how?"
          }
          footer={
            <>
              {error ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(127,29,29,0.35)",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#fecaca",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ ...btnGhost, flex: 1 }} onClick={onClose}>
                  Cancel
                </button>
                <button type="button" style={{ ...btnPrimary, flex: 2 }} onClick={handleDone}>
                  Complete
                </button>
              </div>
            </>
          }
        >
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 14 }}>
            Sharing / collaboration summary
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="What did you share, what feedback did you get?"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
                resize: "vertical",
              }}
            />
          </label>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
            Context (team, channel, role…)
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Safety loop — weekly sync"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
              }}
            />
          </label>
          <label
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              color: "#cbd5e1",
              fontWeight: 700,
            }}
          >
            <input type="checkbox" checked={contributionCheck} onChange={(e) => setContributionCheck(e.target.checked)} />
            I confirm my contribution (concrete sharing / feedback)
          </label>
        </ModalShell>
      ) : null}
    </AnimatePresence>
  );
}

/** Uygulamalı görev — kontrol listesi + sonuç.notu */
export function QuestAppliedTaskModal({ open, onClose, questTitle, onComplete }) {
  const [outcome, setOutcome] = useState("");
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome("");
      setC1(false);
      setC2(false);
      setC3(false);
      setError("");
    }
  }, [open]);

  const handleDone = () => {
    if (!c1 || !c2 || !c3) {
      setError("Check every application item.");
      return;
    }
    if (outcome.trim().length < 20) {
      setError("Briefly describe the field / application outcome (at least 20 characters).");
      return;
    }
    setError("");
    onComplete?.({ appliedOutcome: outcome.trim().slice(0, 800), appliedChecklist: true });
  };

  return (
    <AnimatePresence>
      {open ? (
        <ModalShell
          open={open}
          onClose={onClose}
          title="Applied step"
          hint={
            questTitle
              ? `“${questTitle}” — confirm application steps and describe the outcome.`
              : "Complete the checklist."
          }
          footer={
            <>
              {error ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(127,29,29,0.35)",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#fecaca",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ ...btnGhost, flex: 1 }} onClick={onClose}>
                  Cancel
                </button>
                <button type="button" style={{ ...btnPrimary, flex: 2 }} onClick={handleDone}>
                  Complete
                </button>
              </div>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {[
              ["I took preparation and safety precautions.", c1, setC1],
              ["I applied the steps within the quest scope.", c2, setC2],
              ["I recorded the outcome or observation.", c3, setC3],
            ].map(([label, checked, setFn]) => (
              <label
                key={String(label)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#e2e8f0",
                }}
              >
                <input type="checkbox" checked={checked} onChange={(e) => setFn(e.target.checked)} style={{ marginTop: 3 }} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
            Application outcome / observation
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={4}
              placeholder="What did you do, measure, or observe?"
              style={{
                marginTop: 6,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.8)",
                padding: "10px 12px",
                fontSize: 14,
                color: "#f1f5f9",
                background: "rgba(2,6,23,0.65)",
                resize: "vertical",
              }}
            />
          </label>
        </ModalShell>
      ) : null}
    </AnimatePresence>
  );
}

/** @deprecated kullan QuestReflectionModal */
export function QuestConfirmModal(props) {
  return <QuestReflectionModal {...props} />;
}
