import React, { useCallback, useState } from "react";
import axios, { AxiosError } from "axios";
import { API_BASE_URL as API } from "./config";
import type { SparqlPresetsResponse, SparqlQueryResponse } from "./types/gameforge";

type Styles = Record<string, React.CSSProperties>;

function errMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const ax = e as AxiosError<{ detail?: string }>;
    return String(ax.response?.data?.detail || ax.message || e);
  }
  return String(e instanceof Error ? e.message : e);
}

type Props = { styles: Styles };

export default function SparqlLab({ styles }: Props) {
  const [presets, setPresets] = useState<SparqlPresetsResponse | null>(null);
  const [presetKey, setPresetKey] = useState("game_elements_for_hexad_achiever");
  const [customQuery, setCustomQuery] = useState("");
  const [result, setResult] = useState<SparqlQueryResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPresets = useCallback(async () => {
    try {
      const res = await axios.get<SparqlPresetsResponse>(`${API}/ontology/sparql/presets`);
      setPresets(res.data);
      setErr("");
    } catch (e) {
      setErr(errMessage(e));
    }
  }, []);

  const runPreset = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.post<SparqlQueryResponse>(`${API}/ontology/sparql/run-preset`, {
        preset_key: presetKey,
      });
      setResult(res.data);
    } catch (e) {
      setResult(null);
      setErr(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const runCustom = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.post<SparqlQueryResponse>(`${API}/ontology/sparql/run`, { query: customQuery });
      setResult(res.data);
    } catch (e) {
      setResult(null);
      setErr(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 14,
        background: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(34,197,94,0.15)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#86efac" }}>SPARQL lab (GamifyOnt)</div>
      <div style={{ ...styles.cardHint, marginBottom: 10 }}>
        Read-only SELECT against the bundled ontology. Use presets to fetch mechanics linked to HEXAD Achiever via{" "}
        <code style={{ color: "#cbd5e1" }}>appealsTo</code>.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <button type="button" style={styles.smallButton} onClick={loadPresets}>
          Load presets
        </button>
        <button type="button" style={styles.secondaryButton} onClick={runPreset} disabled={loading}>
          Run preset
        </button>
      </div>
      {presets?.presets ? (
        <select
          value={presetKey}
          onChange={(e) => setPresetKey(e.target.value)}
          style={{
            width: "100%",
            height: 40,
            marginBottom: 10,
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.14)",
            background: "rgba(15,23,42,0.85)",
            color: "#fff",
            padding: "0 10px",
          }}
        >
          {presets.presets.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      ) : null}
      <div style={{ ...styles.cardHint, marginBottom: 6 }}>Custom SELECT (optional)</div>
      <textarea
        value={customQuery}
        onChange={(e) => setCustomQuery(e.target.value)}
        placeholder="PREFIX go: <http://example.org/gamifyont.owl#> SELECT ?s WHERE { ?s a go:Quest . } LIMIT 20"
        style={{ ...styles.textareaLarge, minHeight: 100, fontFamily: "monospace", fontSize: 12 }}
      />
      <button
        type="button"
        style={{ ...styles.secondaryButton, marginTop: 8 }}
        onClick={runCustom}
        disabled={loading || !customQuery.trim()}
      >
        Run custom
      </button>
      {loading ? <div style={{ ...styles.cardHint, marginTop: 8 }}>Running…</div> : null}
      {err ? <div style={{ marginTop: 8, color: "#fecaca", fontSize: 12, whiteSpace: "pre-wrap" }}>{err}</div> : null}
      {result?.rows ? (
        <div
          style={{
            marginTop: 10,
            maxHeight: 200,
            overflow: "auto",
            fontSize: 11,
            color: "#cbd5e1",
            fontFamily: "monospace",
          }}
        >
          <div style={{ marginBottom: 6, color: "#94a3b8" }}>{result.row_count} row(s)</div>
          {result.rows.map((row, i) => (
            <div
              key={i}
              style={{ marginBottom: 6, borderBottom: "1px solid rgba(148,163,184,0.08)", paddingBottom: 4 }}
            >
              {JSON.stringify(row)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
