export type DatasetFormat =
  | "LeRobot v3 metadata"
  | "RLDS metadata"
  | "OpenX metadata"
  | "JSON manifest"
  | "JSONL episodes";

export type DatasetProvenanceKind =
  | "repository-synthetic-fixture"
  | "imported-local-manifest"
  | "metadata-only";

export type DatasetProvenance = {
  kind: DatasetProvenanceKind;
  label: string;
  source: string;
  recordCount: number;
  files: string[];
  limitations: string[];
  seedSceneCount?: number;
};

export type ReviewStatus = "reviewed" | "unreviewed" | "unknown";

export type SensorQaStatus = "pass" | "warn" | "fail" | "unknown";

export type SuccessState = "success" | "failure" | "unknown";

export type Density = "comfortable" | "compact" | "ultra";

export type ViewMode = "browse" | "scrub" | "clusters" | "compare" | "probe" | "qa" | "export" | "settings";

export type TaxonomyTag =
  | "manipulation:grasp:slip:gripper_slip:glass"
  | "manipulation:grasp:miss:occlusion"
  | "navigation:collision:table_edge"
  | "perception:calibration:camera_drift"
  | "planning:sequence:wrong_phase"
  | "org:custom:needs_second_pass";

export type SensorStream = {
  id: string;
  label: string;
  kind: "rgb" | "depth" | "joint" | "pose" | "force" | "audio" | "language" | "custom";
  rateHz: number | null;
  visible: boolean;
  status: SensorQaStatus;
  samples: number[];
  qa: {
    droppedFrames?: number;
    expectedFrames?: number;
    avSyncMs?: number;
    calibrationError?: number;
  };
};

export type ActionPhase = {
  id: string;
  label: string;
  start: number | null;
  end: number | null;
};

export type Intervention = {
  id: string;
  start: number | null;
  end: number | null;
  why: string;
  outcome: string;
  notes: string;
};

export type AnomalyNote = {
  id: string;
  sensorId: string;
  start: number | null;
  end: number | null;
  severity: "info" | "warn" | "error";
  note: string;
};

export type Episode = {
  id: string;
  task: string | null;
  duration: number | null;
  frameRateHz: number | null;
  embodiment: string | null;
  success: SuccessState;
  reviewed: ReviewStatus;
  lengthFrames: number | null;
  interventionCount: number | null;
  taskTags: string[];
  date: string | null;
  failureCluster?: string;
  sensorQaStatus: SensorQaStatus;
  instruction: string | null;
  readiness: number | null;
  sensors: SensorStream[];
  phases: ActionPhase[];
  interventions: Intervention[];
  anomalies: AnomalyNote[];
  taxonomyTags: string[];
  provenance: DatasetProvenanceKind;
  sourceSeedId?: string;
  availableFields: string[];
};

export type DatasetTab = {
  id: string;
  name: string;
  root: string;
  format: DatasetFormat;
  episodes: Episode[];
  savedViews: SavedView[];
  indexed: number;
  totalEstimate: number;
  status: "ready" | "loading" | "error" | "empty";
  error?: string;
  lastSaved: string;
  provenance: DatasetProvenance;
  declaredFormat?: string;
};

export type SavedView = {
  id: string;
  name: string;
  filters: FilterState;
  sort: SortState;
};

export type FilterState = {
  success: "all" | SuccessState;
  reviewed: "all" | ReviewStatus;
  qa: "all" | SensorQaStatus;
  embodiment: "all" | string;
  taskTag: "all" | string;
  cluster: "all" | string;
  minInterventions: number;
  maxLength: number;
  query: string;
};

export type SortField =
  | "id"
  | "task"
  | "duration"
  | "interventionCount"
  | "success"
  | "reviewed"
  | "sensorQaStatus"
  | "readiness"
  | "date";

export type SortState = {
  field: SortField;
  direction: "asc" | "desc";
};

export type Cluster = {
  id: string;
  title: string;
  size: number;
  episodeIds: string[];
  representativeEpisodeId: string;
  dominantTag: string | null;
  readiness: number | null;
  homogeneity: number | null;
  trainingDecision: "training-ready" | "exclude from training" | "needs review" | "unknown";
};

export type ProbeTrial = {
  id: string;
  perturbation: "language" | "vision" | "embodiment" | "task-phase";
  description: string;
  status: "queued" | "running" | "pass" | "fail";
  latencyMs: number;
};

export type ExportTarget = "HF Hub" | "Local disk" | "Embodiment card" | "Failure gallery" | "AuraOne Programs";

export type CommandId =
  | "open-dataset"
  | "quick-switch"
  | "next-episode"
  | "previous-episode"
  | "toggle-play"
  | "frame-back"
  | "frame-forward"
  | "tag-picker"
  | "toggle-reviewed"
  | "mark-success"
  | "mark-failure"
  | "add-phase"
  | "clusters"
  | "probe"
  | "qa"
  | "export"
  | "programs-intake"
  | "save-view";
