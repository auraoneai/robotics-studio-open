import type { StudioState } from "./contracts.js";
import { moveCursor, setSensorVisibility } from "./studio-state.js";

export interface Command {
  id: string;
  label: string;
  shortcut: string;
  run: (state: StudioState) => StudioState;
}

export const commands: Command[] = [
  command("open-dataset", "Open dataset", "Meta+O", (state) => ({ ...state, toast: "Dataset picker opened" })),
  command("toggle-palette", "Command palette", "Meta+K", (state) => ({ ...state, commandPaletteOpen: !state.commandPaletteOpen })),
  command("next-frame", "Next frame", "ArrowRight", (state) => advance(state, 1 / 60)),
  command("previous-frame", "Previous frame", "ArrowLeft", (state) => advance(state, -1 / 60)),
  command("next-segment", "Next action segment", "Shift+ArrowRight", (state) => advance(state, 1)),
  command("previous-segment", "Previous action segment", "Shift+ArrowLeft", (state) => advance(state, -1)),
  command("tag-intervention", "Tag intervention", "I", (state) => ({ ...state, toast: "Intervention tag side pane opened" })),
  command("tag-failure", "Tag failure mode", "F", (state) => ({ ...state, toast: "Failure taxonomy picker opened" })),
  command("add-anomaly-note", "Add anomaly note", "N", (state) => ({ ...state, toast: "Anomaly note editor opened" })),
  command("split-cluster", "Split cluster", "S", (state) => ({ ...state, toast: "Cluster split mode enabled" })),
  command("merge-clusters", "Merge clusters", "M", (state) => ({ ...state, toast: "Cluster merge mode enabled" })),
  command("run-vla-probe", "Run VLA probe", "P", (state) => ({ ...state, vlaProbe: { ...state.vlaProbe, status: "running", progress: 0.25 } })),
  command("export-local", "Export local reviewed subset", "Meta+E", (state) => ({ ...state, exportProgress: 0.5, toast: "Export started" })),
  command("export-hf", "Export to Hugging Face Hub", "Shift+Meta+H", (state) => ({ ...state, exportProgress: 0.5, toast: "Hugging Face export manifest prepared" })),
  command("send-auraone-intake", "Send AuraOne intake packet", "Shift+Meta+A", (state) => ({ ...state, toast: "Privacy preview opened" })),
  command("toggle-front-rgb", "Toggle front RGB panel", "1", (state) => toggleSensor(state, "front_rgb")),
  command("toggle-wrist-rgb", "Toggle wrist RGB panel", "2", (state) => toggleSensor(state, "wrist_rgb")),
  command("toggle-joints", "Toggle joint state panel", "3", (state) => toggleSensor(state, "joint_state")),
];

export function commandPaletteIndex(): Array<Pick<Command, "id" | "label" | "shortcut">> {
  return commands.map(({ id, label, shortcut }) => ({ id, label, shortcut }));
}

function command(id: string, label: string, shortcut: string, run: Command["run"]): Command {
  return { id, label, shortcut, run };
}

function advance(state: StudioState, deltaS: number): StudioState {
  const tab = state.tabs.find((candidate) => candidate.id === state.activeTabId);
  const episode = tab?.episodes.find((candidate) => candidate.episodeId === tab.selectedEpisodeId) ?? tab?.episodes[0];
  if (!episode) return state;
  return { ...state, timelineCursorS: moveCursor(episode, state.timelineCursorS, deltaS) };
}

function toggleSensor(state: StudioState, sensorName: string): StudioState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => {
      if (tab.id !== state.activeTabId) return tab;
      const sensor = tab.episodes.flatMap((episode) => episode.sensors).find((candidate) => candidate.name === sensorName);
      return setSensorVisibility(tab, sensorName, !(sensor?.visible ?? true));
    }),
  };
}
