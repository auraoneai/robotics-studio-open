import {
  datasetNameFromValue,
  isRecord,
  normalizeDeclaredFormat,
  normalizeEpisodeRecord,
} from "./episodeParsing";
import type {
  Cluster,
  DatasetFormat,
  DatasetTab,
  Episode,
  ExportTarget,
  ProbeTrial,
  SensorQaStatus,
} from "./types";

export type LocalFileEntry = {
  name: string;
  relativePath?: string;
  text: () => Promise<string>;
};

export type ExportScope = {
  includeInterventions: boolean;
  includeSensorQa: boolean;
  includeEmbodimentCard: boolean;
};

export type ArtifactDescriptor = {
  name: string;
  description: string;
  kind: "manifest" | "interventions" | "card" | "qa" | "gallery" | "checksum";
};

export type SensorQaCheck = {
  id: string;
  label: string;
  status: SensorQaStatus;
  detail: string;
  knownSensors: number;
  affectedSensors: number;
};

export type LocalEvidenceArchive = {
  filename: string;
  mimeType: "application/zip";
  bytes: Uint8Array;
  entries: Array<{ name: string; content: string; sha256: string }>;
};

const textExtensions = new Set(["json", "jsonl"]);
const binaryExtensions = new Set(["bag", "db3", "h5", "hdf5", "mp4", "parquet"]);
const networkTargets = new Set<ExportTarget>(["HF Hub", "AuraOne Programs"]);

export async function createDatasetFromLocalFiles(files: readonly LocalFileEntry[]): Promise<DatasetTab> {
  if (!files.length) throw new Error("No local files were selected.");

  const binaryFiles = files.filter((file) => binaryExtensions.has(extensionFor(file.name)));
  const textFiles = files.filter((file) => textExtensions.has(extensionFor(file.name)));
  if (!textFiles.length && binaryFiles.length) {
    throw new Error(
      `Binary adapter unavailable in this source build; no episode evidence parsed from ${binaryFiles.map((file) => file.name).join(", ")}. Export JSON or JSONL episode metadata and import that file instead.`,
    );
  }
  if (!textFiles.length) {
    throw new Error("Unsupported local input. Select a JSON manifest or JSONL episode metadata file.");
  }

  const preferred = [...textFiles].sort((left, right) => {
    const leftPreferred = /(?:manifest|dataset|episodes)\.jsonl?$/i.test(left.name) ? 0 : 1;
    const rightPreferred = /(?:manifest|dataset|episodes)\.jsonl?$/i.test(right.name) ? 0 : 1;
    return leftPreferred - rightPreferred || left.name.localeCompare(right.name);
  });

  let manifestName: string | undefined;
  let declaredFormat: unknown;
  const rawEpisodes: unknown[] = [];
  for (const file of preferred) {
    const source = await file.text();
    try {
      if (extensionFor(file.name) === "jsonl") {
        for (const [lineIndex, line] of source.split(/\r?\n/).entries()) {
          if (!line.trim()) continue;
          const record = JSON.parse(line) as unknown;
          if (!isRecord(record)) {
            throw new Error(`line ${lineIndex + 1} is not an episode object`);
          }
          rawEpisodes.push(record);
        }
        continue;
      }

      const parsed = JSON.parse(source) as unknown;
      if (Array.isArray(parsed)) {
        rawEpisodes.push(...parsed);
      } else if (isRecord(parsed) && Array.isArray(parsed.episodes)) {
        manifestName ??= typeof parsed.name === "string" ? parsed.name : undefined;
        declaredFormat ??= parsed.format;
        rawEpisodes.push(...parsed.episodes);
      } else if (isRecord(parsed) && (typeof parsed.id === "string" || typeof parsed.episode_id === "string")) {
        rawEpisodes.push(parsed);
      } else {
        throw new Error("expected an episode object, an episode array, or a manifest with an episodes array");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "invalid JSON";
      throw new Error(`Could not parse ${file.name}. Expected deterministic JSON or JSONL episode metadata (${detail}).`);
    }
  }

  if (!rawEpisodes.length) {
    throw new Error("The selected JSON or JSONL input contained no episode records.");
  }
  if (rawEpisodes.length > 5_000) {
    throw new Error("This source build limits browser manifest intake to 5,000 episode records.");
  }

  const relativeRoot = files.find((file) => file.relativePath)?.relativePath?.split("/")[0];
  const fallbackName = stripExtension(preferred[0]!.name);
  const datasetName = datasetNameFromValue(manifestName, relativeRoot ?? fallbackName);
  const episodes = rawEpisodes.map((record, index) =>
    normalizeEpisodeRecord(record, index, {
      datasetName,
      provenance: "imported-local-manifest",
    }),
  );
  const duplicateIds = duplicateValues(episodes.map((episode) => episode.id));
  if (duplicateIds.length) {
    throw new Error(`The local manifest contains duplicate episode ids: ${duplicateIds.slice(0, 3).join(", ")}.`);
  }

  const fallbackFormat: DatasetFormat = preferred.some((file) => extensionFor(file.name) === "jsonl")
    ? "JSONL episodes"
    : "JSON manifest";
  const format = normalizeDeclaredFormat(declaredFormat, fallbackFormat);
  const limitations = [
    "Only fields present in the imported JSON or JSONL are treated as episode evidence",
    "No media or binary dataset files are decoded",
  ];
  if (binaryFiles.length) {
    limitations.push(`${binaryFiles.length} selected binary file${binaryFiles.length === 1 ? " was" : "s were"} ignored because source-build adapters are unavailable`);
  }

  return {
    id: `local-${datasetName}-${stableId(episodes.map((episode) => episode.id).join("\n"))}`,
    name: datasetName,
    root: `Browser-selected local manifest (${textFiles.length} metadata file${textFiles.length === 1 ? "" : "s"}; paths withheld)`,
    format: format.format,
    declaredFormat: format.declaredFormat,
    episodes,
    indexed: episodes.length,
    totalEstimate: episodes.length,
    status: "ready",
    lastSaved: "local import",
    savedViews: [],
    provenance: {
      kind: "imported-local-manifest",
      label: "Imported local manifest",
      source: "Browser-selected JSON/JSONL metadata; paths withheld",
      recordCount: episodes.length,
      files: textFiles.map((file) => file.name).sort(),
      limitations,
    },
  };
}

export function recomputeDeterministicClusters(_source: readonly Cluster[], episodes: readonly Episode[]): Cluster[] {
  return buildDeterministicClusters(episodes);
}

export function buildDeterministicClusters(episodes: readonly Episode[]): Cluster[] {
  const grouped = new Map<string, Episode[]>();
  for (const episode of episodes) {
    if (episode.success !== "failure" && !episode.failureCluster) continue;
    const key = episode.failureCluster ?? episode.taxonomyTags[0] ?? "unclassified-failure";
    grouped.set(key, [...(grouped.get(key) ?? []), episode]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, group], index) => clusterFromEpisodes(`cluster-${index + 1}`, key, group));
}

export function refreshClusterRows(source: readonly Cluster[], episodes: readonly Episode[]): Cluster[] {
  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  return source.flatMap((cluster) => {
    const members = cluster.episodeIds.flatMap((id) => {
      const episode = episodeById.get(id);
      return episode ? [episode] : [];
    });
    return members.length
      ? [clusterFromEpisodes(cluster.id, cluster.title, members, cluster.title)]
      : [];
  });
}

export function splitClusterRows(
  source: readonly Cluster[],
  clusterId: string,
  episodes: readonly Episode[],
): Cluster[] {
  const index = source.findIndex((cluster) => cluster.id === clusterId);
  const cluster = source[index];
  if (!cluster || cluster.episodeIds.length < 2) return [...source];
  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const midpoint = Math.ceil(cluster.episodeIds.length / 2);
  const segments = [
    cluster.episodeIds.slice(0, midpoint),
    cluster.episodeIds.slice(midpoint),
  ].map((ids, segmentIndex) => {
    const members = ids.flatMap((id) => {
      const episode = episodeById.get(id);
      return episode ? [episode] : [];
    });
    return clusterFromEpisodes(
      `${cluster.id}-${segmentIndex === 0 ? "a" : "b"}`,
      `${cluster.title} / segment ${segmentIndex === 0 ? "A" : "B"}`,
      members,
      `${cluster.title} / segment ${segmentIndex === 0 ? "A" : "B"}`,
    );
  });
  return [...source.slice(0, index), ...segments, ...source.slice(index + 1)];
}

export function mergeClusterRows(
  source: readonly Cluster[],
  clusterId: string,
  episodes: readonly Episode[],
): Cluster[] {
  if (source.length < 2) return [...source];
  const selectedIndex = source.findIndex((cluster) => cluster.id === clusterId);
  if (selectedIndex < 0) return [...source];
  const peerIndex = selectedIndex < source.length - 1 ? selectedIndex + 1 : selectedIndex - 1;
  const firstIndex = Math.min(selectedIndex, peerIndex);
  const secondIndex = Math.max(selectedIndex, peerIndex);
  const first = source[firstIndex]!;
  const second = source[secondIndex]!;
  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const members = [...new Set([...first.episodeIds, ...second.episodeIds])].flatMap((id) => {
    const episode = episodeById.get(id);
    return episode ? [episode] : [];
  });
  const merged = clusterFromEpisodes(
    `${first.id}+${second.id}`,
    `${first.title} + ${second.title}`,
    members,
    `${first.title} + ${second.title}`,
  );
  return [...source.slice(0, firstIndex), merged, ...source.slice(secondIndex + 1)];
}

export function summarizeClusterRows(clusters: readonly Cluster[], episodes: readonly Episode[]) {
  const interventionStarts = episodes.flatMap((episode) =>
    episode.interventions.flatMap((intervention) =>
      intervention.start === null ? [] : [intervention.start],
    ),
  ).sort((left, right) => left - right);
  const recovered = episodes.filter((episode) =>
    episode.interventions.some((intervention) => intervention.outcome === "task succeeded after intervention"),
  ).length;
  const attemptedRecovery = episodes.filter((episode) => episode.interventions.length > 0).length;
  const homogeneityValues = clusters.flatMap((cluster) => cluster.homogeneity === null ? [] : [cluster.homogeneity]);
  return {
    recoverySuccess: attemptedRecovery ? Math.round((recovered / attemptedRecovery) * 100) : null,
    medianTimeToIntervention: median(interventionStarts),
    clusterHomogeneity: homogeneityValues.length
      ? Number((homogeneityValues.reduce((total, value) => total + value, 0) / homogeneityValues.length).toFixed(2))
      : null,
  };
}

export function buildProbeReport(
  dataset: DatasetTab,
  trials: readonly ProbeTrial[],
  requestedCount = trials.length,
) {
  const executedCount = clampInteger(requestedCount, 1, 4);
  const completedTrials = trials.slice(0, executedCount).map((trial, index) => ({
    ...trial,
    status: index === 1 ? "fail" as const : "pass" as const,
    latencyMs: 38 + index * 7,
  }));
  return {
    schema: "auraone.robotics.probe-result.v1",
    generatedAt: "2026-07-12T00:00:00.000Z",
    sourceBuild: true,
    dataset: dataset.name,
    provenance: dataset.provenance,
    episodeCount: dataset.episodes.length,
    policy: "deterministic-mock",
    requestedTrials: requestedCount,
    executedTrials: completedTrials.length,
    maxTrials: 4,
    trials: completedTrials,
    recommendation: completedTrials.some((trial) => trial.status === "fail")
      ? "Review the failed deterministic perturbation before relying on this local mock result."
      : "All requested deterministic mock perturbations passed.",
  };
}

export function buildSensorQaReport(dataset: DatasetTab) {
  const sensors = dataset.episodes.flatMap((episode) => episode.sensors);
  const checks: SensorQaCheck[] = [
    numericQaCheck(
      "dropped-frames",
      "Dropped frames",
      sensors,
      (sensor) => sensor.qa.droppedFrames,
      (sensor) => {
        const dropped = sensor.qa.droppedFrames;
        const expected = sensor.qa.expectedFrames;
        return typeof dropped === "number" && (
          typeof expected === "number" && expected > 0 ? dropped / expected > 0.05 : dropped >= 6
        );
      },
      "sensor streams exceed the five percent or six-frame threshold",
    ),
    numericQaCheck(
      "calibration-drift",
      "Calibration drift",
      sensors,
      (sensor) => sensor.qa.calibrationError,
      (sensor) => Math.abs(sensor.qa.calibrationError ?? 0) > 0.02,
      "sensor streams exceed the 0.02 metadata threshold",
    ),
    numericQaCheck(
      "av-sync",
      "A/V synchronization",
      sensors,
      (sensor) => sensor.qa.avSyncMs,
      (sensor) => Math.abs(sensor.qa.avSyncMs ?? 0) > 40,
      "sensor streams exceed the 40 ms metadata threshold",
    ),
    {
      id: "sensor-rate",
      label: "Declared sample rates",
      status: sensors.length
        ? sensors.some((sensor) => sensor.rateHz === null) ? "warn" : "pass"
        : "unknown",
      detail: sensors.length
        ? `${sensors.filter((sensor) => sensor.rateHz !== null).length} of ${sensors.length} sensor records declare a sample rate`
        : "No sensor records are present in the active dataset",
      knownSensors: sensors.filter((sensor) => sensor.rateHz !== null).length,
      affectedSensors: sensors.filter((sensor) => sensor.rateHz === null).length,
    },
  ];
  return {
    schema: "auraone.robotics.sensor-qa.v1",
    generatedAt: "2026-07-12T00:00:00.000Z",
    dataset: dataset.name,
    provenance: dataset.provenance,
    episodeCount: dataset.episodes.length,
    sensorRecordCount: sensors.length,
    checks,
    overallStatus: aggregateQa(checks.map((check) => check.status)),
  };
}

export function buildSensorQaMarkdown(dataset: DatasetTab) {
  const report = buildSensorQaReport(dataset);
  const rows = report.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.detail} |`)
    .join("\n");
  return [
    `# Sensor QA: ${dataset.name}`,
    "",
    `> ${dataset.provenance.label}. ${dataset.provenance.limitations.join(" ")}`,
    "",
    `Episodes: ${dataset.episodes.length}`,
    `Format: ${dataset.format}`,
    `Overall status: ${report.overallStatus}`,
    "",
    "| Check | Status | Detail |",
    "| --- | --- | --- |",
    rows,
    "",
  ].join("\n");
}

export function artifactPlan(target: ExportTarget, scope: ExportScope): ArtifactDescriptor[] {
  if (networkTargets.has(target)) return [];
  const descriptors: ArtifactDescriptor[] = [];
  if (target === "Local disk") {
    descriptors.push({
      name: "review-manifest.json",
      description: "Filtered records, decisions, provenance, and source field coverage",
      kind: "manifest",
    });
    if (scope.includeInterventions) {
      descriptors.push({
        name: "interventions.jsonl",
        description: "Actual intervention and anomaly records from the selected episodes",
        kind: "interventions",
      });
    }
    if (scope.includeEmbodimentCard) {
      descriptors.push({
        name: "EMBODIMENT_CARD.md",
        description: "Known embodiment and declared sensor-rate metadata",
        kind: "card",
      });
    }
    if (scope.includeSensorQa) {
      descriptors.push({
        name: "sensor-qa.json",
        description: "QA checks computed from available sensor metadata",
        kind: "qa",
      });
    }
  }
  if (target === "Embodiment card") {
    descriptors.push({
      name: "EMBODIMENT_CARD.md",
      description: "Known embodiment and declared sensor-rate metadata",
      kind: "card",
    });
  }
  if (target === "Failure gallery") {
    descriptors.push({
      name: "failure-gallery.json",
      description: "Failure records and the current deterministic cluster grouping",
      kind: "gallery",
    });
  }
  descriptors.push({
    name: "checksums.sha256",
    description: "SHA-256 checksums for every generated evidence artifact",
    kind: "checksum",
  });
  return descriptors;
}

export async function buildLocalEvidenceArchive(options: {
  manifest: unknown;
  dataset: DatasetTab;
  episodes: readonly Episode[];
  clusters: readonly Cluster[];
  target: ExportTarget;
  scope: ExportScope;
}): Promise<LocalEvidenceArchive> {
  const { manifest, dataset, episodes, clusters, target, scope } = options;
  if (networkTargets.has(target)) {
    throw new Error(`${target} is a network destination and is not configured in this source build.`);
  }

  const plan = artifactPlan(target, scope).filter((artifact) => artifact.kind !== "checksum");
  const contents = plan.map((artifact) => ({
    name: artifact.name,
    content: artifactContent(artifact.kind, {
      manifest,
      dataset,
      episodes,
      clusters,
    }),
  }));
  const hashed = [];
  for (const entry of contents) {
    hashed.push({ ...entry, sha256: await sha256Text(entry.content) });
  }
  const checksumContent = `${hashed.map((entry) => `${entry.sha256}  ${entry.name}`).join("\n")}\n`;
  const entries = [
    ...hashed,
    {
      name: "checksums.sha256",
      content: checksumContent,
      sha256: await sha256Text(checksumContent),
    },
  ];
  const filenameSuffix = target === "Embodiment card"
    ? "embodiment-card"
    : target === "Failure gallery"
      ? "failure-gallery"
      : "robotics-evidence";
  return {
    filename: `${dataset.name}-${filenameSuffix}.zip`,
    mimeType: "application/zip",
    bytes: buildStoredZip(entries.map((entry) => ({ name: entry.name, content: entry.content }))),
    entries,
  };
}

export function downloadTextArtifact(filename: string, content: string, type = "text/plain;charset=utf-8") {
  downloadBlob(filename, new Blob([content], { type }));
}

export function downloadBinaryArtifact(filename: string, bytes: Uint8Array, type = "application/octet-stream") {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  downloadBlob(filename, new Blob([copied.buffer], { type }));
}

function clusterFromEpisodes(id: string, key: string, episodes: readonly Episode[], titleOverride?: string): Cluster {
  const knownReadiness = episodes.flatMap((episode) => episode.readiness === null ? [] : [episode.readiness]);
  const readiness = knownReadiness.length
    ? Math.round(knownReadiness.reduce((total, value) => total + value, 0) / knownReadiness.length)
    : null;
  const tagCounts = new Map<string, number>();
  for (const tag of episodes.flatMap((episode) => episode.taxonomyTags)) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const dominantEntry = [...tagCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  const dominantTag = dominantEntry?.[0] ?? null;
  const taggedEpisodes = episodes.filter((episode) => episode.taxonomyTags.length > 0).length;
  const homogeneity = dominantEntry && taggedEpisodes
    ? Number((dominantEntry[1] / taggedEpisodes).toFixed(2))
    : null;
  return {
    id,
    title: titleOverride ?? humanClusterTitle(key),
    size: episodes.length,
    episodeIds: episodes.map((episode) => episode.id),
    representativeEpisodeId: episodes[0]?.id ?? "",
    dominantTag,
    readiness,
    homogeneity,
    trainingDecision: trainingDecision(readiness),
  };
}

function artifactContent(
  kind: ArtifactDescriptor["kind"],
  context: {
    manifest: unknown;
    dataset: DatasetTab;
    episodes: readonly Episode[];
    clusters: readonly Cluster[];
  },
): string {
  const { manifest, dataset, episodes, clusters } = context;
  if (kind === "manifest") {
    return `${JSON.stringify({
      schema: "auraone.robotics.review-manifest.v1",
      generatedAt: "2026-07-12T00:00:00.000Z",
      sourceBuild: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        format: dataset.format,
        declaredFormat: dataset.declaredFormat ?? null,
        provenance: dataset.provenance,
      },
      selection: manifest,
      episodes: episodes.map(exportEpisodeRecord),
    }, null, 2)}\n`;
  }
  if (kind === "interventions") {
    const records = episodes.flatMap((episode) => [
      ...episode.interventions.map((intervention) => ({
        episodeId: episode.id,
        type: "intervention",
        ...intervention,
      })),
      ...episode.anomalies.map((anomaly) => ({
        episodeId: episode.id,
        type: "anomaly",
        ...anomaly,
      })),
    ]);
    return records.length ? `${records.map((record) => JSON.stringify(record)).join("\n")}\n` : "";
  }
  if (kind === "card") return buildEmbodimentCard(dataset, episodes);
  if (kind === "qa") {
    const scopedDataset: DatasetTab = {
      ...dataset,
      episodes: [...episodes],
      indexed: episodes.length,
      totalEstimate: episodes.length,
      provenance: {
        ...dataset.provenance,
        recordCount: episodes.length,
      },
    };
    return `${JSON.stringify(buildSensorQaReport(scopedDataset), null, 2)}\n`;
  }
  if (kind === "gallery") {
    return `${JSON.stringify({
      schema: "auraone.robotics.failure-gallery.v1",
      generatedAt: "2026-07-12T00:00:00.000Z",
      dataset: dataset.name,
      provenance: dataset.provenance,
      failures: episodes
        .filter((episode) => episode.success === "failure" || episode.failureCluster || episode.taxonomyTags.length)
        .map(exportEpisodeRecord),
      clusters,
    }, null, 2)}\n`;
  }
  throw new Error(`Unsupported artifact kind: ${kind}`);
}

function buildEmbodimentCard(dataset: DatasetTab, episodes: readonly Episode[]): string {
  const embodiments = [...new Set(episodes.flatMap((episode) => episode.embodiment ? [episode.embodiment] : []))].sort();
  const sensorRates = new Map<string, Set<number>>();
  for (const sensor of episodes.flatMap((episode) => episode.sensors)) {
    if (sensor.rateHz === null) continue;
    const rates = sensorRates.get(sensor.label) ?? new Set<number>();
    rates.add(sensor.rateHz);
    sensorRates.set(sensor.label, rates);
  }
  return [
    `# Embodiment Card: ${dataset.name}`,
    "",
    `Provenance: ${dataset.provenance.label}`,
    `Episode records: ${episodes.length}`,
    `Embodiments declared: ${embodiments.length ? embodiments.join(", ") : "unknown"}`,
    "",
    "## Declared sensor rates",
    "",
    ...(sensorRates.size
      ? [...sensorRates.entries()].map(([label, rates]) => `- ${label}: ${[...rates].sort((left, right) => left - right).join(", ")} Hz`)
      : ["- No sensor sample rates were declared in the selected records."]),
    "",
    "## Source-build limitations",
    "",
    ...dataset.provenance.limitations.map((limitation) => `- ${limitation}`),
    "",
  ].join("\n");
}

function exportEpisodeRecord(episode: Episode) {
  return {
    id: episode.id,
    provenance: episode.provenance,
    availableFields: episode.availableFields,
    task: episode.task,
    duration: episode.duration,
    frameRateHz: episode.frameRateHz,
    embodiment: episode.embodiment,
    success: episode.success,
    reviewed: episode.reviewed,
    readiness: episode.readiness,
    sensorQaStatus: episode.sensorQaStatus,
    failureCluster: episode.failureCluster ?? null,
    taxonomyTags: episode.taxonomyTags,
    interventions: episode.interventions,
    anomalies: episode.anomalies,
  };
}

function numericQaCheck(
  id: string,
  label: string,
  sensors: readonly Episode["sensors"][number][],
  value: (sensor: Episode["sensors"][number]) => number | undefined,
  fails: (sensor: Episode["sensors"][number]) => boolean,
  failureDetail: string,
): SensorQaCheck {
  const known = sensors.filter((sensor) => typeof value(sensor) === "number");
  const affected = known.filter(fails);
  return {
    id,
    label,
    status: known.length ? affected.length ? "fail" : "pass" : "unknown",
    detail: known.length
      ? `${affected.length} of ${known.length} ${failureDetail}`
      : "No applicable sensor metadata is present in the active dataset",
    knownSensors: known.length,
    affectedSensors: affected.length,
  };
}

function aggregateQa(statuses: readonly SensorQaStatus[]): SensorQaStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  if (statuses.includes("pass")) return "pass";
  return "unknown";
}

function trainingDecision(readiness: number | null): Cluster["trainingDecision"] {
  if (readiness === null) return "unknown";
  if (readiness >= 80) return "training-ready";
  if (readiness < 55) return "exclude from training";
  return "needs review";
}

function humanClusterTitle(value: string): string {
  const known: Record<string, string> = {
    "gripper-slip": "gripper slip on glossy objects",
    "wrist-occlusion": "wrist-camera occlusion during approach",
    "phase-reset": "phase-order mismatch after manual reset",
    "unclassified-failure": "unclassified failure records",
  };
  return known[value] ?? value.replaceAll(/[:_-]+/g, " ");
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const midpoint = Math.floor(values.length / 2);
  return values.length % 2
    ? values[midpoint]!
    : Number(((values[midpoint - 1]! + values[midpoint]!) / 2).toFixed(2));
}

function buildStoredZip(entries: readonly { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const content = encoder.encode(entry.content);
    const crc = crc32(content);
    const local = new Uint8Array(30 + name.length + content.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, content.length, true);
    localView.setUint32(22, content.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(content, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, content.length, true);
    centralView.setUint32(24, content.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);
  return concatBytes([...localParts, ...centralParts, end]);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function sha256Text(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto SHA-256 is unavailable; no archive was generated.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function extensionFor(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}
