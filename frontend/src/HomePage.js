import React from "react";
import PlatformFlowSection from "./PlatformFlowSection";

function MetricCard({ styles, label, value, compact = false }) {
  return (
    <div style={{ ...styles.metricCard, ...(compact ? styles.metricCardCompact : {}) }}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function TimelineStep({ styles, title, active }) {
  return (
    <div style={{ ...styles.timelineStep, ...(active ? styles.timelineStepActive : {}) }}>
      <div style={{ ...styles.timelineDot, ...(active ? styles.timelineDotActive : {}) }} />
      <span>{title}</span>
    </div>
  );
}

function TimelineConnector({ styles, active }) {
  return <div style={{ ...styles.timelineConnector, ...(active ? styles.timelineConnectorActive : {}) }} />;
}

/**
 * Landing: summary metrics, spec list, platform flow map.
 */
export default function HomePage({
  styles,
  specs,
  spec,
  completedSections,
  specHealth,
  completionRate,
  validationResult,
  runtimeResult,
  analytics,
  statusColor,
  openSpec,
  deleteSpec,
  onNavigate,
}) {
  return (
    <>
      <div style={styles.metricsRow}>
        <MetricCard styles={styles} label="Specifications" value={specs.length} />
        <MetricCard styles={styles} label="Active spec · filled sections" value={completedSections} />
        <MetricCard styles={styles} label="Realization" value={runtimeResult ? "Generated" : "Pending"} />
        <MetricCard styles={styles} label="Analytics · players" value={analytics?.total_players ?? 0} />
      </div>

      <div style={styles.overviewGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h3 style={styles.cardTitle}>Project health</h3>
            <span style={styles.cardHint}>Specification readiness score</span>
          </div>
          <div style={styles.healthHeroRow}>
            <div>
              <div style={styles.healthScore}>{specHealth}%</div>
              <div style={styles.healthSub}>Readiness</div>
            </div>
            <div style={styles.progressRingWrap}>
              <div
                style={{
                  ...styles.progressRing,
                  background: `conic-gradient(#2563eb ${specHealth * 3.6}deg, rgba(148,163,184,0.16) 0deg)`,
                }}
              >
                <div style={styles.progressRingInner}>{specHealth}%</div>
              </div>
            </div>
          </div>
          <div style={styles.progressBlock}>
            <div style={styles.progressLabelRow}>
              <span>Section completion</span>
              <strong>{completionRate}%</strong>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${completionRate}%` }} />
            </div>
          </div>
          <div style={styles.progressBlock}>
            <div style={styles.progressLabelRow}>
              <span>Validation confidence</span>
              <strong>{validationResult?.ok ? "High" : "Pending"}</strong>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFillSecondary, width: `${validationResult?.ok ? 100 : 42}%` }} />
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h3 style={styles.cardTitle}>Lifecycle</h3>
            <span style={styles.cardHint}>Draft → Validated → Approved → Realized</span>
          </div>
          <div style={styles.timelineWrap}>
            <TimelineStep styles={styles} title="Draft" active={true} />
            <TimelineConnector styles={styles} active={completedSections > 0} />
            <TimelineStep styles={styles} title="Validated" active={Boolean(validationResult?.ok)} />
            <TimelineConnector styles={styles} active={spec?.status === "approved" || Boolean(runtimeResult)} />
            <TimelineStep styles={styles} title="Approved" active={spec?.status === "approved" || Boolean(runtimeResult)} />
            <TimelineConnector styles={styles} active={Boolean(runtimeResult)} />
            <TimelineStep styles={styles} title="Realized" active={Boolean(runtimeResult)} />
          </div>
          <div style={styles.lifecycleNotes}>
            <div style={styles.lifecycleNoteItem}>
              <span style={styles.noteDotBlue} /> AI-assisted specification text
            </div>
            <div style={styles.lifecycleNoteItem}>
              <span style={styles.noteDotGreen} /> Realize: tasks and scoring rules
            </div>
            <div style={styles.lifecycleNoteItem}>
              <span style={styles.noteDotAmber} /> Select a spec before export
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeaderRow}>
          <h3 style={styles.cardTitle}>My specifications</h3>
          <span style={styles.cardHint}>From draft to realization</span>
        </div>
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: "80px" }} />
            <col style={{ width: "54%" }} />
            <col style={{ width: "160px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "140px" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={styles.tableHeaderLeft}>ID</th>
              <th style={styles.tableHeaderLeft}>Title</th>
              <th style={styles.tableHeaderCenter}>Status</th>
              <th style={styles.tableHeaderCenter}>Open</th>
              <th style={styles.tableHeaderCenter}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {specs.map((item) => (
              <tr key={item.id}>
                <td style={styles.tableCellLeft}>{item.id}</td>
                <td style={styles.tableCellLeft}>{item.title}</td>
                <td style={styles.tableCellCenter}>
                  <span style={{ ...styles.statusBadge, background: statusColor(item.status) }}>{item.status}</span>
                </td>
                <td style={styles.tableCellCenter}>
                  <button type="button" style={styles.smallButton} onClick={() => openSpec(item.id)}>
                    Open
                  </button>
                </td>
                <td style={styles.tableCellCenter}>
                  {["draft", "validated"].includes(String(item.status || "").toLowerCase()) ? (
                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => deleteSpec(item.id, item.status)}
                      title="Delete specification"
                    >
                      Delete
                    </button>
                  ) : (
                    <button type="button" style={styles.lockedButton} disabled title="Approved records cannot be deleted">
                      Locked
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlatformFlowSection styles={styles} onNavigate={onNavigate} />
    </>
  );
}
