import assert from "node:assert/strict";

import { commands, commandPaletteIndex } from "../src/commands.js";
import { renderStudio } from "../src/render.js";
import { sampleDatasetTab } from "../src/sample-data.js";
import { createInitialStudioState, filterEpisodes, moveCursor, virtualizedWindow } from "../src/studio-state.js";

const state = createInitialStudioState();
const firstRunStart = performance.now();
const firstRunState = createInitialStudioState();
const firstRunHtml = renderStudio(firstRunState);
const firstValueMs = performance.now() - firstRunStart;

assert.equal(state.tabs[0]?.indexedEpisodes, 96);
assert.equal(state.sensorQA.status, "fail");
assert.ok(state.clusters.some((cluster) => cluster.label.includes("gripper_slip")));
assert.ok(firstValueMs < 60000, `first-run sample tour took ${firstValueMs}ms`);
assert.ok(firstRunHtml.includes("so101_kitchen_v3"));
assert.ok(filterEpisodes(sampleDatasetTab.episodes, "success=false failure_modes:*").length > 0);
assert.deepEqual(virtualizedWindow([1, 2, 3, 4, 5], 0, 20, 40), [1, 2, 3, 4, 5]);
assert.equal(moveCursor(sampleDatasetTab.episodes[0]!, 0, -1), 0);
assert.equal(commandPaletteIndex().length, commands.length);
assert.ok(commandPaletteIndex().some((command) => command.id === "export-local"));
assert.ok(!commandPaletteIndex().some((command) => command.id === "send-auraone-intake"));
assert.ok(renderStudio(state).includes("Robotics Studio Open"));

const nextFrame = commands.find((command) => command.id === "next-frame");
assert.ok(nextFrame);
assert.ok(nextFrame.run(state).timelineCursorS > state.timelineCursorS);

console.log("robotics-studio-open smoke passed");
