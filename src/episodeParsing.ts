import type {
  ActionPhase,
  AnomalyNote,
  DatasetFormat,
  DatasetProvenanceKind,
  Episode,
  Intervention,
  ReviewStatus,
  SensorQaStatus,
  SensorStream,
  SuccessState,
} from "./types";

export type EpisodeParseContext = {
  datasetName: string;
  provenance: DatasetProvenanceKind;
};

export function normalizeEpisodeRecord(
  source: unknown,
  index: number,
  context: EpisodeParseContext,
): Episode {
  if (!isRecord(source)) {
    throw new Error(`Episode record ${index + 1} must be a JSON object.`);
  }

  const id = firstString(source.id, source.episode_id);
  if (!id) {
    throw new Error(`Episode record ${index + 1} is missing a non-empty id or episode_id.`);
  }

  const duration = positiveNumber(source.duration, source.duration_s);
  const frameRateHz = positiveNumber(source.frameRateHz, source.frame_rate_hz, source.fps);
  const explicitLengthFrames = positiveInteger(source.lengthFrames, source.length_frames);
  const sensors = normalizeSensors(source.sensors);
  const phases = normalizePhases(source.phases ?? source.markers, id);
  const interventions = normalizeInterventions(source.interventions, id);
  const anomalies = normalizeAnomalies(source.anomalies ?? source.anomaly_notes, id);
  const explicitInterventionCount = nonNegativeInteger(source.interventionCount, source.intervention_count);
  const explicitQa = sensorQaStatus(source.sensorQaStatus ?? source.sensor_qa_status);

  return {
    id,
    task: firstString(source.task),
    duration,
    frameRateHz,
    embodiment: firstString(source.embodiment),
    success: successState(source.success),
    reviewed: reviewStatus(source.reviewed),
    lengthFrames: explicitLengthFrames ?? (
      duration !== null && frameRateHz !== null
        ? Math.round(duration * frameRateHz)
        : null
    ),
    interventionCount: explicitInterventionCount ?? (
      Array.isArray(source.interventions) ? interventions.length : null
    ),
    taskTags: stringArray(source.taskTags ?? source.task_tags),
    date: firstString(source.date, source.recorded_at),
    failureCluster: firstString(source.failureCluster, source.failure_cluster) ?? undefined,
    sensorQaStatus: explicitQa ?? aggregateSensorQa(sensors),
    instruction: firstString(source.instruction, source.language_instruction),
    readiness: boundedScore(source.readiness),
    sensors,
    phases,
    interventions,
    anomalies,
    taxonomyTags: uniqueStrings([
      ...stringArray(source.taxonomyTags ?? source.taxonomy_tags),
      ...stringArray(source.failure_modes),
    ]),
    provenance: context.provenance,
    sourceSeedId: firstString(source.seedSceneId, source.seed_scene_id) ?? undefined,
    availableFields: availableFields(source),
  };
}

export function normalizeDeclaredFormat(value: unknown, fallback: DatasetFormat): {
  format: DatasetFormat;
  declaredFormat?: string;
} {
  const declaredFormat = firstString(value);
  if (!declaredFormat) return { format: fallback };
  const normalized = declaredFormat.toLowerCase();
  if (normalized.includes("lerobot")) return { format: "LeRobot v3 metadata", declaredFormat };
  if (normalized.includes("rlds")) return { format: "RLDS metadata", declaredFormat };
  if (normalized.includes("openx") || normalized.includes("open x")) {
    return { format: "OpenX metadata", declaredFormat };
  }
  return { format: fallback, declaredFormat };
}

export function datasetNameFromValue(value: unknown, fallback: string): string {
  const candidate = firstString(value) ?? fallback;
  const normalized = candidate.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "local_manifest";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSensors(value: unknown): SensorStream[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const id = firstString(candidate.id, candidate.name);
    if (!id) return [];
    const qaSource = isRecord(candidate.qa) ? candidate.qa : candidate;
    const qa = {
      droppedFrames: optionalNumber(qaSource.droppedFrames, qaSource.dropped_frames),
      expectedFrames: optionalNumber(qaSource.expectedFrames, qaSource.expected_frames),
      avSyncMs: optionalNumber(qaSource.avSyncMs, qaSource.av_sync_ms),
      calibrationError: optionalNumber(qaSource.calibrationError, qaSource.calibration_error),
    };
    const explicitStatus = sensorQaStatus(candidate.status ?? candidate.qa_status);
    return [{
      id,
      label: firstString(candidate.label, candidate.name) ?? id,
      kind: sensorKind(candidate.kind),
      rateHz: positiveNumber(candidate.rateHz, candidate.rate_hz, candidate.sampleRateHz, candidate.sample_rate_hz),
      visible: typeof candidate.visible === "boolean" ? candidate.visible : index < 4,
      status: explicitStatus ?? deriveSensorStatus(qa),
      samples: numberArray(candidate.samples),
      qa,
    }];
  });
}

function normalizePhases(value: unknown, episodeId: string): ActionPhase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const label = firstString(candidate.label);
    const start = optionalNumber(candidate.start, candidate.start_s);
    const end = optionalNumber(candidate.end, candidate.end_s);
    if (!label || start === undefined || end === undefined || start < 0 || end < start) return [];
    return [{
      id: firstString(candidate.id) ?? `${episodeId}-phase-${index + 1}`,
      label,
      start,
      end,
    }];
  });
}

function normalizeInterventions(value: unknown, episodeId: string): Intervention[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    return [{
      id: firstString(candidate.id) ?? `${episodeId}-intervention-${index + 1}`,
      start: optionalNumber(candidate.start, candidate.start_s) ?? null,
      end: optionalNumber(candidate.end, candidate.end_s) ?? null,
      why: firstString(candidate.why, candidate.label) ?? "unspecified intervention",
      outcome: firstString(candidate.outcome) ?? "outcome unknown",
      notes: firstString(candidate.notes) ?? "",
    }];
  });
}

function normalizeAnomalies(value: unknown, episodeId: string): AnomalyNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (typeof candidate === "string" && candidate.trim()) {
      return [{
        id: `${episodeId}-anomaly-${index + 1}`,
        sensorId: "unspecified sensor",
        start: null,
        end: null,
        severity: "info" as const,
        note: candidate.trim(),
      }];
    }
    if (!isRecord(candidate)) return [];
    const note = firstString(candidate.note);
    if (!note) return [];
    const severity = candidate.severity === "error" || candidate.severity === "warn"
      ? candidate.severity
      : "info";
    return [{
      id: firstString(candidate.id) ?? `${episodeId}-anomaly-${index + 1}`,
      sensorId: firstString(candidate.sensorId, candidate.sensor_id) ?? "unspecified sensor",
      start: optionalNumber(candidate.start, candidate.start_s) ?? null,
      end: optionalNumber(candidate.end, candidate.end_s) ?? null,
      severity,
      note,
    }];
  });
}

function aggregateSensorQa(sensors: readonly SensorStream[]): SensorQaStatus {
  if (sensors.some((sensor) => sensor.status === "fail")) return "fail";
  if (sensors.some((sensor) => sensor.status === "warn")) return "warn";
  if (sensors.some((sensor) => sensor.status === "pass")) return "pass";
  return "unknown";
}

function deriveSensorStatus(qa: SensorStream["qa"]): SensorQaStatus {
  const known = Object.values(qa).some((value) => typeof value === "number");
  if (!known) return "unknown";
  const droppedRatio = typeof qa.droppedFrames === "number" && typeof qa.expectedFrames === "number" && qa.expectedFrames > 0
    ? qa.droppedFrames / qa.expectedFrames
    : null;
  if (
    (droppedRatio !== null && droppedRatio > 0.05)
    || (droppedRatio === null && (qa.droppedFrames ?? 0) >= 6)
    || Math.abs(qa.avSyncMs ?? 0) > 40
    || Math.abs(qa.calibrationError ?? 0) > 0.02
  ) {
    return "fail";
  }
  if (
    (qa.droppedFrames ?? 0) > 0
    || Math.abs(qa.avSyncMs ?? 0) > 25
    || Math.abs(qa.calibrationError ?? 0) > 0.01
  ) {
    return "warn";
  }
  return "pass";
}

function availableFields(source: Record<string, unknown>): string[] {
  const aliases: Array<[string, string[]]> = [
    ["task", ["task"]],
    ["duration", ["duration", "duration_s"]],
    ["frameRate", ["frameRateHz", "frame_rate_hz", "fps"]],
    ["embodiment", ["embodiment"]],
    ["success", ["success"]],
    ["reviewed", ["reviewed"]],
    ["instruction", ["instruction", "language_instruction"]],
    ["readiness", ["readiness"]],
    ["sensors", ["sensors"]],
    ["phases", ["phases", "markers"]],
    ["interventions", ["interventions"]],
    ["anomalies", ["anomalies", "anomaly_notes"]],
    ["taxonomyTags", ["taxonomyTags", "taxonomy_tags", "failure_modes"]],
    ["failureCluster", ["failureCluster", "failure_cluster"]],
  ];
  return aliases
    .filter(([, keys]) => keys.some((key) => Object.prototype.hasOwnProperty.call(source, key)))
    .map(([label]) => label);
}

function sensorKind(value: unknown): SensorStream["kind"] {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized.includes("rgb") || normalized.includes("camera")) return "rgb";
  if (normalized.includes("depth") || normalized.includes("point")) return "depth";
  if (normalized.includes("joint") || normalized.includes("action")) return "joint";
  if (normalized.includes("pose")) return "pose";
  if (normalized.includes("force") || normalized.includes("torque")) return "force";
  if (normalized.includes("audio")) return "audio";
  if (normalized.includes("language") || normalized.includes("text")) return "language";
  return "custom";
}

function successState(value: unknown): SuccessState {
  if (value === true || value === "success") return "success";
  if (value === false || value === "failure") return "failure";
  return "unknown";
}

function reviewStatus(value: unknown): ReviewStatus {
  if (value === true || value === "reviewed") return "reviewed";
  if (value === false || value === "unreviewed") return "unreviewed";
  return "unknown";
}

function sensorQaStatus(value: unknown): SensorQaStatus | null {
  return value === "pass" || value === "warn" || value === "fail" || value === "unknown"
    ? value
    : null;
}

function boundedScore(value: unknown): number | null {
  const candidate = optionalNumber(value);
  return candidate === undefined ? null : Math.min(100, Math.max(0, Math.round(candidate)));
}

function positiveNumber(...values: unknown[]): number | null {
  const value = optionalNumber(...values);
  return value !== undefined && value > 0 ? value : null;
}

function positiveInteger(...values: unknown[]): number | null {
  const value = optionalNumber(...values);
  return value !== undefined && value > 0 ? Math.round(value) : null;
}

function nonNegativeInteger(...values: unknown[]): number | null {
  const value = optionalNumber(...values);
  return value !== undefined && value >= 0 ? Math.round(value) : null;
}

function optionalNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())).map((entry) => entry.trim())
    : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
    : [];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
