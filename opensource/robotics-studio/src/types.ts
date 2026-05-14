export type DatasetFormat = "LeRobot v3" | "RLDS" | "OpenX" | "HDF5" | "ROS bag" | "mp4+jsonl";

export type ReviewStatus = "reviewed" | "unreviewed";

export type SensorQaStatus = "pass" | "warn" | "fail";

export type SuccessState = "success" | "failure" | "unknown";

export type ThemeMode = "dark" | "light";

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
  rateHz: number;
  visible: boolean;
  status: SensorQaStatus;
  samples: number[];
};

export type ActionPhase = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type Intervention = {
  id: string;
  start: number;
  end: number;
  why: "operator initiated" | "safety stop" | "detected anomaly" | "manual override" | "preplanned takeover";
  outcome: "task succeeded after intervention" | "task abandoned" | "partial success" | "restart";
  notes: string;
};

export type AnomalyNote = {
  id: string;
  sensorId: string;
  start: number;
  end: number;
  severity: "info" | "warn" | "error";
  note: string;
};

export type Episode = {
  id: string;
  task: string;
  duration: number;
  embodiment: string;
  success: SuccessState;
  reviewed: ReviewStatus;
  lengthFrames: number;
  interventionCount: number;
  taskTags: string[];
  date: string;
  failureCluster?: string;
  sensorQaStatus: SensorQaStatus;
  thumbnail: string;
  instruction: string;
  readiness: number;
  sensors: SensorStream[];
  phases: ActionPhase[];
  interventions: Intervention[];
  anomalies: AnomalyNote[];
  taxonomyTags: TaxonomyTag[];
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
  representativeEpisodeId: string;
  dominantTag: TaxonomyTag;
  readiness: number;
  homogeneity: number;
  trainingDecision: "training-ready" | "exclude from training" | "needs review";
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
