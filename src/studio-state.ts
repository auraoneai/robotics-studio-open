import type { DatasetTab, Episode, FailureCluster, SensorQAReport, StudioState } from "./contracts.js";
import { sampleDatasetTab } from "./sample-data.js";

export function createInitialStudioState(tab: DatasetTab = sampleDatasetTab): StudioState {
  const selected = tab.episodes.find((episode) => episode.episodeId === tab.selectedEpisodeId) ?? tab.episodes[0];
  return {
    theme: "system",
    localDiagnosticBufferEnabled: false,
    crashReportsOptIn: false,
    activeTabId: tab.id,
    tabs: [tab],
    commandPaletteOpen: false,
    timelineCursorS: selected ? Math.min(1, selected.durationS) : 0,
    compareEpisodeIds: tab.episodes.slice(0, 2).map((episode) => episode.episodeId),
    reviewMarkers: tab.episodes.flatMap((episode) => [
      ...episode.markers.map((marker) => ({ episodeId: episode.episodeId, kind: "phase" as const, ...marker })),
      ...episode.interventions.map((marker) => ({
        episodeId: episode.episodeId,
        kind: "intervention" as const,
        ...marker,
      })),
    ]),
    clusters: clusterEpisodes(tab.episodes),
    vlaProbe: {
      runId: "mock-probe",
      policy: "mock",
      status: "complete",
      progress: 1,
      episodeScores: tab.episodes.map((episode) => ({
        episodeId: episode.episodeId,
        robustnessScore: episode.success ? 0.97 : 0.7,
      })),
    },
    sensorQA: buildSensorQA(tab.episodes),
    exportProgress: 0,
  };
}

export function filterEpisodes(episodes: Episode[], query: string): Episode[] {
  if (!query.trim()) return episodes;
  const normalized = query.toLowerCase();
  return episodes.filter((episode) => {
    const haystack = [
      episode.episodeId,
      episode.task,
      episode.embodiment,
      episode.languageInstruction,
      String(episode.success),
      ...episode.failureModes,
      ...episode.anomalyNotes,
    ]
      .join(" ")
      .toLowerCase();
    return normalized
      .replaceAll("and", " ")
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => {
        if (token === "success=false") return episode.success === false;
        if (token === "success=true") return episode.success === true;
        if (token === "failure_modes:*") return episode.failureModes.length > 0;
        return haystack.includes(token.replaceAll(":", " "));
      });
  });
}

export function virtualizedWindow<T>(items: T[], scrollTop: number, rowHeight: number, viewportHeight: number): T[] {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 3);
  const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 3);
  return items.slice(start, end);
}

export function moveCursor(episode: Episode, cursorS: number, deltaS: number): number {
  return Math.min(episode.durationS, Math.max(0, cursorS + deltaS));
}

export function setSensorVisibility(tab: DatasetTab, sensorName: string, visible: boolean): DatasetTab {
  return {
    ...tab,
    episodes: tab.episodes.map((episode) => ({
      ...episode,
      sensors: episode.sensors.map((sensor) => (sensor.name === sensorName ? { ...sensor, visible } : sensor)),
    })),
  };
}

function clusterEpisodes(episodes: Episode[]): FailureCluster[] {
  const groups = new Map<string, Episode[]>();
  for (const episode of episodes) {
    const label = episode.failureModes[0] ?? (episode.success ? "success" : "unlabeled");
    groups.set(label, [...(groups.get(label) ?? []), episode]);
  }
  return [...groups.entries()].map(([label, group], index) => ({
    clusterId: `cluster-${index + 1}`,
    label,
    episodeIds: group.map((episode) => episode.episodeId),
    representativeEpisodeId: group[0]?.episodeId ?? "unknown",
    strategy: "deterministic-fields",
    trainingReadinessScore: Number((group.length / Math.max(1, episodes.length)).toFixed(3)),
  }));
}

function buildSensorQA(episodes: Episode[]): SensorQAReport {
  const findings = episodes.flatMap((episode) =>
    episode.sensors.flatMap((sensor) => {
      const rows: SensorQAReport["findings"] = [];
      if (sensor.droppedFrames) rows.push({ episodeId: episode.episodeId, sensor: sensor.name, check: "dropped_frames", value: sensor.droppedFrames });
      if (Math.abs(sensor.avSyncMs) > 40) rows.push({ episodeId: episode.episodeId, sensor: sensor.name, check: "av_sync", value: sensor.avSyncMs });
      if (sensor.calibrationError > 0.02) rows.push({ episodeId: episode.episodeId, sensor: sensor.name, check: "calibration_drift", value: sensor.calibrationError });
      return rows;
    }),
  );
  return { status: findings.length ? "fail" : "pass", findings };
}
