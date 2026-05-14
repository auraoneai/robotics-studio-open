import type { DatasetTab, Episode } from "./contracts.js";

export const sampleEpisodes: Episode[] = [
  {
    episodeId: "so101-0001",
    durationS: 18.4,
    task: "kitchen-counter-pick-place",
    split: "train",
    languageInstruction: "Pick the mug from the counter and place it on the tray.",
    success: true,
    embodiment: "SO-101",
    sensors: [
      sensor("front_rgb", "rgb", 60),
      sensor("wrist_rgb", "rgb", 60),
      sensor("joint_state", "joint_state", 120),
    ],
    markers: [
      { startS: 0, endS: 4.2, label: "approach" },
      { startS: 4.2, endS: 10.1, label: "grasp" },
      { startS: 10.1, endS: 18.4, label: "place" },
    ],
    interventions: [],
    failureModes: [],
    anomalyNotes: [],
  },
  {
    episodeId: "so101-0002",
    durationS: 21.7,
    task: "kitchen-counter-pick-place",
    split: "train",
    languageInstruction: "Pick the mug from the counter and place it on the tray.",
    success: false,
    embodiment: "SO-101",
    sensors: [
      sensor("front_rgb", "rgb", 60, { droppedFrames: 12, avSyncMs: 55 }),
      sensor("wrist_rgb", "rgb", 60),
      sensor("joint_state", "joint_state", 120),
    ],
    markers: [
      { startS: 0, endS: 5.1, label: "approach" },
      { startS: 5.1, endS: 14, label: "grasp" },
      { startS: 14, endS: 21.7, label: "recovery" },
    ],
    interventions: [{ startS: 14, endS: 18.2, label: "operator_regrasp" }],
    failureModes: ["gripper_slip:glass"],
    anomalyNotes: ["Mug slips after wrist rotation."],
  },
  {
    episodeId: "so101-0003",
    durationS: 16.9,
    task: "kitchen-counter-pick-place",
    split: "train",
    languageInstruction: "Pick the mug from the counter and place it on the tray.",
    success: false,
    embodiment: "SO-101",
    sensors: [
      sensor("front_rgb", "rgb", 60, { calibrationError: 0.04 }),
      sensor("wrist_rgb", "rgb", 60),
      sensor("joint_state", "joint_state", 120),
    ],
    markers: [
      { startS: 0, endS: 6, label: "approach" },
      { startS: 6, endS: 16.9, label: "failed_grasp" },
    ],
    interventions: [{ startS: 12.4, endS: 15.1, label: "operator_abort" }],
    failureModes: ["pick_from_bin:occlusion"],
    anomalyNotes: ["Front camera calibration drift pushes grasp target off object."],
  },
];

export const sampleDatasetTab: DatasetTab = {
  id: "sample-so101",
  title: "SO-101 kitchen counter",
  adapter: "lerobot",
  path: "fixtures/sample-so101",
  indexedEpisodes: sampleEpisodes.length,
  episodes: sampleEpisodes,
  selectedEpisodeId: "so101-0002",
  savedFilters: [
    {
      id: "failures",
      label: "Failures needing review",
      query: "success=false AND failure_modes:*",
      sort: "trainingReadiness",
    },
  ],
};

function sensor(
  name: string,
  kind: "rgb" | "joint_state",
  sampleRateHz: number,
  overrides: Partial<{ droppedFrames: number; calibrationError: number; avSyncMs: number }> = {},
) {
  return {
    name,
    kind,
    sampleRateHz,
    path: kind === "rgb" ? `${name}.mp4` : undefined,
    droppedFrames: overrides.droppedFrames ?? 0,
    calibrationError: overrides.calibrationError ?? 0,
    avSyncMs: overrides.avSyncMs ?? 0,
    visible: true,
  };
}
