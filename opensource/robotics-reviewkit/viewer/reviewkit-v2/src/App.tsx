import React, { useMemo, useState } from "react";

type EventLabel = "success" | "contact" | "safety" | "drift" | "recovery" | "intervention";

type ReviewEvent = {
  timestamp_s: number;
  label: EventLabel;
  severity?: string;
  notes?: string;
};

type RubricAnchor = {
  criterion_id: string;
  score?: number;
  label?: string;
};

type Episode = {
  episode_id: string;
  task: string;
  review_version: "v2";
  synthetic: boolean;
  duration_seconds: number;
  rubric_anchors: RubricAnchor[];
  event_stream: ReviewEvent[];
  steps: unknown[];
};

const sampleEpisode: Episode = {
  episode_id: "synthetic-vla-001",
  task: "dexterity",
  review_version: "v2",
  synthetic: true,
  duration_seconds: 120,
  rubric_anchors: [{ criterion_id: "grasp_alignment", score: 2, label: "stable grasp alignment" }],
  event_stream: [
    { timestamp_s: 0, label: "contact", severity: "info", notes: "Synthetic gripper contact begins." },
    { timestamp_s: 30, label: "intervention", severity: "warning", notes: "Synthetic operator re-centers the mock object." },
    { timestamp_s: 45, label: "recovery", severity: "info", notes: "Synthetic task flow returns to nominal motion." },
    { timestamp_s: 90, label: "success", severity: "info", notes: "Synthetic final state satisfies the rubric anchor." },
  ],
  steps: [{ timestamp_s: 0 }, { timestamp_s: 45 }, { timestamp_s: 90 }],
};

const labelColors: Record<EventLabel, string> = {
  contact: "#2563eb",
  drift: "#9333ea",
  intervention: "#dc2626",
  recovery: "#059669",
  safety: "#d97706",
  success: "#16a34a",
};

function parseEpisode(input: string): Episode {
  const parsed = JSON.parse(input) as Episode;
  if (parsed.review_version !== "v2") {
    throw new Error("review_version must be v2");
  }
  if (!Array.isArray(parsed.event_stream)) {
    throw new Error("event_stream must be an array");
  }
  return parsed;
}

export default function App() {
  const [raw, setRaw] = useState(JSON.stringify(sampleEpisode, null, 2));
  const parsed = useMemo(() => {
    try {
      return { episode: parseEpisode(raw), error: "" };
    } catch (error) {
      return { episode: sampleEpisode, error: error instanceof Error ? error.message : "Invalid episode JSON" };
    }
  }, [raw]);

  const counts = parsed.episode.event_stream.reduce<Record<string, number>>((acc, event) => {
    acc[event.label] = (acc[event.label] ?? 0) + 1;
    return acc;
  }, {});
  const duration = Math.max(parsed.episode.duration_seconds || 1, 1);
  const interventionCount = counts.intervention ?? 0;
  const interventionsPerMinute = interventionCount / (duration / 60);

  return (
    <main style={styles.shell}>
      <section style={styles.toolbar}>
        <div>
          <h1 style={styles.title}>{parsed.episode.episode_id}</h1>
          <div style={styles.subtitle}>
            {parsed.episode.task} / {parsed.episode.review_version} / {parsed.episode.synthetic ? "synthetic" : "permissioned"}
          </div>
        </div>
        <div style={styles.metric}>
          <strong>{interventionsPerMinute.toFixed(2)}</strong>
          <span>interventions/min</span>
        </div>
      </section>

      <section style={styles.grid}>
        <textarea
          aria-label="episode json"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          spellCheck={false}
          style={styles.editor}
        />
        <section style={styles.panel}>
          {parsed.error ? <div style={styles.error}>{parsed.error}</div> : null}
          <div style={styles.timeline} aria-label="event timeline">
            {parsed.episode.event_stream.map((event, index) => (
              <div
                key={`${event.timestamp_s}-${event.label}-${index}`}
                style={{
                  ...styles.event,
                  left: `${Math.min(96, Math.max(0, (event.timestamp_s / duration) * 100))}%`,
                  borderColor: labelColors[event.label],
                }}
                title={`${event.timestamp_s}s ${event.label}`}
              >
                <span style={{ ...styles.eventDot, background: labelColors[event.label] }} />
                <span style={styles.eventLabel}>{event.label}</span>
              </div>
            ))}
          </div>

          <div style={styles.cards}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Events</h2>
              {Object.entries(counts).map(([label, count]) => (
                <div key={label} style={styles.row}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Anchors</h2>
              {parsed.episode.rubric_anchors.map((anchor) => (
                <div key={anchor.criterion_id} style={styles.row}>
                  <span>{anchor.criterion_id}</span>
                  <strong>{anchor.score ?? "-"}</strong>
                </div>
              ))}
            </div>
          </div>

          <ol style={styles.eventList}>
            {parsed.episode.event_stream.map((event, index) => (
              <li key={`${index}-${event.timestamp_s}`} style={styles.eventRow}>
                <strong>{event.timestamp_s}s</strong>
                <span style={{ color: labelColors[event.label] }}>{event.label}</span>
                <span>{event.notes}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

const styles = {
  shell: {
    background: "#f8fafc",
    color: "#111827",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    minHeight: "100vh",
    padding: 24,
  },
  toolbar: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  title: { fontSize: 28, lineHeight: 1.1, margin: 0 },
  subtitle: { color: "#4b5563", fontSize: 14, marginTop: 4 },
  metric: {
    alignItems: "flex-end",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column" as const,
    padding: "10px 12px",
  },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(320px, 0.85fr) minmax(360px, 1.15fr)",
  },
  editor: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13,
    minHeight: 640,
    padding: 14,
    resize: "vertical" as const,
    width: "100%",
  },
  panel: { minWidth: 0 },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    color: "#991b1b",
    marginBottom: 12,
    padding: 10,
  },
  timeline: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    height: 180,
    position: "relative" as const,
  },
  event: {
    alignItems: "center",
    borderLeft: "2px solid",
    bottom: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    paddingLeft: 6,
    position: "absolute" as const,
    top: 16,
  },
  eventDot: { borderRadius: "50%", height: 12, width: 12 },
  eventLabel: { fontSize: 12, transform: "rotate(-35deg)", transformOrigin: "left center", whiteSpace: "nowrap" as const },
  cards: { display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14 },
  card: { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 14 },
  cardTitle: { fontSize: 14, margin: "0 0 10px" },
  row: { display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0" },
  eventList: { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, marginTop: 14, padding: 16 },
  eventRow: { display: "grid", gap: 10, gridTemplateColumns: "64px 110px 1fr", padding: "6px 0" },
} satisfies Record<string, React.CSSProperties>;
