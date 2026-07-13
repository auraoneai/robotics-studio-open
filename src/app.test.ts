import { datasets } from "./data";
import type { CloudHandoffScenario, PluginManifest } from "./contracts";
import {
  buildVirtualWindow,
  cloudHandoffScenarios,
  defaultFilters,
  defaultSort,
  exportManifest,
  filterEpisodes,
  formatTime,
  visibleEpisodes,
} from "./core";

const [dataset] = datasets;
const failures = filterEpisodes(dataset.episodes, { ...defaultFilters, success: "failure", minInterventions: 1 });
if (failures.length === 0 || failures.some((episode) => episode.success !== "failure")) {
  throw new Error("failure filter did not return only failure episodes");
}

const sorted = visibleEpisodes(dataset.episodes, defaultFilters, defaultSort);
if (
  sorted[0]?.readiness !== null
  && sorted[0]?.readiness !== undefined
  && sorted.at(-1)?.readiness !== null
  && sorted.at(-1)?.readiness !== undefined
  && sorted[0].readiness > sorted.at(-1)!.readiness!
) {
  throw new Error("default readiness sort must be ascending");
}

const windowed = buildVirtualWindow(sorted, 10, 12);
if (windowed.length !== 12 || windowed[0] !== sorted[10]) {
  throw new Error("virtual window did not preserve offset and size");
}

const manifest = exportManifest(dataset, failures.slice(0, 3), "AuraOne Programs");
if (
  manifest.product !== "Robotics Studio Open" ||
  !manifest.payloads.includes("robotics_reviewed_subset_manifest") ||
  !manifest.payloads.includes("robotics_sensor_qa_report")
) {
  throw new Error("export manifest must include Robotics Studio Open intake payload");
}

if (formatTime(64.25) !== "01:04.25") {
  throw new Error("formatTime should emit mm:ss.cc");
}

const pluginManifest: PluginManifest = {
  schema: "https://schemas.auraone.ai/robotics-studio/plugin-manifest/v1.json",
  plugin_id: "ai.auraone.robostudio.plugins.local_metadata_panel",
  name: "Local Metadata Panel Example",
  version: "0.1.0",
  api: "robostudio.plugin.v1",
  description: "Example panel plugin",
  author: "AuraOne",
  capabilities: ["local-only"],
  contributions: [
    {
      kind: "panel",
      id: "force-drift-panel",
      title: "Force drift panel",
      entrypoint: "panel.tsx",
      slot: "episode-sidebar",
      permissions: ["read:episode", "read:sensor-summary"],
    },
  ],
};

if (pluginManifest.contributions[0].slot !== "episode-sidebar") {
  throw new Error("plugin panel slot contract must preserve episode-sidebar");
}

const destinations = new Set(cloudHandoffScenarios.map((scenario: CloudHandoffScenario) => scenario.destination));
for (const destination of ["Robotics Studio Cloud", "Robotics Studio Enterprise", "AuraOne Robotics Programs"]) {
  if (!destinations.has(destination as CloudHandoffScenario["destination"])) {
    throw new Error(`cloud handoff scenarios must cover ${destination}`);
  }
}

for (const scenario of cloudHandoffScenarios) {
  if (
    scenario.userConsent !== "explicit-preview-required" ||
    !scenario.packetRoles.includes("robotics_reviewed_subset_manifest") ||
    !scenario.privacyExclusions.includes("raw robot video") ||
    scenario.cloudAcceptanceEvidence.length === 0 ||
    scenario.notIncludedInOpen.length === 0
  ) {
    throw new Error(`cloud handoff scenario ${scenario.id} is missing boundary evidence`);
  }
}

console.log("robotics-studio-open core tests passed");
