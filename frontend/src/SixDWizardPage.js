import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildSpecStudioStateFromWizard } from "./domainTemplates";
import { WIZARD_DOMAINS, WIZARD_DOMAIN_OTHER, WIZARD_PROJECT_TYPE_OTHER, WIZARD_PROJECT_TYPES } from "./wizardDomains";
import {
  WIZARD_D1_OPTIONS,
  WIZARD_D2_OPTIONS,
  WIZARD_D3_AUDIENCE_OPTIONS,
  WIZARD_D4_ENGAGE_OPTIONS,
  WIZARD_D4_PROGRESS_OPTIONS,
  WIZARD_D5_OPTIONS,
  WIZARD_D6_OPTIONS,
  WIZARD_SIXD_OTHER,
  combinePresetStrings,
  validatePresetsWithOther,
} from "./wizardSixDOptions";

const HEXAD_OPTIONS = [
  { id: "Achiever", label: "Achiever", hint: "Achievement, goals, completion" },
  { id: "Player", label: "Player", hint: "Rewards, play, points" },
  { id: "Socializer", label: "Socializer", hint: "Helping others, community, chat" },
  { id: "Free Spirit", label: "Free Spirit", hint: "Exploration, autonomy" },
  { id: "Philanthropist", label: "Philanthropist", hint: "Purpose, giving back" },
  { id: "Disruptor", label: "Disruptor", hint: "Change, disruption" },
];

const BARTLE_OPTIONS = [
  { id: "Achiever", label: "Achiever (Bartle)", hint: "Completion, points" },
  { id: "Explorer", label: "Explorer", hint: "Exploration, maps" },
  { id: "Socializer", label: "Socializer", hint: "Social interaction" },
  { id: "Killer", label: "Killer", hint: "Competition, ranking" },
];

/** Step meta + short labels for the horizontal stepper */
const WIZARD_STEPS = [
  {
    id: "domain",
    title: "Context & project",
    sub: "Domain and project type",
    lead: "Frame the project first; then define business goals, behaviors, player profile, loops, fun aesthetics, and mechanics across six steps.",
  },
  {
    id: "d1",
    title: "🚀 Define goals",
    sub: "1. Business objectives · Define Business Objectives",
    lead: "Pick what gamification should achieve, or use Other to write your own sentence (add measurable KPIs or % targets).",
  },
  {
    id: "d2",
    title: "🎯 Target behaviors",
    sub: "2. Target behaviors · Delineate Target Behaviors",
    lead: "Select concrete actions users must take for rewards or progress; use Other if not listed.",
  },
  {
    id: "d3",
    title: "👥 Player types & motivation",
    sub: "3. Player profiles · Describe Players",
    lead: "Does your audience prefer competition or cooperation? Selections map to HEXAD and Bartle behind the scenes.",
  },
  {
    id: "d4",
    title: "🔄 Activity loops",
    sub: "4. Activity loops · Devise Activity Loops",
    lead: "How will you sustain engagement? Choose short engagement loops and long-term progression (levels, quest chains, seasons, etc.) separately.",
  },
  {
    id: "d5",
    title: "🥳 Fun & experience design",
    sub: "5. Don't forget the fun",
    lead: "Avoid a bare points–badge loop: pick MDA aesthetic tones such as exploration, competitive thrill, or collaboration.",
  },
  {
    id: "d6",
    title: "🛠️ Mechanics & components",
    sub: "6. Tools & mechanics · Deploy Appropriate Tools",
    lead: "Choose concrete elements like points, badges, leaderboards; platform needs were captured in the project type step.",
  },
  {
    id: "gen",
    title: "📄 Generate 25 sections",
    sub: "AI + ontology · Specification",
    lead: "Summary: fill 25 sections with AI and go to the studio, or open the studio only.",
  },
];

const WIZARD_STEP_SHORT = ["Context", "Goals", "Behaviors", "Players", "Loops", "Fun", "Mechanics", "25 sections"];

/** Tokens aligned with the app dark theme */
const WIZARD_THEME = {
  bg: "transparent",
  card: "rgba(15,23,42,0.92)",
  border: "rgba(148,163,184,0.14)",
  text: "#e5e7eb",
  muted: "#94a3b8",
  pri: "#2563eb",
  priD: "#93c5fd",
  sec: "#22c55e",
  sideBg: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.96))",
  sideHi: "rgba(37,99,235,0.22)",
  progressTrack: "rgba(148,163,184,0.15)",
};

function wizardChip(sel, t) {
  return {
    padding: "6px 14px",
    borderRadius: 999,
    border: sel ? "1px solid rgba(59,130,246,0.45)" : `1px solid ${t.border}`,
    background: sel ? "rgba(37,99,235,0.22)" : "rgba(15,23,42,0.55)",
    color: sel ? "#bfdbfe" : t.muted,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function wizardSelCard(sel, t) {
  return {
    border: `2px solid ${sel ? t.pri : t.border}`,
    borderRadius: 12,
    padding: 14,
    cursor: "pointer",
    textAlign: "center",
    background: sel ? "rgba(37,99,235,0.14)" : "rgba(15,23,42,0.72)",
    transition: "border-color 0.15s, background 0.15s",
    color: t.text,
  };
}

function wizardInfoShell(variant, t) {
  const map = {
    blue: { bg: "rgba(37,99,235,0.12)", border: t.pri },
    green: { bg: "rgba(34,197,94,0.14)", border: t.sec },
  };
  const m = map[variant] || map.blue;
  return {
    padding: "11px 14px",
    borderRadius: 10,
    background: m.bg,
    borderLeft: `4px solid ${m.border}`,
    fontSize: 13,
    lineHeight: 1.55,
    marginBottom: 12,
    color: t.text,
  };
}

/** 6D wizard: horizontal steps, chips + Other; last step opens the 25-section studio with or without AI. */
export default function SixDWizardPage({ API, specId, specTitle, onSpecRegistered, onOpenStudio, styles = null }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    projectTitle: "",
    themeKeywords: "",
    domainKey: "",
    domainCustom: "",
    projectTypePreset: "",
    projectTypeCustom: "",
    d1Presets: [],
    d1OtherText: "",
    d2Presets: [],
    d2OtherText: "",
    d3AudiencePresets: [],
    d3AudienceOtherText: "",
    hexad: [],
    bartle: [],
    d3notes: "",
    d4EngagePresets: [],
    d4EngageOtherText: "",
    d4ProgressPresets: [],
    d4ProgressOtherText: "",
    d5Presets: [],
    d5OtherText: "",
    d6Presets: [],
    d6OtherText: "",
  });

  useEffect(() => {
    if (!specTitle || !String(specTitle).trim()) return;
    setForm((f) => (f.projectTitle.trim() ? f : { ...f, projectTitle: String(specTitle).trim() }));
  }, [specTitle]);

  const progress = useMemo(() => Math.round(((step + 1) / WIZARD_STEPS.length) * 100), [step]);

  const t = WIZARD_THEME;
  const mkChip = (sel) => wizardChip(sel, t);
  const mkCard = (sel) => wizardSelCard(sel, t);

  const toggleList = (key, id) => {
    setForm((f) => {
      const arr = f[key];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...f, [key]: next };
    });
  };

  const togglePreset = (key, id) => {
    setForm((f) => {
      const arr = f[key] || [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...f, [key]: next };
    });
  };

  const effectiveProjectType = useMemo(() => {
    if (form.projectTypePreset === WIZARD_PROJECT_TYPE_OTHER) return (form.projectTypeCustom || "").trim();
    return (form.projectTypePreset || "").trim();
  }, [form.projectTypePreset, form.projectTypeCustom]);

  const wizardStudioMeta = useMemo(
    () => ({
      domainKey: form.domainKey,
      domainCustom: form.domainCustom,
      themeKeywords: form.themeKeywords,
      projectTypeLabel: effectiveProjectType,
    }),
    [form.domainKey, form.domainCustom, form.themeKeywords, effectiveProjectType]
  );

  const createSpecIfNeeded = useCallback(async () => {
    if (specId) return Number(specId);
    setBusy(true);
    try {
      const res = await axios.post(`${API}/specs`, {
        title: form.projectTitle.trim() || "New gamification specification",
      });
      const data = res.data;
      if (data?.id && onSpecRegistered) onSpecRegistered(data);
      setMsg("Specification created. You can continue the steps.");
      return Number(data.id);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Error";
      setMsg("Error: " + detail);
      return null;
    } finally {
      setBusy(false);
    }
  }, [API, form.projectTitle, onSpecRegistered, specId]);

  const buildSixDPayload = useCallback(() => {
    const audienceLine = combinePresetStrings(form.d3AudiencePresets, form.d3AudienceOtherText, WIZARD_D3_AUDIENCE_OPTIONS);
    const d3_audience_notes = [audienceLine, form.d3notes].filter((x) => String(x || "").trim()).join("\n\n");

    return {
      d1_business_objectives: combinePresetStrings(form.d1Presets, form.d1OtherText, WIZARD_D1_OPTIONS),
      d2_target_behaviors: combinePresetStrings(form.d2Presets, form.d2OtherText, WIZARD_D2_OPTIONS),
      d3_hexad_types: form.hexad,
      d3_bartle_types: form.bartle,
      d3_audience_notes,
      d4_engagement_loop: combinePresetStrings(form.d4EngagePresets, form.d4EngageOtherText, WIZARD_D4_ENGAGE_OPTIONS),
      d4_progression_loop: combinePresetStrings(form.d4ProgressPresets, form.d4ProgressOtherText, WIZARD_D4_PROGRESS_OPTIONS),
      d5_fun: combinePresetStrings(form.d5Presets, form.d5OtherText, WIZARD_D5_OPTIONS),
      d6_tools: combinePresetStrings(form.d6Presets, form.d6OtherText, WIZARD_D6_OPTIONS),
      theme_keywords: form.themeKeywords,
      domain_key: form.domainKey,
      domain_custom: form.domainCustom,
      project_type_preset: form.projectTypePreset,
      project_type_custom: form.projectTypeCustom,
      course_code_preset: "",
      course_code_custom: "",
    };
  }, [form]);

  const runBootstrap = useCallback(async () => {
    const sid = await createSpecIfNeeded();
    if (!sid) return;
    setBusy(true);
    try {
      const { contextText: studioAlignContext } = buildSpecStudioStateFromWizard(wizardStudioMeta);
      await axios.post(`${API}/ai/bootstrap-from-6d`, {
        spec_id: sid,
        tone: "academic",
        title: form.projectTitle.trim() || undefined,
        max_sections: 25,
        six_d: buildSixDPayload(),
        additional_context: studioAlignContext,
      });
      setMsg("25-section specification generated. You can edit it in the studio.");
      onOpenStudio?.(sid, wizardStudioMeta);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Error";
      setMsg("Generation error: " + detail);
    } finally {
      setBusy(false);
    }
  }, [API, buildSixDPayload, createSpecIfNeeded, form.projectTitle, onOpenStudio, wizardStudioMeta]);

  const goToStudioOnly = useCallback(async () => {
    const sid = await createSpecIfNeeded();
    if (!sid) return;
    onOpenStudio?.(sid, wizardStudioMeta);
  }, [createSpecIfNeeded, onOpenStudio, wizardStudioMeta]);

  const validateStep = (s) => {
    if (s === 0) {
      if (!form.projectTitle.trim() && !specId) {
        setMsg("Enter a project title for a new specification, or select an existing one from home.");
        return false;
      }
      if (!form.domainKey) {
        setMsg("Pick a domain or choose Other and describe it.");
        return false;
      }
      if (form.domainKey === WIZARD_DOMAIN_OTHER && !form.domainCustom.trim()) {
        setMsg("For Other, briefly describe your domain.");
        return false;
      }
      if (!form.projectTypePreset) {
        setMsg("Pick a project type or use Other to type one.");
        return false;
      }
      if (form.projectTypePreset === WIZARD_PROJECT_TYPE_OTHER && !form.projectTypeCustom.trim()) {
        setMsg("For Other, enter the project type.");
        return false;
      }
    }
    if (s === 1) {
      if (!validatePresetsWithOther(form.d1Presets, form.d1OtherText)) {
        setMsg("Define goals: pick at least one business objective; if you chose Other, add text.");
        return false;
      }
    }
    if (s === 2) {
      if (!validatePresetsWithOther(form.d2Presets, form.d2OtherText)) {
        setMsg("Target behaviors: pick at least one action; if you chose Other, add text.");
        return false;
      }
    }
    if (s === 3) {
      if (form.d3AudiencePresets.includes(WIZARD_SIXD_OTHER) && !form.d3AudienceOtherText.trim()) {
        setMsg("Audience: if you chose Other for cohort, add text.");
        return false;
      }
      const hasAudience = form.d3AudiencePresets.length > 0;
      const hasHexOrBartle = form.hexad.length > 0 || form.bartle.length > 0;
      const hasNotes = !!form.d3notes.trim();
      if (!hasHexOrBartle && !hasAudience && !hasNotes) {
        setMsg("Players: select HEXAD or Bartle types, pick audience chips, or add notes.");
        return false;
      }
    }
    if (s === 4) {
      if (!validatePresetsWithOther(form.d4EngagePresets, form.d4EngageOtherText)) {
        setMsg("Activity loops: pick at least one short-loop option; Other requires text.");
        return false;
      }
      if (!validatePresetsWithOther(form.d4ProgressPresets, form.d4ProgressOtherText)) {
        setMsg("Activity loops: pick at least one progression option; Other requires text.");
        return false;
      }
    }
    if (s === 5) {
      if (!validatePresetsWithOther(form.d5Presets, form.d5OtherText)) {
        setMsg("Fun & experience: pick at least one aesthetic / motivation tone; Other requires text.");
        return false;
      }
    }
    if (s === 6) {
      if (!validatePresetsWithOther(form.d6Presets, form.d6OtherText)) {
        setMsg("Game mechanics: pick at least one component; Other requires text.");
        return false;
      }
    }
    setMsg("");
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((x) => Math.min(x + 1, WIZARD_STEPS.length - 1));
  };

  const back = () => setStep((x) => Math.max(0, x - 1));

  const field = (label, hint, value, onChange, multiline = true) => {
    const labelStyle = styles
      ? { ...styles.label, marginBottom: 6, fontSize: 13 }
      : { display: "block", fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 6 };
    const taStyle = styles
      ? { ...styles.textareaLarge, minHeight: 100, marginBottom: 0 }
      : {
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          fontSize: 14,
          fontFamily: "inherit",
          color: t.text,
          background: "rgba(15,23,42,0.85)",
          resize: "vertical",
        };
    const inpStyle = styles
      ? { ...styles.input, marginBottom: 0 }
      : {
          width: "100%",
          boxSizing: "border-box",
          height: 42,
          padding: "0 12px",
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          fontSize: 14,
          color: t.text,
          background: "rgba(15,23,42,0.85)",
        };
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>{label}</label>
        {multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={taStyle} />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inpStyle} />
        )}
        {hint ? <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>{hint}</div> : null}
      </div>
    );
  };

  const presetRow = (title, hint, options, presetsKey, otherTextKey) => (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: t.text }}>{title}</div>
      {hint ? <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>{hint}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            style={mkChip(form[presetsKey].includes(o.id))}
            onClick={() => togglePreset(presetsKey, o.id)}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          style={mkChip(form[presetsKey].includes(WIZARD_SIXD_OTHER))}
          onClick={() => togglePreset(presetsKey, WIZARD_SIXD_OTHER)}
        >
          Other
        </button>
      </div>
      {form[presetsKey].includes(WIZARD_SIXD_OTHER)
        ? field(
            "Free text (Other)",
            "Describe anything not covered by the list.",
            form[otherTextKey],
            (v) => setForm((f) => ({ ...f, [otherTextKey]: v }))
          )
        : null}
    </>
  );

  const allDomains = [...WIZARD_DOMAINS, { id: WIZARD_DOMAIN_OTHER, icon: "✏️", label: "Other", desc: "Describe your domain" }];

  const btnPrimary = styles?.primaryButton;
  const btnSecondary = styles?.secondaryButton;

  return (
    <div
      style={{
        color: t.text,
        fontFamily: "Inter, Arial, sans-serif",
        background: t.bg,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: t.priD, textTransform: "uppercase" }}>Flow: 6D input → 25-section specification</div>
        <h2 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 800 }}>Specification wizard</h2>
        <p style={{ margin: 0, fontSize: 13, color: t.muted, lineHeight: 1.65 }}>
          Steps run in the horizontal bar above and stay separate from the left app menu. Each step uses chips + <strong>Other</strong>; step 8 opens the 25-section studio.
        </p>
      </div>

      <div style={{ padding: "0 0 12px" }}>
        <div style={{ background: t.progressTrack, borderRadius: 50, height: 6, marginBottom: 14, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${t.pri}, ${t.sec})`,
              borderRadius: 50,
              transition: "width 0.35s ease",
            }}
          />
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Steps (horizontal)</div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 18,
            padding: 14,
            borderRadius: styles ? 18 : 14,
            border: `1px solid ${t.border}`,
            background: styles ? "rgba(15,23,42,0.72)" : "rgba(15,23,42,0.55)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {WIZARD_STEPS.map((st, i) => {
            const done = i < step;
            const active = i === step;
            const future = i > step;
            return (
              <button
                key={st.id}
                type="button"
                title={st.title}
                onClick={() => !future && setStep(i)}
                disabled={future}
                style={{
                  ...mkChip(active),
                  opacity: future ? 0.38 : 1,
                  cursor: future ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 36,
                }}
              >
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    background: done ? "rgba(34,197,94,0.35)" : active ? "rgba(59,130,246,0.35)" : "rgba(148,163,184,0.15)",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>{WIZARD_STEP_SHORT[i]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ minWidth: 0, width: "100%" }}>
          <div
            style={
              styles
                ? { ...styles.card, marginBottom: 0, width: "100%", boxSizing: "border-box" }
                : {
                    background: t.card,
                    borderRadius: 16,
                    padding: 20,
                    border: `1px solid ${t.border}`,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
                    width: "100%",
                    boxSizing: "border-box",
                  }
            }
          >
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{WIZARD_STEPS[step].title}</h3>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>{WIZARD_STEPS[step].sub}</div>
              {WIZARD_STEPS[step].lead ? (
                <p style={{ margin: "10px 0 0", fontSize: 13, color: t.text, lineHeight: 1.55 }}>{WIZARD_STEPS[step].lead}</p>
              ) : null}
            </div>

            {step === 0 && (
              <>
                {field("Project title", "Required when creating a new specification. Pre-filled if you opened an existing spec.", form.projectTitle, (v) =>
                  setForm((f) => ({ ...f, projectTitle: v })),
                  false
                )}
                {field(
                  "Theme / keywords (optional)",
                  "E.g. space, missions, badges — narrative tone.",
                  form.themeKeywords,
                  (v) => setForm((f) => ({ ...f, themeKeywords: v }))
                )}

                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>📌 Project domain</div>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 10 }}>Pick from the list or use Other.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {allDomains.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, domainKey: d.id, domainCustom: d.id === WIZARD_DOMAIN_OTHER ? f.domainCustom : "" }))}
                      style={mkCard(form.domainKey === d.id)}
                    >
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{d.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{d.desc}</div>
                    </button>
                  ))}
                </div>
                {form.domainKey === WIZARD_DOMAIN_OTHER
                  ? field(
                      "Describe your domain (Other)",
                      "E.g. sustainability, legal compliance, plant safety…",
                      form.domainCustom,
                      (v) => setForm((f) => ({ ...f, domainCustom: v }))
                    )
                  : null}

                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>🎮 Project type</div>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>GPPT-style presets; use Other for free text.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {WIZARD_PROJECT_TYPES.map((pt) => (
                    <button key={pt} type="button" style={mkChip(form.projectTypePreset === pt)} onClick={() => setForm((f) => ({ ...f, projectTypePreset: pt }))}>
                      {pt}
                    </button>
                  ))}
                  <button
                    type="button"
                    style={mkChip(form.projectTypePreset === WIZARD_PROJECT_TYPE_OTHER)}
                    onClick={() => setForm((f) => ({ ...f, projectTypePreset: WIZARD_PROJECT_TYPE_OTHER }))}
                  >
                    Other
                  </button>
                </div>
                {form.projectTypePreset === WIZARD_PROJECT_TYPE_OTHER
                  ? field("Custom project type", "E.g. browser simulation + physical cards", form.projectTypeCustom, (v) =>
                      setForm((f) => ({ ...f, projectTypeCustom: v })),
                      false
                    )
                  : null}

                <div style={wizardInfoShell("blue", t)}>
                  <strong>Next:</strong> six steps from business goals through mechanics, then <strong>25-section</strong> generation and the studio.
                </div>
              </>
            )}

            {step === 1 &&
              presetRow(
                "Primary goals (pick or write)",
                "You can select multiple. E.g. engagement, completion % — add detail in Other.",
                WIZARD_D1_OPTIONS,
                "d1Presets",
                "d1OtherText"
              )}

            {step === 2 &&
              presetRow(
                "Concrete actions",
                "E.g. daily login, finish module, help a peer. Add more via Other.",
                WIZARD_D2_OPTIONS,
                "d2Presets",
                "d2OtherText"
              )}

            {step === 3 && (
              <>
                {presetRow(
                  "Audience traits",
                  "Who will use it? Combine with HEXAD/Bartle; at least one of audience, types, or notes is required.",
                  WIZARD_D3_AUDIENCE_OPTIONS,
                  "d3AudiencePresets",
                  "d3AudienceOtherText"
                )}
                <div style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}>HEXAD (motivation types)</div>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>Selections map to a HEXAD profile in the payload.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {HEXAD_OPTIONS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      title={h.hint}
                      style={mkChip(form.hexad.includes(h.id))}
                      onClick={() => toggleList("hexad", h.id)}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}>Bartle (player styles)</div>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>Competition, exploration, social play — use chips as cues.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {BARTLE_OPTIONS.map((b) => (
                    <button
                      key={`b-${b.id}`}
                      type="button"
                      title={b.hint}
                      style={mkChip(form.bartle.includes(b.id))}
                      onClick={() => toggleList("bartle", b.id)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                {field(
                  "Extra questions & notes",
                  "E.g. do they prefer competition or cooperation? Roles, context, constraints…",
                  form.d3notes,
                  (v) => setForm((f) => ({ ...f, d3notes: v }))
                )}
              </>
            )}

            {step === 4 && (
              <>
                {presetRow(
                  "Short engagement loop",
                  "Trigger → action → feedback; keeps daily rhythm.",
                  WIZARD_D4_ENGAGE_OPTIONS,
                  "d4EngagePresets",
                  "d4EngageOtherText"
                )}
                {presetRow(
                  "How does progression work?",
                  "Levels, quest chains, seasons? Pick the long-term structure.",
                  WIZARD_D4_PROGRESS_OPTIONS,
                  "d4ProgressPresets",
                  "d4ProgressOtherText"
                )}
              </>
            )}

            {step === 5 &&
              presetRow(
                "MDA aesthetics — experience tone",
                "Pick aesthetics like exploration, competitive thrill, collaboration; add more in Other.",
                WIZARD_D5_OPTIONS,
                "d5Presets",
                "d5OtherText"
              )}

            {step === 6 &&
              presetRow(
                "Concrete mechanics & components",
                "Points, badges, leaderboard, etc. Which elements are active? Add custom mechanics in Other.",
                WIZARD_D6_OPTIONS,
                "d6Presets",
                "d6OtherText"
              )}

            {step === 7 && (
              <>
                <div style={wizardInfoShell("green", t)}>
                  <strong>Summary:</strong> Domain: <em>{form.domainKey === WIZARD_DOMAIN_OTHER ? form.domainCustom || "—" : WIZARD_DOMAINS.find((x) => x.id === form.domainKey)?.label || "—"}</em>
                  {" · "}
                  Type: <em>{effectiveProjectType || "—"}</em>
                </div>
                <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.65 }}>
                  Ontology summary and 6D text are sent to the LLM; only <strong>empty</strong> specification sections are filled. This may take a while.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={runBootstrap}
                    style={{
                      ...(btnPrimary || {}),
                      background: btnPrimary ? "linear-gradient(135deg, #16a34a, #15803d)" : t.sec,
                      border: "none",
                      cursor: busy ? "wait" : "pointer",
                      opacity: busy ? 0.85 : 1,
                      fontWeight: 800,
                      fontSize: 15,
                      padding: btnPrimary ? undefined : "12px 22px",
                      borderRadius: btnPrimary ? undefined : 12,
                      color: "#fff",
                    }}
                  >
                    {busy ? "Generating…" : "Open 25-section studio — fill with AI"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={goToStudioOnly}
                    style={{
                      ...(btnSecondary || {
                        padding: "12px 18px",
                        borderRadius: 12,
                        border: `1px solid ${t.border}`,
                        background: "rgba(15,23,42,0.85)",
                        color: t.text,
                        fontWeight: 700,
                      }),
                      cursor: busy ? "wait" : "pointer",
                    }}
                  >
                    Open 25-section studio (without AI fill)
                  </button>
                </div>
                <p style={{ fontSize: 12, color: t.muted, marginTop: 12, lineHeight: 1.5 }}>
                  The second button only opens the studio; if no spec exists yet, a draft is created from the title. Use the green button for AI fill.
                </p>
              </>
            )}

            {step < 7 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 0 || busy}
                  style={{
                    ...(btnSecondary || {
                      padding: "10px 18px",
                      borderRadius: 12,
                      border: `1px solid ${t.border}`,
                      background: "rgba(15,23,42,0.85)",
                      color: t.text,
                      fontWeight: 600,
                    }),
                    opacity: step === 0 ? 0.45 : 1,
                    cursor: step === 0 ? "default" : "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={busy}
                  style={{
                    ...(btnPrimary || {
                      padding: "10px 22px",
                      borderRadius: 12,
                      border: "none",
                      background: `linear-gradient(135deg, ${t.pri}, #1d4ed8)`,
                      color: "#fff",
                      fontWeight: 700,
                    }),
                    cursor: "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {msg ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: t.muted,
                padding: 12,
                background: "rgba(37,99,235,0.12)",
                borderRadius: 10,
                border: `1px solid ${t.border}`,
              }}
            >
              {msg}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
