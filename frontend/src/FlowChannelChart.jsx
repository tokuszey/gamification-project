import React, { useMemo } from "react";

/**
 * Csikszentmihalyi-style flow channel: skill (X) vs challenge (Y).
 * Challenge is inferred from spec §18 (Assessment); skill from analytics completion or level proxy.
 */
function parseAssessmentChallenge(s18Text) {
  const t = String(s18Text || "");
  const nums = t.match(/\b([1-9]|10)\b/g);
  if (!nums || nums.length === 0) return 5;
  const sum = nums.reduce((a, n) => a + Number(n), 0);
  return Math.min(10, Math.max(1, sum / nums.length));
}

function parseGameplayTaskChallenges(s13Text) {
  const lines = String(s13Text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\-\*\d.\)\s•]+/, "").trim())
    .filter((l) => l.length > 8);
  return lines.slice(0, 10).map((title, i) => ({
    title: title.slice(0, 72),
    challenge: Math.min(10, Math.max(1, 3 + (i % 5) + (title.length % 3))),
  }));
}

function zoneFor(skill, challenge) {
  const d = challenge - skill;
  if (d >= 2.5) return { key: "anxiety", label: "Anxiety / overload", color: "#f87171" };
  if (d <= -2.5) return { key: "boredom", label: "Boredom / disengagement", color: "#94a3b8" };
  return { key: "flow", label: "Flow channel", color: "#34d399" };
}

export default function FlowChannelChart({ specDetail, analytics }) {
  const model = useMemo(() => {
    const sections = specDetail?.sections || {};
    const s18 =
      sections["s18::Assessment Framework and KPIs"] ||
      Object.entries(sections).find(([k]) => k.includes("s18::") || k.includes("Assessment"))?.[1] ||
      "";
    const s13 =
      sections["s13::Detailed Gameplay Flow"] ||
      Object.entries(sections).find(([k]) => k.includes("s13::") || k.includes("Gameplay Flow"))?.[1] ||
      "";
    const challengeMean = parseAssessmentChallenge(s18);
    const tasks = parseGameplayTaskChallenges(s13);
    const avgTaskChallenge =
      tasks.length > 0 ? tasks.reduce((a, x) => a + x.challenge, 0) / tasks.length : challengeMean;
    const challenge = Math.min(10, Math.max(1, (challengeMean + avgTaskChallenge) / 2));

    const completion = analytics?.spec?.avg_completion_per_player_pct;
    const skill =
      completion != null && !Number.isNaN(Number(completion))
        ? Math.min(10, Math.max(1, Number(completion) / 10))
        : Math.min(10, Math.max(1, 5 + (analytics?.spec?.players_started > 3 ? 1 : 0)));

    const zone = zoneFor(skill, challenge);
    return { skill, challenge, zone, tasks, s18Present: Boolean(String(s18).trim()) };
  }, [specDetail, analytics]);

  const W = 420;
  const H = 320;
  const pad = 48;
  const sx = (v) => pad + ((v - 1) / 9) * (W - 2 * pad);
  const sy = (v) => H - pad - ((v - 1) / 9) * (H - 2 * pad);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 22,
        padding: 22,
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        marginTop: 18,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Flow channel (Csikszentmihalyi)</h3>
      <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, lineHeight: 1.55, maxWidth: 720 }}>
        X = estimated <strong style={{ color: "#cbd5e1" }}>player skill</strong> (from cohort completion % when
        available). Y = <strong style={{ color: "#cbd5e1" }}>challenge</strong> blended from §18 Assessment wording
        (numeric cues) and §13 gameplay steps. The green band is the ideal flow corridor between boredom and anxiety.
      </p>
      {!model.s18Present ? (
        <p style={{ color: "#fbbf24", fontSize: 13, marginTop: 10 }}>
          No §18 content on this spec — challenge defaults to mid-range. Fill Assessment Framework for tighter
          calibration.
        </p>
      ) : null}

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 14, maxWidth: 480 }}>
        <defs>
          <linearGradient id="flowBand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(52,211,153,0.35)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.2)" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="rgba(15,23,42,0.5)" rx={12} />

        {/* Flow band between y=x-2 and y=x+2 in data space — draw as polygon in pixel space */}
        <polygon
          points={`${sx(1)},${sy(3)} ${sx(8)},${sy(10)} ${sx(10)},${sy(8)} ${sx(3)},${sy(1)}`}
          fill="url(#flowBand)"
          opacity={0.9}
        />

        <text x={pad} y={24} fill="#94a3b8" fontSize={11} fontWeight={700}>
          High challenge
        </text>
        <text x={pad} y={H - 12} fill="#94a3b8" fontSize={11} fontWeight={700}>
          Low challenge
        </text>
        <text x={pad} y={H - pad + 28} fill="#94a3b8" fontSize={10}>
          Low skill
        </text>
        <text x={W - pad - 52} y={H - pad + 28} fill="#94a3b8" fontSize={10}>
          High skill
        </text>

        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(148,163,184,0.35)" strokeWidth={1} />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="rgba(148,163,184,0.35)" strokeWidth={1} />

        <text x={W / 2 - 28} y={H - 6} fill="#64748b" fontSize={10}>
          Skill →
        </text>
        <text x={8} y={H / 2} fill="#64748b" fontSize={10}>
          Ch.
        </text>

        {/* Player / cohort point */}
        <circle cx={sx(model.skill)} cy={sy(model.challenge)} r={12} fill={model.zone.color} opacity={0.9} />
        <circle cx={sx(model.skill)} cy={sy(model.challenge)} r={16} fill="none" stroke={model.zone.color} strokeWidth={2} opacity={0.5} />

        <text x={sx(model.skill) + 18} y={sy(model.challenge) + 4} fill="#e2e8f0" fontSize={11} fontWeight={700}>
          Cohort
        </text>
      </svg>

      <div
        style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(15,23,42,0.85)",
          border: `1px solid ${model.zone.color}44`,
        }}
      >
        <div style={{ fontWeight: 800, color: model.zone.color, fontSize: 14 }}>{model.zone.label}</div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
          Skill ≈ {model.skill.toFixed(1)} / 10 · Challenge ≈ {model.challenge.toFixed(1)} / 10 (from spec §18 + §13).
        </div>
      </div>

      {model.tasks.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", marginBottom: 8 }}>Tasks (§13) · challenge estimate</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>
            {model.tasks.slice(0, 6).map((t) => (
              <li key={t.title}>
                {t.title} <span style={{ color: "#64748b" }}>(~{t.challenge}/10)</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
