import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL as API } from "./config";

function postPreviewTelemetry(specId, playerId, payload) {
  if (!specId || !playerId) return;
  axios.post(`${API}/telemetry/preview-event`, payload).catch(() => {});
}

function MazeEscapeGame({
  question,
  onPickIndex,
  disabled,
  phase,
  pickedIndex,
  heroPos,
  promptVisible,
}) {
  const game = question?.game || {};
  const gridSize = Number(game.gridSize || 7);
  const hero = game.hero || { x: 3, y: gridSize - 1 };
  const goal = game.goal || { x: 3, y: 0 };
  const tileByOption = Array.isArray(game.tileByOption) ? game.tileByOption : [];
  const correctIndex = Number(question?.correct_index ?? 0);
  const optionLabels = Array.isArray(question?.options) ? question.options : [];

  const safeTile = tileByOption[correctIndex] || null;
  const baseHero = heroPos || hero;
  const showAnswer = !!promptVisible;

  const renderHero = (() => {
    if (showAnswer && phase === "success" && safeTile) return safeTile;
    return baseHero;
  })();

  const cell = 8;
  const pad = 2;
  const view = gridSize * cell + pad * 2;

  const shake = phase === "failed";
  const glow = phase === "success";

  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
        Maze Escape: choose the safe tile to advance.
      </div>

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.25)",
          padding: 12,
          transform: shake ? "translateX(-2px) translateY(1px)" : "translateX(0px) translateY(0px)",
          transition: "transform 180ms ease",
        }}
      >
        <svg width="100%" height="220" viewBox={`0 0 ${view} ${view}`} style={{ display: "block" }}>
          {/* grid */}
          {Array.from({ length: gridSize + 1 }).map((_, i) => (
            <g key={i}>
              <line x1={pad + i * cell} y1={pad} x2={pad + i * cell} y2={pad + gridSize * cell} stroke="rgba(148,163,184,0.14)" />
              <line x1={pad} y1={pad + i * cell} x2={pad + gridSize * cell} y2={pad + i * cell} stroke="rgba(148,163,184,0.14)" />
            </g>
          ))}

          {/* hero + goal */}
          <circle
            cx={pad + renderHero.x * cell + cell / 2}
            cy={pad + renderHero.y * cell + cell / 2}
            r={cell * 0.28}
            fill="rgba(59,130,246,0.9)"
          />
          <circle
            cx={pad + goal.x * cell + cell / 2}
            cy={pad + goal.y * cell + cell / 2}
            r={cell * 0.28}
            fill={glow ? "rgba(34,197,94,0.95)" : "rgba(147,197,253,0.85)"}
            opacity={0.95}
          />

          {/* tiles per option */}
          {tileByOption.map((t, optIdx) => {
            const isSafe = showAnswer && safeTile && t.x === safeTile.x && t.y === safeTile.y;
            const isCorrect = showAnswer && optIdx === correctIndex;
            const isChosen = pickedIndex === optIdx;
            const tileX = pad + t.x * cell + cell / 2;
            const tileY = pad + t.y * cell + cell / 2;

            const fill = showAnswer
              ? (glow && isCorrect
                  ? "rgba(34,197,94,0.9)"
                  : phase === "failed" && isChosen
                    ? "rgba(239,68,68,0.35)"
                    : isSafe
                      ? "rgba(34,197,94,0.28)"
                      : isChosen
                        ? "rgba(59,130,246,0.18)"
                        : "rgba(239,68,68,0.22)")
              : "rgba(148,163,184,0.18)";

            const stroke = showAnswer
              ? (glow && isCorrect
                  ? "rgba(34,197,94,0.8)"
                  : phase === "failed" && isChosen
                    ? "rgba(239,68,68,0.55)"
                    : isChosen
                      ? "rgba(59,130,246,0.35)"
                      : "rgba(148,163,184,0.22)")
              : "rgba(148,163,184,0.12)";

            return (
              <g key={`${t.x}-${t.y}-${optIdx}`}>
                <circle
                  cx={tileX}
                  cy={tileY}
                  r={cell * 0.28}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={2}
                />
                <text
                  x={tileX}
                  y={tileY + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(248,250,252,0.95)"
                  style={{ fontWeight: 900 }}
                >
                  {optIdx + 1}
                </text>
                <rect
                  x={tileX - cell / 2}
                  y={tileY - cell / 2}
                  width={cell}
                  height={cell}
                  fill="transparent"
                  style={{ cursor: disabled || !showAnswer ? "not-allowed" : "pointer" }}
                  onClick={() => !disabled && showAnswer && onPickIndex(optIdx)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {showAnswer ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>
            Pick an option (or press keys 1-4).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {optionLabels.slice(0, 4).map((lbl, optIdx) => (
              <button
                key={optIdx}
                style={{
                  background: "rgba(148,163,184,0.08)",
                  border: optIdx === pickedIndex ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                  borderRadius: 14,
                  padding: "10px 10px",
                  color: "#f8fafc",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.65 : 1,
                  textAlign: "left",
                  fontWeight: 800,
                  fontSize: 12,
                }}
                disabled={disabled}
                onClick={() => onPickIndex(optIdx)}
              >
                {optIdx + 1}. {lbl || `Route ${optIdx + 1}`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, color: "#94a3b8", fontSize: 12 }}>
          Move the hero to the obstacle area. The question will appear automatically.
        </div>
      )}
    </div>
  );
}

function PlatformerRunGame({ question, onPickIndex, disabled, phase, pickedIndex }) {
  const game = question?.game || {};
  const platforms = Array.isArray(game.platforms) ? game.platforms : [];
  const hero = game.hero || { x: 1, y: 4 };
  const goal = game.goal || { x: 9, y: 1 };
  const landings = Array.isArray(game.landings) ? game.landings : [];

  const gridW = Number(game.gridW || 10);
  const gridH = Number(game.gridH || 6);
  const cell = 28;
  const pad = 10;
  const view = gridW * cell + pad * 2;

  const correctIndex = Number(question?.correct_index ?? 0);
  const safeLanding = landings[correctIndex] || null;
  const chosenLanding = pickedIndex != null ? landings[pickedIndex] || null : null;
  const optionLabels = Array.isArray(question?.options) ? question.options : [];

  const renderHero = (() => {
    if (phase === "success" && chosenLanding) return chosenLanding;
    if (phase === "failed" && chosenLanding) return chosenLanding;
    return hero;
  })();

  const shake = phase === "failed";
  const glow = phase === "success";

  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Platform Run: land on the safe ledge.</div>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.25)",
          padding: 10,
          transform: shake ? "translateX(-3px) translateY(1px)" : "translateX(0px) translateY(0px)",
          transition: "transform 180ms ease",
        }}
      >
        <svg width="100%" height="240" viewBox={`0 0 ${view} ${gridH * cell + pad * 2}`} style={{ display: "block" }}>
          {/* platforms */}
          {platforms.map((p, i) => (
            <rect
              key={i}
              x={pad + p.x * cell}
              y={pad + (gridH - p.y - 1) * cell}
              width={p.w * cell}
              height={cell * 0.6}
              rx={10}
              fill="rgba(148,163,184,0.22)"
              stroke="rgba(148,163,184,0.20)"
            />
          ))}

          {/* hero & goal */}
          <circle cx={pad + renderHero.x * cell + cell / 2} cy={pad + (gridH - renderHero.y - 1) * cell + cell / 2} r={cell * 0.22} fill="rgba(59,130,246,0.95)" />
          <rect
            x={pad + goal.x * cell + cell * 0.35}
            y={pad + (gridH - goal.y - 1) * cell + cell * 0.2}
            width={cell * 0.3}
            height={cell * 0.8}
            rx={8}
            fill="rgba(34,197,94,0.85)"
          />

          {/* landing slots */}
          {landings.slice(0, 4).map((t, optIdx) => {
            const isSafe = safeLanding && t.x === safeLanding.x && t.y === safeLanding.y;
            const correct = optIdx === correctIndex;
            const isChosen = pickedIndex === optIdx;
            const fill = glow && correct ? "rgba(34,197,94,0.95)" : isSafe ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.18)";
            const fill2 = phase === "failed" && isChosen ? "rgba(239,68,68,0.35)" : fill;
            const stroke = glow && correct
              ? "rgba(34,197,94,0.75)"
              : phase === "failed" && isChosen
                ? "rgba(239,68,68,0.55)"
                : isChosen
                  ? "rgba(59,130,246,0.35)"
                  : "rgba(148,163,184,0.22)";
            return (
              <g key={`${t.x}-${t.y}-${optIdx}`}>
                <circle
                  cx={pad + t.x * cell + cell / 2}
                  cy={pad + (gridH - t.y - 1) * cell + cell / 2}
                  r={cell * 0.18}
                  fill={fill2}
                  stroke={stroke}
                  strokeWidth={2}
                />
                <text
                  x={pad + t.x * cell + cell / 2}
                  y={pad + (gridH - t.y - 1) * cell + cell / 2 + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="rgba(248,250,252,0.95)"
                  style={{ fontWeight: 900 }}
                >
                  {optIdx + 1}
                </text>
                <rect
                  x={pad + t.x * cell}
                  y={pad + (gridH - t.y - 1) * cell}
                  width={cell}
                  height={cell}
                  fill="transparent"
                  style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                  onClick={() => !disabled && onPickIndex(optIdx)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>Choose a jump slot:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {optionLabels.slice(0, 4).map((lbl, optIdx) => (
            <button
              key={optIdx}
              style={{
                background: "rgba(148,163,184,0.08)",
                border: optIdx === pickedIndex ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                borderRadius: 14,
                padding: "10px 10px",
                color: "#f8fafc",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.65 : 1,
                textAlign: "left",
                fontWeight: 800,
                fontSize: 12,
              }}
              disabled={disabled}
              onClick={() => onPickIndex(optIdx)}
            >
              {optIdx + 1}. {lbl || `Slot ${optIdx + 1}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DodgeRunnerGame({ question, onPickIndex, disabled, phase, pickedIndex }) {
  const game = question?.game || {};
  const gridW = Number(game.gridW || 10);
  const gridH = Number(game.gridH || 5);
  const laneYs = Array.isArray(game.laneYs) ? game.laneYs : [1, 2, 3];
  const runner = game.runner || { lane: 1 };
  const obstacleLane = Number(game.obstacleLane ?? 0);
  const optionLanes = Array.isArray(game.optionLanes) ? game.optionLanes : [];

  const correctIndex = Number(question?.correct_index ?? 0);
  const shake = phase === "failed";
  const glow = phase === "success";

  const cell = 26;
  const pad = 12;
  const viewW = gridW * cell + pad * 2;
  const viewH = gridH * cell + pad * 2;

  const chosenLane = pickedIndex != null ? optionLanes[pickedIndex] : null;
  const optionLabels = Array.isArray(question?.options) ? question.options : [];

  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Dodge Runner: avoid the obstacle lane.</div>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.25)",
          padding: 10,
          transform: shake ? "translateX(2px) translateY(1px)" : "translateX(0px) translateY(0px)",
          transition: "transform 180ms ease",
        }}
      >
        <svg width="100%" height="240" viewBox={`0 0 ${viewW} ${viewH}`} style={{ display: "block" }}>
          {/* lanes */}
          {[0, 1, 2].map((laneIdx) => {
            const y = pad + (gridH - laneYs[laneIdx] - 1) * cell;
            return (
              <g key={laneIdx}>
                <line x1={pad} y1={y + cell / 2} x2={pad + gridW * cell} y2={y + cell / 2} stroke="rgba(148,163,184,0.18)" strokeWidth="2" />
              </g>
            );
          })}

          {/* runner */}
          <circle
            cx={pad + cell * 2}
            cy={pad + (gridH - laneYs[(chosenLane != null ? chosenLane : runner.lane)] - 1) * cell + cell / 2}
            r={cell * 0.24}
            fill="rgba(59,130,246,0.95)"
          />

          {/* obstacle */}
          <rect
            x={pad + cell * 6.5}
            y={pad + (gridH - laneYs[obstacleLane] - 1) * cell}
            width={cell * 0.5}
            height={cell}
            rx={10}
            fill={glow ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.75)"}
            opacity={glow ? 0.75 : 1}
          />

          {/* option pads (1-4) */}
          {[0, 1, 2, 3].map((optIdx) => {
            const x = pad + cell * (1 + optIdx * 2.0);
            const y = pad + cell * 4.2;
            const isCorrect = optIdx === correctIndex;
            const isChosen = pickedIndex === optIdx;
            const fill = glow && isCorrect
              ? "rgba(34,197,94,0.9)"
              : phase === "failed" && isChosen
                ? "rgba(239,68,68,0.35)"
                : isCorrect
                  ? "rgba(34,197,94,0.55)"
                  : isChosen
                    ? "rgba(59,130,246,0.22)"
                    : "rgba(148,163,184,0.18)";
            const stroke = glow && isCorrect
              ? "rgba(34,197,94,0.8)"
              : phase === "failed" && isChosen
                ? "rgba(239,68,68,0.55)"
                : isChosen
                  ? "rgba(59,130,246,0.35)"
                  : "rgba(148,163,184,0.20)";
            const label = optIdx + 1;
            return (
              <g key={optIdx}>
                <rect x={x - cell * 0.45} y={y} width={cell * 0.9} height={cell * 0.55} rx={12} fill={fill} stroke={stroke} strokeWidth={2} />
                <text x={x} y={y + cell * 0.33} textAnchor="middle" fontSize="12" fill="rgba(248,250,252,0.95)" style={{ fontWeight: 900 }}>
                  {label}
                </text>
                <rect x={x - cell * 0.45} y={y} width={cell * 0.9} height={cell * 0.55} fill="transparent" style={{ cursor: disabled ? "not-allowed" : "pointer" }} onClick={() => !disabled && onPickIndex(optIdx)} />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>
          Choose the action:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {optionLabels.slice(0, 4).map((lbl, optIdx) => (
            <button
              key={optIdx}
              style={{
                background: "rgba(148,163,184,0.08)",
                border: optIdx === pickedIndex ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                borderRadius: 14,
                padding: "10px 10px",
                color: "#f8fafc",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.65 : 1,
                textAlign: "left",
                fontWeight: 800,
                fontSize: 12,
              }}
              disabled={disabled}
              onClick={() => onPickIndex(optIdx)}
            >
              {optIdx + 1}. {lbl || `Action ${optIdx + 1}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TowerClimbGame({ question, onPickIndex, disabled, phase, pickedIndex }) {
  const game = question?.game || {};
  const towerW = Number(game.towerW || 6);
  const towerH = Number(game.towerH || 10);
  const hero = game.hero || { x: 3, y: 9 };
  const goal = game.goal || { x: 3, y: 0 };
  const ledges = Array.isArray(game.ledgeOptions) ? game.ledgeOptions : [];

  const correctIndex = Number(question?.correct_index ?? 0);
  const safeLedge = ledges[correctIndex] || null;
  const chosenLedge = pickedIndex != null ? ledges[pickedIndex] || null : null;
  const optionLabels = Array.isArray(question?.options) ? question.options : [];

  const shake = phase === "failed";
  const glow = phase === "success";

  const cell = 22;
  const pad = 10;
  const viewW = towerW * cell + pad * 2;
  const viewH = towerH * cell + pad * 2;

  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Tower Climb: pick the safe ledge.</div>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.25)",
          padding: 10,
          transform: shake ? "translateX(-2px) translateY(1px)" : "translateX(0px) translateY(0px)",
          transition: "transform 180ms ease",
        }}
      >
        <svg width="100%" height="260" viewBox={`0 0 ${viewW} ${viewH}`} style={{ display: "block" }}>
          {/* tower body */}
          <rect x={pad + cell} y={pad} width={cell * (towerW - 2)} height={cell * towerH} rx={18} fill="rgba(148,163,184,0.08)" stroke="rgba(148,163,184,0.18)" />
          {/* goal */}
          <rect x={pad + cell * (towerW / 2) - cell * 0.15} y={pad + goal.y * cell} width={cell * 0.3} height={cell * 0.9} rx={10} fill="rgba(34,197,94,0.85)" />

          {/* hero */}
          <circle
            cx={pad + (phase === "success" || phase === "failed" ? (chosenLedge?.x ?? hero.x) : hero.x) * cell}
            cy={pad + (phase === "success" || phase === "failed" ? (chosenLedge?.y ?? hero.y) : hero.y) * cell}
            r={cell * 0.22}
            fill="rgba(59,130,246,0.95)"
          />

          {/* ledges */}
          {ledges.slice(0, 4).map((l, optIdx) => {
            const isSafe = safeLedge && l.x === safeLedge.x && l.y === safeLedge.y;
            const correct = optIdx === correctIndex;
            const isChosen = pickedIndex === optIdx;
            const fill = glow && correct
              ? "rgba(34,197,94,0.92)"
              : phase === "failed" && isChosen
                ? "rgba(239,68,68,0.35)"
                : isSafe
                  ? "rgba(34,197,94,0.25)"
                  : isChosen
                    ? "rgba(59,130,246,0.20)"
                    : "rgba(239,68,68,0.18)";
            const stroke = glow && correct
              ? "rgba(34,197,94,0.8)"
              : phase === "failed" && isChosen
                ? "rgba(239,68,68,0.55)"
                : isChosen
                  ? "rgba(59,130,246,0.35)"
                  : "rgba(148,163,184,0.22)";
            const cx = pad + l.x * cell;
            const cy = pad + l.y * cell;
            return (
              <g key={`${l.x}-${l.y}-${optIdx}`}>
                <rect x={cx - cell * 0.55} y={cy - cell * 0.12} width={cell * 1.1} height={cell * 0.24} rx={10} fill={fill} stroke={stroke} strokeWidth={2} />
                <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fill="rgba(248,250,252,0.95)" style={{ fontWeight: 900 }}>
                  {optIdx + 1}
                </text>
                <rect x={cx - cell * 0.6} y={cy - cell * 0.25} width={cell * 1.2} height={cell * 0.5} fill="transparent" style={{ cursor: disabled ? "not-allowed" : "pointer" }} onClick={() => !disabled && onPickIndex(optIdx)} />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>Choose a ledge:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {optionLabels.slice(0, 4).map((lbl, optIdx) => (
            <button
              key={optIdx}
              style={{
                background: "rgba(148,163,184,0.08)",
                border: optIdx === pickedIndex ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                borderRadius: 14,
                padding: "10px 10px",
                color: "#f8fafc",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.65 : 1,
                textAlign: "left",
                fontWeight: 800,
                fontSize: 12,
              }}
              disabled={disabled}
              onClick={() => onPickIndex(optIdx)}
            >
              {optIdx + 1}. {lbl || `Ledge ${optIdx + 1}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionButtons({
  missionType,
  question,
  onPickIndex,
  disabled,
  timeLeftSec,
  timeLimitSec,
  phase,
  pickedIndex,
  heroPos,
  promptVisible,
}) {
  const options = question?.options || [];
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [casting, setCasting] = useState(false);

  if (missionType === "sequence") {
    return (
      <div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Sequence mode: lock your plan.</div>
        <div style={{ display: "grid", gap: 8 }}>
          {options.map((opt, idx) => (
            <button
              key={`${opt}-${idx}`}
              style={{
                ...styles.secondaryButton,
                justifyContent: "flex-start",
                textAlign: "left",
                border: selectedIndex === idx ? "1px solid rgba(59,130,246,0.65)" : styles.secondaryButton.border,
                opacity: disabled ? 0.65 : 1,
              }}
              onClick={() => setSelectedIndex(idx)}
              disabled={disabled}
            >
              Plan {idx + 1}: {opt}
            </button>
          ))}
        </div>
        <button
          style={{ ...styles.primaryButton, marginTop: 12, width: "100%" }}
          disabled={disabled || selectedIndex === null}
          onClick={() => onPickIndex(selectedIndex)}
        >
          Lock Sequence
        </button>
      </div>
    );
  }

  if (missionType === "quiz") {
    return (
      <div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Quiz mode: quickest correct answer wins.</div>
        <div style={styles.buttonRow}>
          {options.map((opt, idx) => (
            <button
              key={`${opt}-${idx}`}
              style={{ ...styles.secondaryButton, opacity: disabled ? 0.65 : 1 }}
              onClick={() => onPickIndex(idx)}
              disabled={disabled}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (missionType === "maze_escape") {
    return (
      <MazeEscapeGame
        question={question}
        onPickIndex={onPickIndex}
        disabled={disabled}
        phase={phase}
        pickedIndex={pickedIndex}
        heroPos={heroPos}
        promptVisible={promptVisible}
      />
    );
  }
  if (missionType === "platformer_run") {
    return (
      <PlatformerRunGame
        question={question}
        onPickIndex={onPickIndex}
        disabled={disabled}
        phase={phase}
        pickedIndex={pickedIndex}
      />
    );
  }
  if (missionType === "dodge_runner") {
    return (
      <DodgeRunnerGame
        question={question}
        onPickIndex={onPickIndex}
        disabled={disabled}
        phase={phase}
        pickedIndex={pickedIndex}
      />
    );
  }
  if (missionType === "tower_climb") {
    return (
      <TowerClimbGame
        question={question}
        onPickIndex={onPickIndex}
        disabled={disabled}
        phase={phase}
        pickedIndex={pickedIndex}
      />
    );
  }

  const pctLeft = typeof timeLeftSec === "number" && typeof timeLimitSec === "number" && timeLimitSec > 0 ? Math.max(0, Math.min(1, timeLeftSec / timeLimitSec)) : 1;
  const pressurePct = (1 - pctLeft) * 100;

  if (missionType === "timed_choice") {
    return (
      <div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
          Timed Choice: pick now, confirm instantly.
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden", marginBottom: 14 }}>
          <div
            style={{
              height: "100%",
              width: `${pressurePct}%`,
              background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
              transition: "width 240ms ease",
            }}
          />
        </div>
        <div style={styles.buttonRow}>
          {options.map((opt, idx) => {
            const active = selectedIndex === idx;
            return (
              <button
                key={`${opt}-${idx}`}
                style={{
                  ...styles.secondaryButton,
                  opacity: disabled ? 0.65 : 1,
                  border: active ? "1px solid rgba(59,130,246,0.7)" : styles.secondaryButton.border,
                }}
                onClick={() => setSelectedIndex(idx)}
                disabled={disabled}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <button
          style={{ ...styles.primaryButton, marginTop: 12, width: "100%" }}
          disabled={disabled || selectedIndex === null || (typeof timeLeftSec === "number" && timeLeftSec <= 0)}
          onClick={() => onPickIndex(selectedIndex)}
        >
          Lock Answer (Under Pressure)
        </button>
      </div>
    );
  }

  if (missionType === "risk_response") {
    return (
      <div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Risk Response: mitigate before it escalates.</div>
        <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden", marginBottom: 14 }}>
          <div
            style={{
              height: "100%",
              width: `${pressurePct}%`,
              background: "linear-gradient(90deg, rgba(59,130,246,0.85), rgba(245,158,11,0.95), rgba(239,68,68,0.95))",
              transition: "width 240ms ease",
            }}
          />
        </div>
        <div style={styles.buttonRow}>
          {options.map((opt, idx) => {
            const active = selectedIndex === idx;
            return (
              <button
                key={`${opt}-${idx}`}
                style={{
                  ...styles.secondaryButton,
                  opacity: disabled ? 0.65 : 1,
                  border: active ? "1px solid rgba(245,158,11,0.7)" : styles.secondaryButton.border,
                }}
                onClick={() => setSelectedIndex(idx)}
                disabled={disabled}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <button
          style={{ ...styles.primaryButton, marginTop: 12, width: "100%", background: "linear-gradient(90deg, #f59e0b, #ef4444)" }}
          disabled={disabled || selectedIndex === null || (typeof timeLeftSec === "number" && timeLeftSec <= 0) || casting}
          onClick={() => onPickIndex(selectedIndex)}
        >
          Execute Mitigation
        </button>
      </div>
    );
  }

  if (missionType === "team_vote") {
    return (
      <div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Team Vote: cast a vote, then let the council decide.</div>
        <div style={styles.buttonRow}>
          {options.map((opt, idx) => {
            const active = selectedIndex === idx;
            return (
              <button
                key={`${opt}-${idx}`}
                style={{
                  ...styles.secondaryButton,
                  opacity: disabled ? 0.65 : 1,
                  border: active ? "1px solid rgba(34,197,94,0.65)" : styles.secondaryButton.border,
                }}
                onClick={() => setSelectedIndex(idx)}
                disabled={disabled}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <button
          style={{ ...styles.primaryButton, marginTop: 12, width: "100%" }}
          disabled={disabled || selectedIndex === null || casting}
          onClick={() => {
            setCasting(true);
            setTimeout(() => {
              setCasting(false);
              onPickIndex(selectedIndex);
            }, 700);
          }}
        >
          {casting ? "Council is voting..." : "Cast Vote"}
        </button>
      </div>
    );
  }

  // Fallback for unknown mission types
  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>{missionType} mode.</div>
      <div style={styles.buttonRow}>
        {options.map((opt, idx) => (
          <button
            key={`${opt}-${idx}`}
            style={{ ...styles.secondaryButton, opacity: disabled ? 0.65 : 1 }}
            onClick={() => onPickIndex(idx)}
            disabled={disabled}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 18,
  },
  modalCard: {
    width: "min(980px, 96vw)",
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.95))",
    border: "1px solid rgba(148,163,184,0.10)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
    padding: 22,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    borderRadius: 12,
    height: 36,
    padding: "0 12px",
    background: "rgba(148,163,184,0.12)",
    color: "#e5e7eb",
    border: "1px solid rgba(148,163,184,0.18)",
    cursor: "pointer",
  },
  cardTitle: { fontSize: 20, fontWeight: 800, marginBottom: 6 },
  cardHint: { color: "#94a3b8", fontSize: 13, marginBottom: 10 },
  secondaryButton: {
    background: "rgba(148,163,184,0.08)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 14,
    padding: "12px 12px",
    color: "#f8fafc",
    cursor: "pointer",
  },
  primaryButton: {
    background: "linear-gradient(90deg, #2563eb, #22c55e)",
    border: "1px solid rgba(34,197,94,0.55)",
    borderRadius: 14,
    padding: "12px 14px",
    color: "#071018",
    fontWeight: 900,
    cursor: "pointer",
  },
  buttonRow: { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" },
};

export default function RuntimeRunModal({
  specId,
  playerId,
  missions,
  startMissionId,
  onClose,
  onFinish,
}) {
  const [activeMission, setActiveMission] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [steps, setSteps] = useState([]);
  const [stepTimeLimitSec, setStepTimeLimitSec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [phase, setPhase] = useState("init"); // init | answering | success | failed
  const [mazeControlMode, setMazeControlMode] = useState("moving"); // moving | questioning
  const [mazeHeroPos, setMazeHeroPos] = useState(null);
  const [pickedIndex, setPickedIndex] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(null);
  const startTsRef = useRef(null);
  const intervalRef = useRef(null);

  const stepCount = steps.length || activeMission?.question?.step_count || 4;
  const isMazeEscape = activeMission?.type === "maze_escape";
  const mazePromptVisible = isMazeEscape && mazeControlMode === "questioning";
  const mazeTileByOption = isMazeEscape
    ? (steps?.[stepIdx]?.game?.tileByOption || activeMission?.question?.game?.tileByOption || [])
    : [];

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startTimer = (limitSec) => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      if (!startTsRef.current) return;
      const elapsed = (Date.now() - startTsRef.current) / 1000;
      const left = Math.max(0, Math.ceil(limitSec - elapsed));
      setTimeLeftSec(left);
    }, 250);
  };

  const startMission = async (missionId) => {
    setLoading(true);
    setLocked(true);
    setFeedback("");
    setPhase("answering");
    stopTimer();
    try {
      const res = await axios.post(
        `${API}/runtime/game/by-spec/${specId}/${playerId}/start/${missionId}`
      );
      const missionData = res.data?.mission || null;
      setActiveMission(missionData);
      setPlayerState(res.data?.state || null);

      const stepList = missionData?.question?.steps || [];
      setSteps(stepList);
      setStepIdx(0);

      const limitSec =
        missionData?.adaptive_step_time_limit_sec ??
        missionData?.adaptive_time_limit_sec ??
        missionData?.time_limit_sec ??
        12;
      setStepTimeLimitSec(limitSec);
      startTsRef.current = Date.now();
      setTimeLeftSec(limitSec);
      startTimer(limitSec);
      postPreviewTelemetry(specId, playerId, {
        spec_id: Number(specId),
        player_id: String(playerId),
        event: "session_start",
        mission_id: missionId,
        meta: { adaptive_step_time_limit_sec: limitSec },
      });
    } catch (e) {
      setPhase("failed");
      const d = e?.response?.data?.detail;
      const msg =
        typeof d === "string"
          ? d
          : Array.isArray(d)
            ? d.map((x) => (typeof x === "object" && x?.msg ? x.msg : String(x))).join(" ")
            : "Could not start mission.";
      setFeedback(msg);
    } finally {
      setLoading(false);
      setLocked(false);
    }
  };

  useEffect(() => {
    if (!specId || !playerId) return;
    if (!startMissionId) return;
    // Start the selected mission once; then we play 4 internal steps inside it.
    startMission(startMissionId);
    setPickedIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specId, playerId, startMissionId]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  // Maze escape: start each step by moving; reveal the question only when the hero reaches the obstacle area.
  useEffect(() => {
    if (!isMazeEscape) return;
    const q = steps?.[stepIdx] || activeMission?.question || {};
    const game = q?.game || {};
    const gridSize = Number(game.gridSize || 7);
    const hero = game.hero || { x: 3, y: gridSize - 1 };
    setMazeHeroPos({ x: hero.x, y: hero.y });
    setMazeControlMode("moving");
  }, [isMazeEscape, stepIdx, activeMission?.id]);

  useEffect(() => {
    if (!isMazeEscape) return;
    if (mazeControlMode !== "moving") return;
    if (!mazeHeroPos) return;
    const triggered = (mazeTileByOption || []).some(
      (t) => Math.abs(Number(t.x) - mazeHeroPos.x) + Math.abs(Number(t.y) - mazeHeroPos.y) <= 1
    );
    if (triggered) setMazeControlMode("questioning");
  }, [isMazeEscape, mazeControlMode, mazeHeroPos, mazeTileByOption]);

  // Time runs out -> auto-submit a wrong answer (so backend resets the step)
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [stepIdx, activeMission?.id]);

  useEffect(() => {
    setPickedIndex(null);
  }, [stepIdx, activeMission?.id]);

  useEffect(() => {
    if (phase !== "answering") return;
    if (isMazeEscape && mazeControlMode !== "questioning") return;
    if (typeof timeLeftSec !== "number") return;
    if (timeLeftSec > 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    if (!activeMission) return;
    // Submit an invalid index to force a failure.
    handlePickIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSec, phase]);

  const handlePickIndex = async (idx) => {
    if (!activeMission || locked) return;
    setPickedIndex(idx);
    setLocked(true);
    stopTimer();

    const elapsedSec = startTsRef.current ? (Date.now() - startTsRef.current) / 1000 : null;

    try {
      const res = await axios.post(
        `${API}/runtime/game/by-spec/${specId}/${playerId}/submit-step/${activeMission.id}`,
        {
          selected_index: idx,
          elapsed_sec: elapsedSec,
        }
      );

      setPlayerState(res.data?.state || null);

      const missionComplete = !!res.data?.mission_complete;
      const stepSuccess = !!res.data?.step_success;
      const nextStepIndex = Number(res.data?.next_step_index ?? 0);
      const earnedXp = res.data?.earned_xp ?? 0;
      const nextLimitSec = res.data?.adaptive_step_time_limit_sec ?? stepTimeLimitSec ?? 12;

      if (missionComplete) {
        postPreviewTelemetry(specId, playerId, {
          spec_id: Number(specId),
          player_id: String(playerId),
          event: "mission_success",
          mission_id: activeMission.id,
          meta: { earned_xp: earnedXp, adaptive_step_time_limit_sec: nextLimitSec },
        });
        setPhase("success");
        setFeedback(`Cleared! +${earnedXp} XP`);
        stopTimer();
        setTimeout(() => {
          if (onFinish) onFinish();
          if (onClose) onClose();
        }, 900);
        return;
      }

      postPreviewTelemetry(specId, playerId, {
        spec_id: Number(specId),
        player_id: String(playerId),
        event: stepSuccess ? "step_success" : "step_fail",
        mission_id: activeMission.id,
        meta: { next_step_index: nextStepIndex, adaptive_step_time_limit_sec: nextLimitSec },
      });

      setStepIdx(nextStepIndex);
      setStepTimeLimitSec(nextLimitSec);

      // Restart timer for the next step (or retry step on failure)
      startTsRef.current = Date.now();
      setTimeLeftSec(nextLimitSec);
      startTimer(nextLimitSec);

      setPhase(stepSuccess ? "success" : "failed");
      setFeedback(stepSuccess ? `Step cleared!` : "Wrong or too slow. Progress reset.");
      setTimeout(() => setPhase("answering"), 450);
    } catch (e) {
      setPhase("failed");
      setFeedback(e?.response?.data?.detail || "Submit failed.");
      setLocked(false);
    } finally {
      setLocked(false);
    }
  };

  // Maze escape: keyboard controls
  useEffect(() => {
    if (!isMazeEscape) return;

    const onKeyDown = (e) => {
      if (locked || loading) return;
      if (!isMazeEscape) return;

      // Answer selection (1-4) when question is revealed
      if (mazeControlMode === "questioning") {
        const k = String(e.key);
        if (["1", "2", "3", "4"].includes(k)) {
          e.preventDefault();
          handlePickIndex(Number(k) - 1);
        }
        return;
      }

      // Movement when moving
      if (mazeControlMode !== "moving") return;
      if (!mazeHeroPos) return;

      const q = steps?.[stepIdx] || activeMission?.question || {};
      const game = q?.game || {};
      const gridSize = Number(game.gridSize || 7);

      let next = { ...mazeHeroPos };
      if (e.key === "ArrowUp") next.y = Math.max(0, next.y - 1);
      else if (e.key === "ArrowDown") next.y = Math.min(gridSize - 1, next.y + 1);
      else if (e.key === "ArrowLeft") next.x = Math.max(0, next.x - 1);
      else if (e.key === "ArrowRight") next.x = Math.min(gridSize - 1, next.x + 1);
      else return;

      e.preventDefault();
      setMazeHeroPos(next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMazeEscape, mazeControlMode, locked, loading, mazeHeroPos, stepIdx]);

  const currentQuestion = steps?.[stepIdx] || activeMission?.question || {};

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <button
          style={styles.closeButton}
          onClick={() => {
            stopTimer();
            onClose?.();
          }}
          disabled={loading}
        >
          Close
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={styles.cardTitle}>Runtime Run</div>
            <div style={styles.cardHint}>
              Four-step participation preview (not a shipped game). Answer correctly to climb; fail to retry.
            </div>
          </div>
          <div style={{ minWidth: 260 }}>
            <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
              Step {Math.min(stepIdx + 1, stepCount)}/{stepCount}
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${((stepIdx + (phase === "success" ? 1 : 0)) / stepCount) * 100}%`,
                  background: "linear-gradient(90deg, #22c55e, #2563eb)",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 16 }}>
          <div style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(148,163,184,0.10)", background: "rgba(2,6,23,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, color: "#f8fafc", fontSize: 16 }}>
                {activeMission?.title || "Loading mission..."}
              </div>
              <div style={{ color: "#93c5fd", fontSize: 13, fontWeight: 800 }}>
                Time Left: {timeLeftSec ?? "—"}s
              </div>
            </div>

            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: 800 }}>
              {activeMission?.type ? `Mode: ${activeMission.type}` : ""}
            </div>

            {!(isMazeEscape && mazeControlMode !== "questioning") ? (
              <>
                <div style={{ marginBottom: 10, color: "#e5e7eb", fontWeight: 800 }}>
                  {currentQuestion?.stem}
                </div>
                <div style={{ color: "#93c5fd", fontSize: 13, marginBottom: 14 }}>
                  {currentQuestion?.instruction}
                </div>
              </>
            ) : null}

            {activeMission ? (
              <OptionButtons
                key={`${activeMission?.id ?? "m"}-${stepIdx}`}
                missionType={activeMission?.type}
                question={currentQuestion}
                onPickIndex={handlePickIndex}
                disabled={loading || locked || phase === "success"}
                timeLeftSec={timeLeftSec}
                timeLimitSec={stepTimeLimitSec}
                phase={phase}
                pickedIndex={pickedIndex}
                heroPos={mazeHeroPos}
                promptVisible={mazePromptVisible}
              />
            ) : (
              <div style={{ color: "#94a3b8" }}>Starting...</div>
            )}
          </div>

          <div style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(148,163,184,0.10)", background: "rgba(2,6,23,0.35)" }}>
            <div style={{ fontWeight: 900, color: "#cbd5e1", marginBottom: 8 }}>Run Status</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
              {feedback || "Clear obstacles by answering quickly and correctly."}
            </div>

            <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Energy</span>
                <strong style={{ color: "#e5e7eb" }}>{playerState?.energy ?? 100}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Combo</span>
                <strong style={{ color: "#e5e7eb" }}>x{playerState?.combo_multiplier ?? 1}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>XP</span>
                <strong style={{ color: "#e5e7eb" }}>{playerState?.xp ?? 0}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Badges</span>
                <strong style={{ color: "#e5e7eb" }}>{(playerState?.badges || []).length}</strong>
              </div>
            </div>

            <div style={{ marginTop: 14, color: "#94a3b8", fontSize: 12 }}>
              Tip: Wrong attempts restart the same mission step.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

