import React from "react";

export const SIX_D_META_KEY = "__meta::six_d";

export type SixDPhaseState = { done: boolean; notes: string };

export const SIX_D_PHASES: { id: string; title: string }[] = [
  { id: "d1_define", title: "Define business objectives" },
  { id: "d2_behaviors", title: "Delineate target behaviors" },
  { id: "d3_players", title: "Describe your players" },
  { id: "d4_cycles", title: "Devise activity cycles" },
  { id: "d5_fun", title: "Don't forget the fun" },
  { id: "d6_deploy", title: "Deploy appropriate tools" },
];

function defaultPayload(): { phases: Record<string, SixDPhaseState> } {
  const phases: Record<string, SixDPhaseState> = {};
  for (const p of SIX_D_PHASES) {
    phases[p.id] = { done: false, notes: "" };
  }
  return { phases };
}

function normalize(raw: unknown): { phases: Record<string, SixDPhaseState> } {
  const base = defaultPayload();
  if (!raw || typeof raw !== "object") return base;
  const phases = (raw as { phases?: Record<string, unknown> }).phases;
  if (!phases || typeof phases !== "object") return base;
  for (const p of SIX_D_PHASES) {
    const cell = phases[p.id];
    if (cell && typeof cell === "object") {
      base.phases[p.id] = {
        done: Boolean((cell as SixDPhaseState).done),
        notes: String((cell as SixDPhaseState).notes ?? ""),
      };
    }
  }
  return base;
}

type Props = {
  value: unknown;
  onChange: (next: { phases: Record<string, SixDPhaseState> }) => void;
  disabled?: boolean;
  styles: Record<string, React.CSSProperties>;
};

export default function SixDChecklist({ value, onChange, disabled, styles }: Props) {
  const data = normalize(value);

  const setPhase = (id: string, patch: Partial<SixDPhaseState>) => {
    onChange({
      phases: {
        ...data.phases,
        [id]: { ...data.phases[id], ...patch },
      },
    });
  };

  const doneCount = SIX_D_PHASES.filter((p) => data.phases[p.id]?.done).length;

  return (
    <div style={{ padding: 14, borderRadius: 16, background: "rgba(15,23,42,0.72)", border: "1px solid rgba(148,163,184,0.1)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#e2e8f0" }}>6D framework (Versland-style)</div>
      <div style={{ ...styles.cardHint, marginBottom: 12 }}>
        Checklist is stored in spec metadata ({SIX_D_META_KEY}) and exported in DOCX. {doneCount}/6 complete.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SIX_D_PHASES.map((p) => {
          const st = data.phases[p.id] || { done: false, notes: "" };
          return (
            <div
              key={p.id}
              style={{
                padding: 10,
                borderRadius: 12,
                background: "rgba(2,6,23,0.35)",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: disabled ? "default" : "pointer" }}>
                <input
                  type="checkbox"
                  checked={st.done}
                  disabled={disabled}
                  onChange={(e) => setPhase(p.id, { done: e.target.checked })}
                  style={{ marginTop: 3 }}
                />
                <span style={{ fontWeight: 700, color: "#f8fafc", fontSize: 13 }}>{p.title}</span>
              </label>
              <input
                type="text"
                placeholder="Notes…"
                value={st.notes}
                disabled={disabled}
                onChange={(e) => setPhase(p.id, { notes: e.target.value })}
                style={{
                  marginTop: 8,
                  width: "100%",
                  boxSizing: "border-box",
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.14)",
                  background: "rgba(15,23,42,0.85)",
                  color: "#fff",
                  padding: "0 10px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
