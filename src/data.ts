import fixtureManifestJson from "../fixtures/sample-so101/manifest.json";
import { normalizeEpisodeRecord } from "./episodeParsing";
import type { CommandId, DatasetTab, ProbeTrial } from "./types";

type FixtureManifestDocument = {
  schema: string;
  name: string;
  format: string;
  provenance: string;
  meta: {
    fixture_record_count: number;
    seed_scene_count: number;
    control_rate_hz: number;
    sensor_rates_hz: Record<string, number>;
  };
  episodes: unknown[];
};

const fixtureManifest = fixtureManifestJson as FixtureManifestDocument;

if (
  fixtureManifest.schema !== "auraone.robotics.dataset-manifest.v1"
  || fixtureManifest.provenance !== "repository-synthetic-fixture"
  || fixtureManifest.meta.fixture_record_count !== 96
  || fixtureManifest.meta.seed_scene_count !== 3
  || fixtureManifest.episodes.length !== 96
) {
  throw new Error("The bundled SO-101 fixture manifest is stale or incomplete.");
}

const fixtureEpisodes = fixtureManifest.episodes.map((record, index) =>
  normalizeEpisodeRecord(record, index, {
    datasetName: fixtureManifest.name,
    provenance: "repository-synthetic-fixture",
  }),
);

if (
  fixtureEpisodes.some((episode) => episode.frameRateHz !== fixtureManifest.meta.control_rate_hz)
  || fixtureEpisodes.some((episode) => episode.provenance !== "repository-synthetic-fixture")
) {
  throw new Error("The bundled SO-101 fixture does not match its declared control rate or provenance.");
}

export const commands: Array<{ id: CommandId; title: string; key: string; group: string }> = [
  { id: "open-dataset", title: "Open JSON dataset", key: "Cmd/Ctrl O", group: "Dataset" },
  { id: "quick-switch", title: "Quick switch dataset", key: "Cmd/Ctrl P", group: "Dataset" },
  { id: "next-episode", title: "Next episode", key: "J", group: "Scrubber" },
  { id: "previous-episode", title: "Previous episode", key: "K", group: "Scrubber" },
  { id: "toggle-play", title: "Toggle play", key: "Space", group: "Scrubber" },
  { id: "frame-back", title: "Frame -1", key: "Left", group: "Scrubber" },
  { id: "frame-forward", title: "Frame +1", key: "Right", group: "Scrubber" },
  { id: "tag-picker", title: "Apply second-pass tag", key: "T", group: "Review" },
  { id: "toggle-reviewed", title: "Toggle review status", key: "R", group: "Review" },
  { id: "mark-success", title: "Mark success", key: "S", group: "Review" },
  { id: "mark-failure", title: "Mark failure", key: "F", group: "Review" },
  { id: "add-phase", title: "Add phase boundary", key: "B", group: "Review" },
  { id: "clusters", title: "Open cluster view", key: "C", group: "Failure intelligence" },
  { id: "probe", title: "Open deterministic probe", key: "V", group: "Probe" },
  { id: "qa", title: "Open sensor QA", key: "Q", group: "Quality" },
  { id: "export", title: "Export local archive", key: "Shift Cmd/Ctrl E", group: "Export" },
  { id: "programs-intake", title: "Inspect blocked network destination", key: "Shift Cmd/Ctrl A", group: "Export" },
  { id: "save-view", title: "Save filtered view", key: "Cmd/Ctrl Shift V", group: "Dataset" },
];

export const datasets: DatasetTab[] = [
  {
    id: "so101",
    name: fixtureManifest.name,
    root: "fixtures/sample-so101/manifest.json",
    format: "LeRobot v3 metadata",
    declaredFormat: fixtureManifest.format,
    episodes: fixtureEpisodes,
    indexed: fixtureEpisodes.length,
    totalEstimate: fixtureEpisodes.length,
    status: "ready",
    lastSaved: "repository fixture",
    provenance: {
      kind: "repository-synthetic-fixture",
      label: "Repository synthetic fixture",
      source: "fixtures/sample-so101/manifest.json",
      recordCount: fixtureEpisodes.length,
      seedSceneCount: fixtureManifest.meta.seed_scene_count,
      files: [
        "fixtures/sample-so101/seeds.json",
        "fixtures/sample-so101/meta.json",
        "fixtures/sample-so101/manifest.json",
        "fixtures/sample-so101/episodes.jsonl",
      ],
      limitations: [
        "Synthetic metadata and deterministic data visualizations only",
        "No real robot media",
        "No binary dataset adapter",
      ],
    },
    savedViews: [
      {
        id: "second-pass",
        name: "Second-pass review",
        filters: {
          success: "failure",
          reviewed: "all",
          qa: "all",
          embodiment: "all",
          taskTag: "all",
          cluster: "all",
          minInterventions: 1,
          maxLength: 999,
          query: "",
        },
        sort: { field: "readiness", direction: "asc" },
      },
    ],
  },
];

export const probeTrials: ProbeTrial[] = [
  { id: "trial-001", perturbation: "language", description: "Replace direct instruction with a deterministic paraphrase", status: "queued", latencyMs: 0 },
  { id: "trial-002", perturbation: "vision", description: "Apply a deterministic low-light metadata condition", status: "queued", latencyMs: 0 },
  { id: "trial-003", perturbation: "embodiment", description: "Perturb declared gripper width metadata by eight percent", status: "queued", latencyMs: 0 },
  { id: "trial-004", perturbation: "task-phase", description: "Swap align and approach phase labels in the mock input", status: "queued", latencyMs: 0 },
];

export const fixtureContract = {
  recordCount: fixtureManifest.meta.fixture_record_count,
  seedSceneCount: fixtureManifest.meta.seed_scene_count,
  controlRateHz: fixtureManifest.meta.control_rate_hz,
  sensorRatesHz: fixtureManifest.meta.sensor_rates_hz,
};
