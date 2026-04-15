import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL as API } from "./config";
import FlowChannelChart from "./FlowChannelChart";

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(17,24,39,0.95), rgba(15,23,42,0.92))",
        border: "1px solid rgba(148,163,184,0.08)",
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>{value}</div>
    </div>
  );
}

function BarRow({ label, value, maxValue, gradient }) {
  const widthPct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div
        style={{
          width: 190,
          fontSize: 13,
          color: "#cbd5e1",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: 12,
          borderRadius: 999,
          background: "rgba(148,163,184,0.12)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${widthPct}%`, height: "100%", background: gradient }} />
      </div>
      <div style={{ width: 52, textAlign: "right", fontWeight: 800, color: "#e5e7eb" }}>{value}</div>
    </div>
  );
}

export default function AnalyticsPage({ specs = [] }) {
  const [specId, setSpecId] = useState("all");
  const [telemetryHours, setTelemetryHours] = useState("all");
  const [telemetryTail, setTelemetryTail] = useState("500");
  const [analytics, setAnalytics] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [specDetail, setSpecDetail] = useState(null);

  const fetchData = async (sid, hoursKey, tailLines) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sid !== "all") params.set("spec_id", sid);
      if (hoursKey !== "all") params.set("since_hours", hoursKey);
      params.set("tail", tailLines);
      const telQ = params.toString();
      const [aRes, tRes] = await Promise.all([
        axios.get(`${API}/analytics/overview?spec_id=${encodeURIComponent(sid)}`),
        axios.get(`${API}/telemetry/preview-summary?${telQ}`),
      ]);
      setAnalytics(aRes.data);
      setTelemetry(tRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await fetchData(specId, telemetryHours, telemetryTail);
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specId, telemetryHours, telemetryTail]);

  useEffect(() => {
    if (specId === "all") {
      setSpecDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API}/specs/${specId}`);
        if (!cancelled) setSpecDetail(res.data);
      } catch {
        if (!cancelled) setSpecDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [specId]);

  const tasksMax = useMemo(() => {
    const rows = analytics?.tasks_completion || [];
    return Math.max(1, ...rows.map((r) => r.completed_count));
  }, [analytics]);

  const badgesMax = useMemo(() => {
    const rows = analytics?.badges_distribution || [];
    return Math.max(1, ...rows.map((r) => r.count));
  }, [analytics]);

  const telemetryMax = useMemo(() => {
    const m = telemetry?.by_event || {};
    return Math.max(1, ...Object.values(m).map((n) => Number(n) || 0));
  }, [telemetry]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Analytics Overview</h3>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Filter charts by spec.</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>
              Spec
            </label>
            <select
              value={specId}
              onChange={(e) => setSpecId(e.target.value)}
              style={{
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.14)",
                background: "rgba(15,23,42,0.85)",
                color: "#fff",
                padding: "0 12px",
                outline: "none",
                minWidth: 260,
              }}
            >
              <option value="all">All Specs</option>
              {(specs || []).map((sp) => (
                <option key={sp.id} value={String(sp.id)}>
                  {sp.title} ({sp.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>
              Preview telemetry window
            </label>
            <select
              value={telemetryHours}
              onChange={(e) => setTelemetryHours(e.target.value)}
              style={{
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.14)",
                background: "rgba(15,23,42,0.85)",
                color: "#fff",
                padding: "0 12px",
                outline: "none",
                minWidth: 160,
              }}
            >
              <option value="all">All times (in tail)</option>
              <option value="24">Last 24h</option>
              <option value="168">Last 7d</option>
              <option value="720">Last 30d</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>
              JSONL tail lines
            </label>
            <select
              value={telemetryTail}
              onChange={(e) => setTelemetryTail(e.target.value)}
              style={{
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.14)",
                background: "rgba(15,23,42,0.85)",
                color: "#fff",
                padding: "0 12px",
                outline: "none",
                minWidth: 120,
              }}
            >
              <option value="500">500</option>
              <option value="1500">1500</option>
              <option value="3000">3000</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
        <MetricCard label="Total Specs" value={analytics?.global?.total_specs ?? "-"} />
        <MetricCard label="Realized Specs" value={analytics?.global?.realized_specs ?? "-"} />
        <MetricCard label="Players Started" value={analytics?.spec?.players_started ?? "-"} />
        <MetricCard
          label="Avg Completion"
          value={
            analytics?.spec?.avg_completion_per_player_pct != null
              ? `${analytics.spec.avg_completion_per_player_pct}%`
              : "-"
          }
        />
        <MetricCard
          label={specId === "all" ? "Preview events (tail)" : "Preview events (spec tail)"}
          value={telemetry?.total_recent ?? "-"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <div
          style={{
            background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
            border: "1px solid rgba(148,163,184,0.08)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Task Completion</h3>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Completed counts per mission (top).</div>
          {!loading && (!analytics?.tasks_completion?.length ? (
            <div style={{ color: "#94a3b8", marginTop: 12 }}>No runtime data yet.</div>
          ) : (
            (analytics?.tasks_completion || []).slice(0, 8).map((r) => (
              <BarRow
                key={r.task_title}
                label={r.task_title}
                value={r.completed_count}
                maxValue={tasksMax}
                gradient="linear-gradient(90deg, #2563eb, #22c55e)"
              />
            ))
          ))}
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
            border: "1px solid rgba(148,163,184,0.08)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Spec Status Distribution</h3>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
            DRAFT / VALIDATED / APPROVED / REALIZED (filtered to selected spec).
          </div>
          {(() => {
            const dist = analytics?.selected_spec_status_distribution || analytics?.spec_status_distribution || {};
            const total = Math.max(1, dist.total || 1);
            const items = [
              { key: "DRAFT", v: dist.DRAFT ?? 0, c: "rgba(245,158,11,0.95)" },
              { key: "VALIDATED", v: dist.VALIDATED ?? 0, c: "rgba(37,99,235,0.95)" },
              { key: "APPROVED", v: dist.APPROVED ?? 0, c: "rgba(16,185,129,0.95)" },
              { key: "REALIZED", v: dist.REALIZED ?? 0, c: "rgba(147,197,253,0.95)" },
            ];
            return items.map((it) => {
              const pct = (it.v / total) * 100;
              return (
                <div key={it.key} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      color: "#cbd5e1",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{it.key}</span>
                    <span>{it.v}</span>
                  </div>
                  <div style={{ height: 12, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: it.c }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
          border: "1px solid rgba(99,102,241,0.18)",
          borderRadius: 22,
          padding: 22,
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          marginTop: 18,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Engagement preview telemetry</h3>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
          Last {telemetry?.tail_limit ?? "…"} JSONL lines
          {telemetryHours !== "all"
            ? `, UTC window: last ${telemetry?.since_hours ?? telemetryHours}h`
            : ""}
          , {specId === "all" ? "all specs" : `spec #${specId}`}. Step /
          mission / session events for Flow and difficulty tuning.
        </div>
        {!telemetry?.by_event || !Object.keys(telemetry.by_event).length ? (
          <div style={{ color: "#94a3b8", marginTop: 12 }}>
            {specId === "all"
              ? "No preview events recorded yet — run a quest from Engagement preview."
              : "No preview events for this spec in the recent tail — try another spec or generate activity in the runtime lab."}
          </div>
        ) : (
          Object.entries(telemetry.by_event)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <BarRow
                key={k}
                label={k}
                value={v}
                maxValue={telemetryMax}
                gradient="linear-gradient(90deg, #6366f1, #a855f7)"
              />
            ))
        )}
      </div>

      {specId !== "all" && specDetail ? (
        <FlowChannelChart specDetail={specDetail} analytics={analytics} />
      ) : (
        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 22,
            border: "1px dashed rgba(148,163,184,0.2)",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          Select a single spec to show the <strong style={{ color: "#cbd5e1" }}>Flow channel</strong> chart (uses §18
          Assessment + §13 gameplay text and analytics completion).
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <div
          style={{
            background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
            border: "1px solid rgba(148,163,184,0.08)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Badge Distribution</h3>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Badge earnings across players.</div>
          {(() => {
            const rows = analytics?.badges_distribution || [];
            if (!rows.length) return <div style={{ color: "#94a3b8", marginTop: 12 }}>No badges yet.</div>;
            return rows.slice(0, 10).map((r) => (
              <BarRow
                key={r.badge_name}
                label={r.badge_name}
                value={r.count}
                maxValue={badgesMax}
                gradient="linear-gradient(90deg, #f59e0b, #ef4444)"
              />
            ));
          })()}
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
            border: "1px solid rgba(148,163,184,0.08)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Live Leaderboard</h3>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Ranked by XP (includes level and badge count).</div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px 16px", color: "#cbd5e1", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.10)" }}>Player</th>
                  <th style={{ textAlign: "center", padding: "14px 16px", color: "#cbd5e1", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.10)" }}>XP</th>
                  <th style={{ textAlign: "center", padding: "14px 16px", color: "#cbd5e1", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.10)" }}>Level</th>
                  <th style={{ textAlign: "center", padding: "14px 16px", color: "#cbd5e1", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.10)" }}>Badges</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.leaderboard || []).map((row, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "left", padding: "14px 16px", color: "#f8fafc", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                    {row.player_id}
                  </td>
                  <td style={{ textAlign: "center", padding: "14px 16px", color: "#f8fafc", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                    {row.xp}
                  </td>
                  <td style={{ textAlign: "center", padding: "14px 16px", color: "#f8fafc", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                    {row.level}
                  </td>
                  <td style={{ textAlign: "center", padding: "14px 16px", color: "#f8fafc", fontSize: 14, borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                    {row.badge_count}
                    <div style={{ color: "#93c5fd", fontSize: 12, marginTop: 4 }}>
                      {(row.badges || []).slice(0, 2).join(", ")}
                      {(row.badges || []).length > 2 ? "..." : ""}
                    </div>
                  </td>
                </tr>
                ))}
                {!(analytics?.leaderboard || []).length ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "left", padding: "14px 16px", color: "#cbd5e1" }}>
                      No leaderboard data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

