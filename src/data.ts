import type { Cluster, CommandId, DatasetTab, Episode, ProbeTrial, SensorStream, TaxonomyTag } from "./types";

const taxonomyTags: TaxonomyTag[] = [
  "manipulation:grasp:slip:gripper_slip:glass",
  "manipulation:grasp:miss:occlusion",
  "navigation:collision:table_edge",
  "perception:calibration:camera_drift",
  "planning:sequence:wrong_phase",
  "org:custom:needs_second_pass",
];

const sensorTemplate: SensorStream[] = [
  { id: "cam-front", label: "RGB cam_front", kind: "rgb", rateHz: 30, visible: true, status: "pass", samples: [12, 24, 36, 48, 60] },
  { id: "cam-wrist", label: "RGB cam_wrist", kind: "rgb", rateHz: 30, visible: true, status: "warn", samples: [14, 19, 33, 52, 58] },
  { id: "depth-top", label: "Depth cam_top", kind: "depth", rateHz: 15, visible: true, status: "pass", samples: [4, 12, 21, 28, 35] },
  { id: "joint-state", label: "Joint state", kind: "joint", rateHz: 200, visible: true, status: "pass", samples: [0.1, 0.4, 0.2, -0.1, 0.5] },
  { id: "force-torque", label: "Force / torque", kind: "force", rateHz: 1000, visible: false, status: "warn", samples: [3, 5, 8, 7, 9] },
  { id: "language", label: "Language instruction", kind: "language", rateHz: 1, visible: true, status: "pass", samples: [1] },
];

export const commands: Array<{ id: CommandId; title: string; key: string; group: string }> = [
  { id: "open-dataset", title: "Open dataset", key: "Cmd/Ctrl O", group: "Dataset" },
  { id: "quick-switch", title: "Quick switch dataset", key: "Cmd/Ctrl P", group: "Dataset" },
  { id: "next-episode", title: "Next episode", key: "J", group: "Scrubber" },
  { id: "previous-episode", title: "Previous episode", key: "K", group: "Scrubber" },
  { id: "toggle-play", title: "Toggle play", key: "Space", group: "Scrubber" },
  { id: "frame-back", title: "Frame -1", key: "Left", group: "Scrubber" },
  { id: "frame-forward", title: "Frame +1", key: "Right", group: "Scrubber" },
  { id: "tag-picker", title: "Open taxonomy picker", key: "T", group: "Review" },
  { id: "toggle-reviewed", title: "Toggle review status", key: "R", group: "Review" },
  { id: "mark-success", title: "Mark success", key: "S", group: "Review" },
  { id: "mark-failure", title: "Mark failure", key: "F", group: "Review" },
  { id: "add-phase", title: "Add phase boundary", key: "B", group: "Review" },
  { id: "clusters", title: "Open cluster view", key: "C", group: "Failure intelligence" },
  { id: "probe", title: "Open VLA probe", key: "V", group: "Probe" },
  { id: "qa", title: "Open sensor QA", key: "Q", group: "Quality" },
  { id: "export", title: "Export", key: "Shift Cmd/Ctrl E", group: "Export" },
  { id: "programs-intake", title: "Send to AuraOne Programs", key: "Shift Cmd/Ctrl A", group: "Export" },
  { id: "save-view", title: "Save filtered view", key: "Cmd/Ctrl Shift V", group: "Dataset" },
];

export function createEpisode(index: number, datasetName = "so101_kitchen_v3"): Episode {
  const clusterId = `cluster-${(index % 6) + 1}`;
  const interventionCount = index % 5;
  const success = index % 7 === 0 ? "failure" : index % 5 === 0 ? "unknown" : "success";
  const sensorQaStatus = index % 11 === 0 ? "fail" : index % 4 === 0 ? "warn" : "pass";
  const task = ["pick_apple_v2", "wipe_counter", "open_drawer", "place_cup", "sort_blocks"][index % 5];
  const duration = 12 + (index % 18) + (index % 4) * 0.25;
  const tag = taxonomyTags[index % taxonomyTags.length];

  return {
    id: `${datasetName}-ep-${String(index + 1).padStart(5, "0")}`,
    task,
    duration,
    embodiment: index % 3 === 0 ? "SO-101" : index % 3 === 1 ? "ALOHA" : "RoboMimic",
    success,
    reviewed: index % 3 === 0 ? "reviewed" : "unreviewed",
    lengthFrames: Math.round(duration * 30),
    interventionCount,
    taskTags: [task.split("_")[0], index % 2 === 0 ? "kitchen" : "bench"],
    date: `2026-05-${String((index % 12) + 1).padStart(2, "0")}`,
    failureCluster: success === "failure" || interventionCount > 2 ? clusterId : undefined,
    sensorQaStatus,
    thumbnail: gradientFor(index),
    instruction: `Perform ${task.replaceAll("_", " ")} with stable wrist camera alignment.`,
    readiness: Math.max(28, 96 - interventionCount * 8 - (sensorQaStatus === "fail" ? 28 : sensorQaStatus === "warn" ? 12 : 0)),
    sensors: sensorTemplate.map((sensor, sensorIndex) => ({
      ...sensor,
      visible: sensor.visible || sensorIndex === index % sensorTemplate.length,
      status: sensorIndex === 1 && sensorQaStatus !== "pass" ? sensorQaStatus : sensor.status,
      samples: sensor.samples.map((sample, sampleIndex) => Number((sample + index * 0.06 + sampleIndex * 0.03).toFixed(2))),
    })),
    phases: [
      { id: "approach", label: "approach", start: 0, end: duration * 0.18 },
      { id: "align", label: "align", start: duration * 0.18, end: duration * 0.34 },
      { id: "grasp", label: "grasp", start: duration * 0.34, end: duration * 0.48 },
      { id: "transport", label: "transport", start: duration * 0.48, end: duration * 0.78 },
      { id: "place", label: "place", start: duration * 0.78, end: duration },
    ],
    interventions: Array.from({ length: interventionCount }, (_, interventionIndex) => ({
      id: `int-${index}-${interventionIndex}`,
      start: Number((2 + interventionIndex * 2.4).toFixed(2)),
      end: Number((2.7 + interventionIndex * 2.4).toFixed(2)),
      why: interventionIndex % 2 === 0 ? "detected anomaly" : "manual override",
      outcome: interventionIndex % 2 === 0 ? "task succeeded after intervention" : "partial success",
      notes: "Boundary is editable and exports through the ReviewKit teleop episode schema.",
    })),
    anomalies: [
      {
        id: `note-${index}`,
        sensorId: index % 4 === 0 ? "cam-wrist" : "joint-state",
        start: duration * 0.4,
        end: duration * 0.5,
        severity: sensorQaStatus === "fail" ? "error" : sensorQaStatus === "warn" ? "warn" : "info",
        note: sensorQaStatus === "fail" ? "Dropped frames exceed configured threshold." : "Reviewer note for sensor alignment.",
      },
    ],
    taxonomyTags: success === "failure" ? [tag] : index % 6 === 0 ? ["org:custom:needs_second_pass"] : [],
  };
}

export const datasets: DatasetTab[] = [
  {
    id: "so101",
    name: "so101_kitchen_v3",
    root: "~/datasets/so101_kitchen_v3",
    format: "LeRobot v3",
    episodes: Array.from({ length: 96 }, (_, index) => createEpisode(index)),
    indexed: 12847,
    totalEstimate: 12847,
    status: "ready",
    lastSaved: "2s ago",
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
  {
    id: "sim",
    name: "sim_rollout_policy_b",
    root: "~/datasets/sim_rollout_policy_b",
    format: "RLDS",
    episodes: Array.from({ length: 64 }, (_, index) => createEpisode(index, "sim_policy_b")),
    indexed: 4300,
    totalEstimate: 4300,
    status: "ready",
    lastSaved: "14s ago",
    savedViews: [],
  },
  {
    id: "hdf5",
    name: "aloha_bin_pick_hdf5",
    root: "~/datasets/aloha_bin_pick_hdf5",
    format: "HDF5",
    episodes: Array.from({ length: 44 }, (_, index) => createEpisode(index, "aloha_hdf5")),
    indexed: 1832,
    totalEstimate: 1832,
    status: "loading",
    lastSaved: "1m ago",
    savedViews: [],
  },
];

export const clusters: Cluster[] = [
  {
    id: "cluster-1",
    title: "gripper slip on glossy objects",
    size: 47,
    representativeEpisodeId: "so101_kitchen_v3-ep-00007",
    dominantTag: "manipulation:grasp:slip:gripper_slip:glass",
    readiness: 61,
    homogeneity: 0.88,
    trainingDecision: "needs review",
  },
  {
    id: "cluster-2",
    title: "wrist-camera occlusion during approach",
    size: 31,
    representativeEpisodeId: "so101_kitchen_v3-ep-00013",
    dominantTag: "manipulation:grasp:miss:occlusion",
    readiness: 72,
    homogeneity: 0.81,
    trainingDecision: "training-ready",
  },
  {
    id: "cluster-3",
    title: "phase-order mismatch after manual reset",
    size: 18,
    representativeEpisodeId: "so101_kitchen_v3-ep-00021",
    dominantTag: "planning:sequence:wrong_phase",
    readiness: 43,
    homogeneity: 0.74,
    trainingDecision: "exclude from training",
  },
];

export const probeTrials: ProbeTrial[] = [
  { id: "trial-001", perturbation: "language", description: "Replace direct instruction with paraphrase", status: "pass", latencyMs: 42 },
  { id: "trial-002", perturbation: "vision", description: "Apply 40 lux lighting drop", status: "fail", latencyMs: 58 },
  { id: "trial-003", perturbation: "embodiment", description: "Perturb gripper width metadata by +8%", status: "running", latencyMs: 61 },
  { id: "trial-004", perturbation: "task-phase", description: "Swap align and approach phase labels", status: "queued", latencyMs: 0 },
];

function gradientFor(index: number): string {
  const hue = (index * 47) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 38%), hsl(${(hue + 82) % 360} 72% 28%))`;
}
