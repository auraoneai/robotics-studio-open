import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { exportManifest, readinessTone } from "../src/core.js";
import { datasets, fixtureContract, probeTrials } from "../src/data.js";
import {
  artifactPlan,
  buildDeterministicClusters,
  buildLocalEvidenceArchive,
  buildProbeReport,
  buildSensorQaMarkdown,
  buildSensorQaReport,
  createDatasetFromLocalFiles,
  mergeClusterRows,
  refreshClusterRows,
  splitClusterRows,
} from "../src/localOperations.js";

const fixture = datasets[0]!;
assert.equal(fixture.episodes.length, 96);
assert.equal(fixture.provenance.recordCount, 96);
assert.equal(fixture.provenance.seedSceneCount, 3);
assert.equal(fixtureContract.recordCount, 96);
assert.equal(fixtureContract.seedSceneCount, 3);
assert.equal(fixtureContract.controlRateHz, 30);
assert.deepEqual(fixtureContract.sensorRatesHz, {
  cam_front: 30,
  cam_wrist: 30,
  cam_top_depth: 15,
  joint_state: 120,
  language: 1,
});
assert.ok(fixture.episodes.every((episode) => episode.frameRateHz === 30));
assert.ok(fixture.episodes.every((episode) => episode.provenance === "repository-synthetic-fixture"));

const manifest = {
  name: "audit_fixture",
  format: "LeRobot v3",
  episodes: [
    {
      id: "audit-001",
      task: "pick_blue_cup",
      duration_s: 9.5,
      frame_rate_hz: 20,
      readiness: 91,
      success: "failure",
      failure_cluster: "grasp-slip",
      taxonomy_tags: ["lab:grasp-slip"],
      sensors: [
        {
          id: "front",
          label: "Front RGB",
          kind: "rgb",
          rate_hz: 20,
          qa: { dropped_frames: 0, expected_frames: 190 },
        },
      ],
    },
    {
      id: "audit-002",
      task: "place_blue_cup",
      readiness: 48,
      success: "failure",
      failure_cluster: "grasp-slip",
      taxonomy_tags: ["lab:grasp-slip"],
    },
    {
      id: "audit-003",
      success: "failure",
      failure_cluster: "grasp-slip",
    },
    {
      id: "audit-004",
    },
  ],
};

const imported = await createDatasetFromLocalFiles([
  {
    name: "manifest.json",
    relativePath: "audit_fixture/manifest.json",
    text: async () => JSON.stringify(manifest),
  },
]);

assert.equal(imported.name, "audit_fixture");
assert.equal(imported.format, "LeRobot v3 metadata");
assert.equal(imported.indexed, 4);
assert.equal(imported.provenance.kind, "imported-local-manifest");
assert.equal(imported.provenance.label, "Imported local manifest");
assert.equal(imported.episodes[0]?.provenance, "imported-local-manifest");
assert.equal(imported.episodes[0]?.sourceSeedId, undefined);
assert.equal(imported.episodes[0]?.frameRateHz, 20);
assert.equal(imported.episodes[0]?.sensorQaStatus, "pass");
assert.equal(imported.episodes[1]?.duration, null);
assert.equal(imported.episodes[1]?.sensorQaStatus, "unknown");
assert.equal(imported.episodes[1]?.reviewed, "unknown");
assert.equal(imported.episodes[3]?.task, null);
assert.equal(imported.episodes[3]?.readiness, null);
assert.match(imported.root, /paths withheld/);
assert.doesNotMatch(JSON.stringify(imported), /repository synthetic fixture|seedScene/i);

let binaryRead = false;
await assert.rejects(
  createDatasetFromLocalFiles([{
    name: "arbitrary.parquet",
    text: async () => {
      binaryRead = true;
      return "not parquet";
    },
  }]),
  /Binary adapter unavailable in this source build; no episode evidence parsed/,
);
assert.equal(binaryRead, false, "binary intake must reject before attempting text parsing");

for (const name of ["demo.hdf5", "robot.db3", "capture.bag", "episode.mp4"]) {
  await assert.rejects(
    createDatasetFromLocalFiles([{ name, text: async () => "binary" }]),
    /no episode evidence parsed/,
  );
}
await assert.rejects(
  createDatasetFromLocalFiles([{ name: "notes.txt", text: async () => "not a dataset" }]),
  /Unsupported local input/,
);
await assert.rejects(
  createDatasetFromLocalFiles([{ name: "manifest.json", text: async () => "{" }]),
  /Could not parse manifest\.json/,
);
await assert.rejects(
  createDatasetFromLocalFiles([{ name: "episodes.jsonl", text: async () => "{\"task\":\"missing id\"}\n" }]),
  /missing a non-empty id or episode_id/,
);

const clusters = buildDeterministicClusters(imported.episodes);
assert.equal(clusters.length, 1);
assert.equal(clusters[0]?.size, 3);
assert.equal(clusters[0]?.readiness, 70);
assert.equal(clusters[0]?.homogeneity, 1);

const split = splitClusterRows(clusters, clusters[0]!.id, imported.episodes);
assert.equal(split.length, 2);
assert.equal(split[0]!.size + split[1]!.size, 3);
const merged = mergeClusterRows(split, split[0]!.id, imported.episodes);
assert.equal(merged.length, 1);
assert.equal(merged[0]!.size, 3);
const updatedEpisodes = imported.episodes.map((episode) =>
  episode.id === "audit-001" ? { ...episode, readiness: 20 } : episode
);
assert.notEqual(refreshClusterRows(clusters, updatedEpisodes)[0]?.readiness, clusters[0]?.readiness);

for (const requested of [1, 2, 3, 4]) {
  const report = buildProbeReport(imported, probeTrials, requested);
  assert.equal(report.generatedAt, "2026-07-12T00:00:00.000Z");
  assert.equal(report.requestedTrials, requested);
  assert.equal(report.executedTrials, requested);
  assert.equal(report.trials.length, requested);
  assert.equal(report.sourceBuild, true);
}
const clampedProbe = buildProbeReport(imported, probeTrials, 99);
assert.equal(clampedProbe.executedTrials, 4);
assert.equal(clampedProbe.maxTrials, 4);

const qaReport = buildSensorQaReport(imported);
assert.equal(qaReport.episodeCount, 4);
assert.equal(qaReport.sensorRecordCount, 1);
assert.equal(qaReport.checks.find((check) => check.id === "sensor-rate")?.status, "pass");
assert.equal(qaReport.checks.find((check) => check.id === "av-sync")?.status, "unknown");
const markdown = buildSensorQaMarkdown(imported);
assert.match(markdown, /Imported local manifest/);
assert.match(markdown, /No applicable sensor metadata/);
assert.doesNotMatch(markdown, /Synthetic sample/);

const selectedEpisodes = imported.episodes.slice(0, 2);
const selectionManifest = exportManifest(imported, selectedEpisodes, "Local disk");
const fullScope = {
  includeInterventions: true,
  includeSensorQa: true,
  includeEmbodimentCard: true,
};
assert.deepEqual(
  artifactPlan("Local disk", fullScope).map((artifact) => artifact.name),
  [
    "review-manifest.json",
    "interventions.jsonl",
    "EMBODIMENT_CARD.md",
    "sensor-qa.json",
    "checksums.sha256",
  ],
);

const archive = await buildLocalEvidenceArchive({
  manifest: selectionManifest,
  dataset: imported,
  episodes: selectedEpisodes,
  clusters,
  target: "Local disk",
  scope: fullScope,
});
assert.equal(archive.mimeType, "application/zip");
assert.equal(archive.filename, "audit_fixture-robotics-evidence.zip");
assert.equal(archive.bytes[0], 0x50);
assert.equal(archive.bytes[1], 0x4b);

const zipEntries = readStoredZip(archive.bytes);
assert.deepEqual([...zipEntries.keys()], archive.entries.map((entry) => entry.name));
for (const entry of archive.entries) {
  assert.equal(zipEntries.get(entry.name), entry.content);
  assert.equal(sha256(entry.content), entry.sha256);
}
const reviewManifest = JSON.parse(zipEntries.get("review-manifest.json")!) as {
  dataset: { provenance: { kind: string } };
  episodes: Array<{ id: string; provenance: string }>;
};
assert.equal(reviewManifest.dataset.provenance.kind, "imported-local-manifest");
assert.deepEqual(reviewManifest.episodes.map((episode) => episode.id), ["audit-001", "audit-002"]);
assert.ok(reviewManifest.episodes.every((episode) => episode.provenance === "imported-local-manifest"));
const checksumLines = zipEntries.get("checksums.sha256")!.trim().split("\n");
assert.equal(checksumLines.length, archive.entries.length - 1);
for (const entry of archive.entries.filter((candidate) => candidate.name !== "checksums.sha256")) {
  assert.ok(checksumLines.includes(`${entry.sha256}  ${entry.name}`));
}

const minimalArchive = await buildLocalEvidenceArchive({
  manifest: selectionManifest,
  dataset: imported,
  episodes: selectedEpisodes,
  clusters,
  target: "Local disk",
  scope: {
    includeInterventions: false,
    includeSensorQa: false,
    includeEmbodimentCard: false,
  },
});
assert.deepEqual(minimalArchive.entries.map((entry) => entry.name), [
  "review-manifest.json",
  "checksums.sha256",
]);

const cardArchive = await buildLocalEvidenceArchive({
  manifest: selectionManifest,
  dataset: imported,
  episodes: selectedEpisodes,
  clusters,
  target: "Embodiment card",
  scope: fullScope,
});
assert.deepEqual(cardArchive.entries.map((entry) => entry.name), [
  "EMBODIMENT_CARD.md",
  "checksums.sha256",
]);
await assert.rejects(
  buildLocalEvidenceArchive({
    manifest: selectionManifest,
    dataset: imported,
    episodes: selectedEpisodes,
    clusters,
    target: "HF Hub",
    scope: fullScope,
  }),
  /network destination and is not configured/,
);

assert.equal(readinessTone(null), "neutral");
assert.equal(readinessTone(80), "pass");
assert.equal(readinessTone(79), "warn");
assert.equal(readinessTone(55), "warn");
assert.equal(readinessTone(54), "fail");

console.log("robotics-studio-open deterministic local operations passed");

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function readStoredZip(bytes: Uint8Array) {
  const entries = new Map<string, string>();
  let offset = 0;
  const decoder = new TextDecoder();
  while (offset + 4 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    const signature = view.getUint32(0, true);
    if (signature !== 0x04034b50) break;
    assert.equal(view.getUint16(8, true), 0, "test expects stored ZIP entries");
    const compressedSize = view.getUint32(18, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    const content = decoder.decode(bytes.slice(contentStart, contentStart + compressedSize));
    entries.set(name, content);
    offset = contentStart + compressedSize;
  }
  return entries;
}
