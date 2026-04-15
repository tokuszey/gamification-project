/** Shared API shapes for typed components (incremental TS migration). */

export type SparqlQueryResponse = {
  ok: boolean;
  variables: string[];
  rows: Record<string, string | null>[];
  row_count: number;
};

export type SparqlPresetsResponse = {
  ok: boolean;
  presets: string[];
  queries: Record<string, string>;
};

export type PreviewTelemetryPayload = {
  spec_id: number;
  player_id: string;
  event: "mission_success" | "mission_fail" | "step_success" | "step_fail" | "session_start";
  mission_id?: number;
  meta?: Record<string, unknown>;
};
