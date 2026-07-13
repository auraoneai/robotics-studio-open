import type { CloudHandoffScenario } from "./contracts";
import type { DatasetTab, Episode, FilterState, SensorQaStatus, SortState, SuccessState } from "./types";

export const intakePayloadRoles = [
  "robotics_reviewed_subset_manifest",
  "robotics_episode_reference",
  "robotics_failure_cluster",
  "robotics_intervention_note",
  "robotics_embodiment_card",
  "robotics_sensor_qa_report",
];

export const cloudHandoffScenarios: CloudHandoffScenario[] = [
  {
    id: "cloud-shared-review-queue",
    title: "Shared review queue",
    destination: "Robotics Studio Cloud",
    trigger: "A team needs multiple reviewers, shared dataset state, org dashboards, RBAC, or approval routing.",
    localAction: "export-intake-packet",
    packetRoles: intakePayloadRoles,
    privacyExclusions: ["raw robot video", "ROS bags", "local file paths", "hostnames", "API keys"],
    userConsent: "explicit-preview-required",
    cloudAcceptanceEvidence: ["authenticated Cloud import URL", "org-bound intake receipt", "review queue created"],
    notIncludedInOpen: ["multi-reviewer queues", "hosted dataset storage", "approval chains", "org dashboards"],
  },
  {
    id: "enterprise-governed-transfer",
    title: "Governed enterprise transfer",
    destination: "Robotics Studio Enterprise",
    trigger: "A regulated team requires SSO, SCIM, VPC or self-hosted deployment, audit evidence, and signed attestations.",
    localAction: "share-reviewed-subset",
    packetRoles: intakePayloadRoles,
    privacyExclusions: ["raw robot video", "ROS bags", "local file paths", "hostnames", "API keys"],
    userConsent: "explicit-preview-required",
    cloudAcceptanceEvidence: ["enterprise tenant import log", "SSO-bound operator identity", "audit-ledger entry"],
    notIncludedInOpen: ["SSO", "SCIM", "audit-grade evidence ledgers", "VPC deployment controls"],
  },
  {
    id: "programs-managed-review",
    title: "Managed second-pass review",
    destination: "AuraOne Robotics Programs",
    trigger: "Clusters are tagged for second-pass review, repeated QA blockers appear, or overflow labeling work is requested.",
    localAction: "request-managed-review",
    packetRoles: intakePayloadRoles,
    privacyExclusions: ["raw robot video", "ROS bags", "local file paths", "hostnames", "API keys"],
    userConsent: "explicit-preview-required",
    cloudAcceptanceEvidence: ["Programs intake receipt", "scope confirmation", "statement-of-work approval"],
    notIncludedInOpen: ["managed reviewer pool", "pricing approval", "statement-of-work execution", "dataset collection services"],
  },
];

export const defaultFilters: FilterState = {
  success: "all",
  reviewed: "all",
  qa: "all",
  embodiment: "all",
  taskTag: "all",
  cluster: "all",
  minInterventions: 0,
  maxLength: 999,
  query: "",
};

export const defaultSort: SortState = {
  field: "readiness",
  direction: "asc",
};

export function filterEpisodes(episodes: Episode[], filters: FilterState): Episode[] {
  const query = filters.query.trim().toLowerCase();

  return episodes.filter((episode) => {
    if (filters.success !== "all" && episode.success !== filters.success) return false;
    if (filters.reviewed !== "all" && episode.reviewed !== filters.reviewed) return false;
    if (filters.qa !== "all" && episode.sensorQaStatus !== filters.qa) return false;
    if (filters.embodiment !== "all" && episode.embodiment !== filters.embodiment) return false;
    if (filters.taskTag !== "all" && !episode.taskTags.includes(filters.taskTag)) return false;
    if (filters.cluster !== "all" && episode.failureCluster !== filters.cluster) return false;
    if (filters.minInterventions > 0 && (episode.interventionCount === null || episode.interventionCount < filters.minInterventions)) return false;
    if (episode.duration !== null && episode.duration > filters.maxLength) return false;
    if (query) {
      const haystack = [episode.id, episode.task, episode.instruction, episode.embodiment, ...episode.taskTags, ...episode.taxonomyTags]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortEpisodes(episodes: Episode[], sort: SortState): Episode[] {
  return [...episodes].sort((left, right) => {
    const leftValue = left[sort.field];
    const rightValue = right[sort.field];
    const direction = sort.direction === "asc" ? 1 : -1;

    if (leftValue === null && rightValue === null) return left.id.localeCompare(right.id);
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
}

export function visibleEpisodes(episodes: Episode[], filters: FilterState, sort: SortState): Episode[] {
  return sortEpisodes(filterEpisodes(episodes, filters), sort);
}

export function qaRank(status: SensorQaStatus): number {
  return status === "pass" ? 0 : status === "warn" ? 1 : status === "fail" ? 2 : 3;
}

export function summarizeDataset(dataset: DatasetTab) {
  const failures = dataset.episodes.filter((episode) => episode.success === "failure").length;
  const reviewed = dataset.episodes.filter((episode) => episode.reviewed === "reviewed").length;
  const knownInterventionCounts = dataset.episodes.flatMap((episode) =>
    episode.interventionCount === null ? [] : [episode.interventionCount],
  );
  const interventions = knownInterventionCounts.reduce((total, value) => total + value, 0);
  const qaFailures = dataset.episodes.filter((episode) => episode.sensorQaStatus === "warn" || episode.sensorQaStatus === "fail").length;
  const qaUnknown = dataset.episodes.filter((episode) => episode.sensorQaStatus === "unknown").length;
  const knownReadiness = dataset.episodes.flatMap((episode) => episode.readiness === null ? [] : [episode.readiness]);
  const avgReadiness = knownReadiness.length
    ? Math.round(knownReadiness.reduce((total, value) => total + value, 0) / knownReadiness.length)
    : null;

  return {
    failures,
    reviewed,
    interventions,
    interventionCoverage: knownInterventionCounts.length,
    qaFailures,
    qaUnknown,
    avgReadiness,
    readinessCoverage: knownReadiness.length,
  };
}

export function readinessTone(value: number | null): "pass" | "warn" | "fail" | "neutral" {
  if (value === null) return "neutral";
  if (value >= 80) return "pass";
  if (value >= 55) return "warn";
  return "fail";
}

export function nextSuccessState(current: SuccessState): SuccessState {
  if (current === "success") return "failure";
  if (current === "failure") return "unknown";
  return "success";
}

export function clampTime(value: number, duration: number | null): number {
  return duration === null ? 0 : Math.min(duration, Math.max(0, value));
}

export function formatTime(seconds: number | null): string {
  if (seconds === null) return "--:--.--";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

export function exportManifest(dataset: DatasetTab, episodes: Episode[], target: string) {
  return {
    product: "Robotics Studio Open",
    target,
    dataset: {
      id: dataset.id,
      name: dataset.name,
      root: dataset.root,
      format: dataset.format,
      declaredFormat: dataset.declaredFormat ?? null,
      provenance: dataset.provenance,
    },
    counts: {
      episodes: episodes.length,
      interventions: episodes.reduce((total, episode) => total + (episode.interventionCount ?? 0), 0),
      interventionCountKnownFor: episodes.filter((episode) => episode.interventionCount !== null).length,
      anomalyNotes: episodes.reduce((total, episode) => total + episode.anomalies.length, 0),
      failureTags: episodes.reduce((total, episode) => total + episode.taxonomyTags.length, 0),
    },
    payloads: intakePayloadRoles,
  };
}

export function buildVirtualWindow<T>(items: T[], start: number, size: number): T[] {
  return items.slice(Math.max(0, start), Math.max(0, start) + Math.max(1, size));
}
