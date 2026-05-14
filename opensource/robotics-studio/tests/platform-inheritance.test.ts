import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const platformConstants = readFileSync(
  new URL("../../open-studio-platform/packages/platform-contracts/src/constants.ts", import.meta.url),
  "utf8",
);
const platformIntake = readFileSync(
  new URL("../../open-studio-platform/packages/platform-contracts/src/intake.ts", import.meta.url),
  "utf8",
);
const platformTelemetry = readFileSync(
  new URL("../../open-studio-platform/packages/platform-contracts/src/telemetry.ts", import.meta.url),
  "utf8",
);
const platformKeychain = readFileSync(
  new URL("../../open-studio-platform/packages/platform-contracts/src/keychain.ts", import.meta.url),
  "utf8",
);
const platformCrash = readFileSync(
  new URL("../../open-studio-platform/packages/platform-contracts/src/crash.ts", import.meta.url),
  "utf8",
);
const platformRobotics = readFileSync(
  new URL("../../open-studio-platform/packages/platform-contracts/src/robotics.ts", import.meta.url),
  "utf8",
);
const tauriCore = readFileSync(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");
const telemetrySchema = JSON.parse(
  readFileSync(new URL("../../open-studio-platform/schemas/telemetry.schema.json", import.meta.url), "utf8"),
) as { properties: { app: { properties: { flagship: { enum: string[] } } } } };
const telemetryEvents = JSON.parse(
  readFileSync(new URL("../../open-studio-platform/schemas/telemetry-events.json", import.meta.url), "utf8"),
) as { events: Array<{ name: string; owner: string }> };
const intakeSchema = JSON.parse(
  readFileSync(new URL("../../open-studio-platform/schemas/intake-packet.schema.json", import.meta.url), "utf8"),
) as { properties: { product: { enum: string[] } } };
const studioState = readFileSync(new URL("../src/studio-state.ts", import.meta.url), "utf8");
const tauriConfig = JSON.parse(
  readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
) as {
  identifier: string;
  app: { security: { csp: string; capabilities: string[] } };
  plugins: { updater: { endpoints: string[] }; "deep-link": { desktop: { schemes: string[] } } };
};

const canonicalCsp = platformConstants.match(/export const CANONICAL_CSP =\n  "([^"]+)";/)?.[1];
if (!canonicalCsp) {
  throw new Error("Unable to read CANONICAL_CSP from Open Studio Platform contracts");
}

assert.equal(tauriConfig.app.security.csp, canonicalCsp);
assert.equal(tauriConfig.identifier, "ai.auraone.roboticsstudio");
assert.deepEqual(tauriConfig.app.security.capabilities, ["default"]);
assert.deepEqual(tauriConfig.plugins["deep-link"].desktop.schemes, ["auraone"]);
assert.deepEqual(tauriConfig.plugins.updater.endpoints, [
  "https://updates.auraone.ai/robotics-studio-open/{{target}}/{{arch}}/{{current_version}}",
  "https://updates2.auraone.ai/robotics-studio-open/{{target}}/{{arch}}/{{current_version}}",
]);
assert.ok(telemetrySchema.properties.app.properties.flagship.enum.includes("robotics-studio-open"));
assert.ok(intakeSchema.properties.product.enum.includes("robotics-studio-open"));
assert.match(platformCrash, /defaultCrashReporterConfig/);
assert.match(platformCrash, /enabled:\s*false/);
assert.match(platformCrash, /scrubPaths:\s*true/);
assert.match(platformCrash, /scrubApiKeys:\s*true/);
assert.match(platformKeychain, /'huggingface-token'/);
assert.match(platformKeychain, /'auraone-cloud-token'/);
assert.match(studioState, /telemetryOptIn:\s*false/);
assert.match(studioState, /crashReportsOptIn:\s*false/);

for (const event of ["robotics_dataset_opened", "robotics_feature_used", "robotics_export_completed"]) {
  assert.ok(
    telemetryEvents.events.some((entry) => entry.name === event && entry.owner === "robotics-studio-open"),
    `missing Robotics telemetry event: ${event}`,
  );
  assert.match(platformTelemetry, new RegExp(event));
}

for (const role of [
  "robotics_reviewed_subset_manifest",
  "robotics_episode_reference",
  "robotics_failure_cluster",
  "robotics_intervention_note",
  "robotics_embodiment_card",
  "robotics_sensor_qa_report",
]) {
  assert.match(platformIntake, new RegExp(`'${role}'`));
  assert.match(tauriCore, new RegExp(`"${role}"`));
}

for (const hook of [
  "video.decode.videotoolbox",
  "dataset.stream.chunked_ipc",
  "dataset.stream.sqlite_sidecar_index",
  "ros.rosbag2_sqlite",
]) {
  assert.match(platformRobotics, new RegExp(`'${hook.replaceAll(".", "\\.")}'`));
}

console.log("robotics-studio-open platform inheritance checks passed");
