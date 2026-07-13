import { datasets } from "./data.js";
import type { DatasetTab, Episode, SensorKind } from "./contracts.js";
import type { SensorStream as ActiveSensorStream } from "./types.js";

const fixture = datasets[0]!;

export const sampleEpisodes: Episode[] = fixture.episodes.map((episode) => ({
  episodeId: episode.id,
  durationS: episode.duration ?? 0,
  task: episode.task ?? "task unknown",
  split: "synthetic-fixture",
  languageInstruction: episode.instruction ?? "instruction unknown",
  success: episode.success === "success" ? true : episode.success === "failure" ? false : null,
  embodiment: episode.embodiment ?? "embodiment unknown",
  sensors: episode.sensors.map((sensor) => ({
    name: sensor.id,
    kind: legacySensorKind(sensor.kind),
    sampleRateHz: sensor.rateHz ?? 0,
    droppedFrames: sensor.qa.droppedFrames ?? 0,
    calibrationError: sensor.qa.calibrationError ?? 0,
    avSyncMs: sensor.qa.avSyncMs ?? 0,
    visible: sensor.visible,
  })),
  markers: episode.phases.flatMap((phase) =>
    phase.start === null || phase.end === null
      ? []
      : [{ startS: phase.start, endS: phase.end, label: phase.label }]
  ),
  interventions: episode.interventions.flatMap((intervention) =>
    intervention.start === null || intervention.end === null
      ? []
      : [{ startS: intervention.start, endS: intervention.end, label: intervention.why }]
  ),
  failureModes: episode.taxonomyTags,
  anomalyNotes: episode.anomalies.map((anomaly) => anomaly.note),
}));

export const sampleDatasetTab: DatasetTab = {
  id: fixture.id,
  title: fixture.name,
  adapter: "repository-fixture",
  path: fixture.root,
  indexedEpisodes: sampleEpisodes.length,
  episodes: sampleEpisodes,
  selectedEpisodeId: sampleEpisodes[0]?.episodeId,
  savedFilters: [
    {
      id: "failures",
      label: "Failures needing review",
      query: "success=false AND failure_modes:*",
      sort: "trainingReadiness",
    },
  ],
};

function legacySensorKind(kind: ActiveSensorStream["kind"]): SensorKind {
  if (kind === "rgb" || kind === "depth" || kind === "audio") return kind;
  if (kind === "joint") return "joint_state";
  return "unknown";
}
