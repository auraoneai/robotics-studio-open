export type SensorKind = "rgb" | "depth" | "joint_state" | "action" | "audio" | "point_cloud" | "unknown";

export interface SensorStream {
  name: string;
  kind: SensorKind;
  sampleRateHz: number;
  path?: string;
  droppedFrames: number;
  calibrationError: number;
  avSyncMs: number;
  visible: boolean;
}

export interface Episode {
  episodeId: string;
  durationS: number;
  task: string;
  split: string;
  languageInstruction: string;
  success: boolean | null;
  embodiment: string;
  sensors: SensorStream[];
  markers: Array<{ startS: number; endS: number; label: string }>;
  interventions: Array<{ startS: number; endS: number; label: string }>;
  failureModes: string[];
  anomalyNotes: string[];
}

export interface DatasetTab {
  id: string;
  title: string;
  adapter: "lerobot" | "rlds" | "openx" | "hdf5" | "rosbag" | "folder-mp4-jsonl";
  path: string;
  indexedEpisodes: number;
  episodes: Episode[];
  savedFilters: SavedFilter[];
  selectedEpisodeId?: string;
}

export interface SavedFilter {
  id: string;
  label: string;
  query: string;
  sort: "episodeId" | "durationS" | "task" | "trainingReadiness";
}

export interface ReviewMarker {
  episodeId: string;
  startS: number;
  endS: number;
  label: string;
  kind: "phase" | "intervention" | "failure" | "anomaly";
}

export interface FailureCluster {
  clusterId: string;
  label: string;
  episodeIds: string[];
  representativeEpisodeId: string;
  strategy: "clip" | "custom-encoder" | "hash";
  trainingReadinessScore: number;
}

export interface VLAProbeRun {
  runId: string;
  policy: "mock" | "onnx" | "pytorch" | "huggingface";
  status: "idle" | "running" | "complete" | "error";
  progress: number;
  episodeScores: Array<{ episodeId: string; robustnessScore: number }>;
}

export interface SensorQAReport {
  status: "pass" | "fail";
  findings: Array<{ episodeId: string; sensor: string; check: string; value: number }>;
}

export type PluginPanelSlot = "episode-sidebar" | "dataset-sidebar" | "export-drawer" | "cluster-detail";

export interface PluginContribution {
  kind: "adapter" | "panel";
  id: string;
  title: string;
  entrypoint: string;
  formats?: string[];
  slot?: PluginPanelSlot;
  permissions: string[];
}

export interface PluginManifest {
  schema: "https://schemas.auraone.ai/robotics-studio/plugin-manifest/v1.json";
  plugin_id: string;
  name: string;
  version: string;
  api: "robostudio.plugin.v1";
  description: string;
  author: string;
  capabilities: string[];
  contributions: PluginContribution[];
}

export type CloudHandoffDestination = "Robotics Studio Cloud" | "Robotics Studio Enterprise" | "AuraOne Robotics Programs";

export interface CloudHandoffScenario {
  id: string;
  title: string;
  destination: CloudHandoffDestination;
  trigger: string;
  localAction: "export-intake-packet" | "share-reviewed-subset" | "request-managed-review";
  packetRoles: string[];
  privacyExclusions: string[];
  userConsent: "explicit-preview-required";
  cloudAcceptanceEvidence: string[];
  notIncludedInOpen: string[];
}

export interface StudioState {
  theme: "light" | "dark" | "system";
  telemetryOptIn: boolean;
  crashReportsOptIn: boolean;
  activeTabId?: string;
  tabs: DatasetTab[];
  commandPaletteOpen: boolean;
  timelineCursorS: number;
  compareEpisodeIds: string[];
  reviewMarkers: ReviewMarker[];
  clusters: FailureCluster[];
  vlaProbe: VLAProbeRun;
  sensorQA: SensorQAReport;
  exportProgress: number;
  toast?: string;
}
