import assert from "node:assert/strict";

import { commands, commandPaletteIndex } from "../src/commands.js";
import { renderStudio } from "../src/render.js";
import { createInitialStudioState } from "../src/studio-state.js";

const html = renderStudio(createInitialStudioState());

for (const label of [
  "Datasets",
  "Command palette",
  "Virtualized episode grid",
  "Episode scrubber",
  "Sensor streams",
  "Failure clusters",
  "Sensor QA",
  "VLA probe",
]) {
  assert.match(html, new RegExp(`aria-label="${label}"`), `missing aria-label: ${label}`);
}

assert.match(html, /<section role="status">|aria-label="Virtualized episode grid"/, "empty or grid state must be announced");
assert.match(html, /<progress value="\d+" max="100">/, "scrubber must expose progress value");
assert.match(html, /<progress value="[^"]+" max="1"><\/progress>/, "VLA probe must expose progress value");

const indexedCommands = commandPaletteIndex();
assert.equal(indexedCommands.length, commands.length, "command palette must include every command");

for (const command of indexedCommands) {
  assert.ok(command.shortcut.length > 0, `${command.id} is missing a keyboard shortcut`);
  assert.ok(html.includes(`data-command="${command.id}"`), `${command.id} missing from rendered command palette`);
  assert.ok(html.includes(`<kbd>${command.shortcut}</kbd>`), `${command.id} shortcut missing from rendered command palette`);
}

const unlabeledButtons = Array.from(html.matchAll(/<button(?:\s[^>]*)?>(.*?)<\/button>/gs)).filter(([, content]) => {
  return content.replace(/<[^>]+>/g, "").trim().length === 0;
});

assert.equal(unlabeledButtons.length, 0, "all rendered buttons must have accessible text");

console.log("robotics-studio-open accessibility smoke passed");
