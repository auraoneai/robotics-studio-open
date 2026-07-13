import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixtureRoot = resolve(appRoot, "fixtures/sample-so101");
const verifyOnly = process.argv.includes("--verify");
const fixtureCount = 96;
const generatedAt = "2026-05-13";

const seedDocument = JSON.parse(await readFile(resolve(fixtureRoot, "seeds.json"), "utf8"));
if (seedDocument.schema !== "auraone.robotics.synthetic-seeds.v1" || seedDocument.seed_scenes?.length !== 3) {
  throw new Error("The SO-101 fixture must declare exactly three synthetic seed scenes.");
}

const episodes = Array.from({ length: fixtureCount }, (_, index) => buildEpisode(seedDocument.seed_scenes, index));
const meta = {
  schema: "auraone.robotics.synthetic-fixture-meta.v1",
  name: "so101_kitchen_v3",
  format: "LeRobot v3 metadata",
  license: "MIT",
  generated_at: generatedAt,
  provenance: "AuraOne-authored repository synthetic fixture generated from three seed scenes; no real robot media, partner data, or third-party demonstrations.",
  fixture_record_count: fixtureCount,
  seed_scene_count: seedDocument.seed_scenes.length,
  generator: "scripts/generate_sample_fixture.mjs",
  control_rate_hz: 30,
  sensor_rates_hz: {
    cam_front: 30,
    cam_wrist: 30,
    cam_top_depth: 15,
    joint_state: 120,
    language: 1
  },
  media_included: false,
  sample_dataset_notice: "Synthetic metadata and deterministic data visualizations for Robotics Studio Open source-build review and regression tests."
};
const manifest = {
  schema: "auraone.robotics.dataset-manifest.v1",
  name: meta.name,
  format: meta.format,
  provenance: "repository-synthetic-fixture",
  meta,
  episodes
};

const outputs = new Map([
  [resolve(fixtureRoot, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`],
  [resolve(fixtureRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`],
  [resolve(fixtureRoot, "episodes.jsonl"), `${episodes.map((episode) => JSON.stringify(episode)).join("\n")}\n`],
]);

if (verifyOnly) {
  for (const [path, expected] of outputs) {
    const actual = await readFile(path, "utf8").catch(() => "");
    if (actual !== expected) {
      throw new Error(`${path} is stale. Run pnpm fixture:generate.`);
    }
  }
  console.log(`Verified ${fixtureCount} generated SO-101 fixture records from three seed scenes.`);
} else {
  for (const [path, content] of outputs) {
    await writeFile(path, content);
  }
  console.log(`Generated ${fixtureCount} SO-101 fixture records from three seed scenes.`);
}

function buildEpisode(seeds, index) {
  const seed = seeds[index % seeds.length];
  const variantIndex = Math.floor(index / seeds.length) + 1;
  const duration = Number((seed.base_duration_s + ((variantIndex * 3 + index) % 9) * 0.25).toFixed(2));
  const interventionCount = index % 5;
  const success = index % 7 === 0 ? "failure" : index % 5 === 0 ? "unknown" : "success";
  const droppedFrames = index % 11 === 0 ? 6 + (index % 4) : 0;
  const wristDroppedFrames = index % 19 === 0 ? 4 : 0;
  const avSyncMs = index % 13 === 0 ? 42 + (index % 8) : 8 + (index % 5);
  const calibrationError = index % 17 === 0 ? 0.035 : 0.006;
  const sensorQaStatus = droppedFrames > 0 || avSyncMs > 40 || calibrationError > 0.02
    ? "fail"
    : wristDroppedFrames > 0
      ? "warn"
      : "pass";
  const readiness = Math.max(
    20,
    96
      - interventionCount * 8
      - (success === "failure" ? 18 : success === "unknown" ? 8 : 0)
      - (sensorQaStatus === "fail" ? 22 : sensorQaStatus === "warn" ? 10 : 0),
  );
  const failure = success === "failure";
  const episodeId = `so101_kitchen_v3-ep-${String(index + 1).padStart(5, "0")}`;
  const phases = seed.phases.map(([label, start, end]) => ({
    id: `${episodeId}-${label}`,
    label,
    start_s: Number((duration * start).toFixed(3)),
    end_s: Number((duration * end).toFixed(3))
  }));
  const interventions = Array.from({ length: interventionCount }, (_, interventionIndex) => {
    const start = Math.min(duration - 0.8, 2 + interventionIndex * 2.15);
    return {
      id: `${episodeId}-intervention-${interventionIndex + 1}`,
      start_s: Number(start.toFixed(3)),
      end_s: Number(Math.min(duration, start + 0.65).toFixed(3)),
      why: interventionIndex % 2 === 0 ? "detected anomaly" : "manual override",
      outcome: success === "failure"
        ? "task abandoned"
        : interventionIndex % 2 === 0
          ? "task succeeded after intervention"
          : "partial success",
      notes: "Repository synthetic review marker generated from the seed scene."
    };
  });
  const anomalies = sensorQaStatus === "pass"
    ? []
    : [{
        id: `${episodeId}-anomaly-1`,
        sensor_id: droppedFrames > 0 || wristDroppedFrames > 0 ? "cam-wrist" : "cam-front",
        start_s: Number((duration * 0.4).toFixed(3)),
        end_s: Number((duration * 0.5).toFixed(3)),
        severity: sensorQaStatus === "fail" ? "error" : "warn",
        note: droppedFrames > 0 || wristDroppedFrames > 0
          ? "Synthetic dropped-frame threshold exceeded."
          : "Synthetic calibration or synchronization threshold exceeded."
      }];

  return {
    id: episodeId,
    seed_scene_id: seed.id,
    variant_index: variantIndex,
    task: seed.task,
    duration_s: duration,
    frame_rate_hz: 30,
    length_frames: Math.round(duration * 30),
    embodiment: seed.embodiment,
    success,
    reviewed: index % 3 === 0 ? "reviewed" : "unreviewed",
    instruction: seed.instruction,
    readiness,
    date: `2026-05-${String((index % 12) + 1).padStart(2, "0")}`,
    task_tags: [seed.id, "kitchen", `variant-${variantIndex}`],
    failure_cluster: failure ? seed.failure_cluster : null,
    taxonomy_tags: failure
      ? [seed.failure_mode]
      : index % 6 === 0
        ? ["org:custom:needs_second_pass"]
        : [],
    sensor_qa_status: sensorQaStatus,
    sensors: [
      sensor("cam-front", "RGB cam_front", "rgb", 30, true, index, {
        dropped_frames: droppedFrames,
        expected_frames: Math.round(duration * 30),
        av_sync_ms: avSyncMs,
        calibration_error: calibrationError
      }),
      sensor("cam-wrist", "RGB cam_wrist", "rgb", 30, true, index + 1, {
        dropped_frames: wristDroppedFrames,
        expected_frames: Math.round(duration * 30),
        av_sync_ms: 10 + (index % 4),
        calibration_error: 0.008
      }),
      sensor("depth-top", "Depth cam_top", "depth", 15, true, index + 2, {
        dropped_frames: 0,
        expected_frames: Math.round(duration * 15),
        av_sync_ms: 12,
        calibration_error: 0.01
      }),
      sensor("joint-state", "Joint state", "joint", 120, true, index + 3, {
        dropped_frames: 0,
        expected_frames: Math.round(duration * 120),
        av_sync_ms: 0,
        calibration_error: 0
      }),
      sensor("language", "Language instruction", "language", 1, true, index + 4, {
        dropped_frames: 0,
        expected_frames: 1,
        av_sync_ms: 0,
        calibration_error: 0
      })
    ],
    phases,
    interventions,
    anomalies,
    provenance: "repository-synthetic-fixture"
  };
}

function sensor(id, label, kind, rateHz, visible, offset, qa) {
  const samples = Array.from({ length: 6 }, (_, sampleIndex) => {
    const base = kind === "joint" ? 0.2 : kind === "depth" ? 12 : 24;
    return Number((base + ((offset * 7 + sampleIndex * 11) % 29) / 10).toFixed(2));
  });
  return {
    id,
    label,
    kind,
    rate_hz: rateHz,
    visible,
    samples,
    qa
  };
}
