import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Columns3,
  Database,
  Download,
  Eye,
  FileArchive,
  FileJson,
  FileUp,
  Filter,
  FolderOpen,
  Gauge,
  GitMerge,
  GitCompareArrows,
  Grid3X3,
  HardDrive,
  Info,
  Keyboard,
  Layers3,
  Loader2,
  Menu,
  Moon,
  PanelRight,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Search,
  Scissors,
  Send,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  Tags,
  UploadCloud,
  Undo2,
  Wand2,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AuraTelemetryEventLog,
  ProoflineStatus,
} from "@auraone/aura-ide-kit";
import { commands, datasets, probeTrials } from "./data";
import {
  buildVirtualWindow,
  clampTime,
  defaultFilters,
  defaultSort,
  exportManifest,
  formatTime,
  nextSuccessState,
  readinessTone,
  summarizeDataset,
  visibleEpisodes,
} from "./core";
import {
  artifactPlan,
  buildDeterministicClusters,
  buildLocalEvidenceArchive,
  buildProbeReport,
  buildSensorQaReport,
  buildSensorQaMarkdown,
  createDatasetFromLocalFiles,
  downloadBinaryArtifact,
  downloadTextArtifact,
  mergeClusterRows,
  recomputeDeterministicClusters,
  refreshClusterRows,
  splitClusterRows,
  summarizeClusterRows,
  type ExportScope,
  type LocalFileEntry,
} from "./localOperations";
import {
  LocalDiagnosticEventBuffer,
  ROBOTICS_PLATFORM_HOOKS,
  createRoboticsDiagnosticEvent,
  ensureRoboticsIntakeInstallSigningKeypair,
  roboticsIntakeInstallSigningKeypairKey,
  toAuraTelemetryEvents,
  type LocalDiagnosticEntry,
} from "./platformContracts";
import type { Cluster, CommandId, DatasetTab, Density, Episode, ExportTarget, FilterState, Intervention, SensorStream, SortField, SortState, ViewMode } from "./types";

const primaryViews: Array<{ id: ViewMode; label: string; icon: typeof Grid3X3 }> = [
  { id: "browse", label: "Browse", icon: Grid3X3 },
  { id: "scrub", label: "Review", icon: Play },
  { id: "clusters", label: "Failures", icon: Radar },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "qa", label: "Sensor QA", icon: ShieldCheck },
  { id: "export", label: "Export", icon: UploadCloud },
];

const toolViews: Array<{ id: ViewMode; label: string; icon: typeof Grid3X3 }> = [
  { id: "probe", label: "VLA probe", icon: Wand2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const exportTargets: ExportTarget[] = ["HF Hub", "Local disk", "Embodiment card", "Failure gallery", "AuraOne Programs"];
const sensorVisibilityStorageKey = "robostudio:sensor-visibility:v1";
const appVersion = "0.2.0";

type SensorVisibilityStore = Record<string, boolean>;
type UpdateState = "checking" | "current" | "available" | "downloading" | "ready" | "failed" | "unsupported" | "signature-invalid";
type OperationState = "idle" | "running" | "success" | "error";
type AppNotice = {
  tone: "info" | "success" | "warning" | "danger";
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

function RoboticsStudioLogo({ size = "standard" }: { size?: "standard" | "large" }) {
  return (
    <span className={`rs-logo ${size}`} role="img" aria-label="AuraOne Robotics Studio Open">
      <svg className="rs-logo-symbol" viewBox="0 0 72 72" aria-hidden="true">
        <path className="rs-logo-fold" d="M12 14h21l9 9v35H12V14Zm21 0v10h10" />
        <path className="rs-logo-arm" d="M43 34h10l7 7-7 7H43m-8-8h18M27 34v14m-6-7h12" />
      </svg>
      <span className="rs-logo-copy">
        <small>AuraOne Open Studio</small>
        <strong>Robotics Studio</strong>
      </span>
    </span>
  );
}

function readSensorVisibilityStore(): SensorVisibilityStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(sensorVisibilityStorageKey);
    return raw ? JSON.parse(raw) as SensorVisibilityStore : {};
  } catch {
    return {};
  }
}

function applyPersistedSensorVisibility(sourceTabs: DatasetTab[]): DatasetTab[] {
  const store = readSensorVisibilityStore();
  return sourceTabs.map((tab) => ({
    ...tab,
    episodes: tab.episodes.map((episode) => ({
      ...episode,
      sensors: episode.sensors.map((sensor) => {
        const visible = store[`${tab.id}:${sensor.id}`];
        return typeof visible === "boolean" ? { ...sensor, visible } : sensor;
      }),
    })),
  }));
}

function sensorVisibilityStore(tabs: DatasetTab[]): SensorVisibilityStore {
  return Object.fromEntries(
    tabs.flatMap((tab) =>
      tab.episodes.flatMap((episode) =>
        episode.sensors.map((sensor) => [`${tab.id}:${sensor.id}`, sensor.visible] as const),
      ),
    ),
  );
}

export default function App() {
  const [tabs, setTabs] = useState<DatasetTab[]>(() => applyPersistedSensorVisibility(datasets));
  const [activeTabId, setActiveTabId] = useState(datasets[0].id);
  const [view, setView] = useState<ViewMode>("browse");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(datasets[0].episodes[0].id);
  const [cursor, setCursor] = useState(4.21);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [density, setDensity] = useState<Density>("comfortable");
  const [mediaDark, setMediaDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeSensorId, setActiveSensorId] = useState("cam-front");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showPalette, setShowPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [gridOffset, setGridOffset] = useState(0);
  const [exportTarget, setExportTarget] = useState<ExportTarget>("Local disk");
  const [diagnosticBufferEnabled, setDiagnosticBufferEnabled] = useState(false);
  const [diagnosticBuffer] = useState(() => new LocalDiagnosticEventBuffer());
  const [diagnosticEntries, setDiagnosticEntries] = useState<LocalDiagnosticEntry[]>([]);
  const [networkOnline, setNetworkOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [updateState, setUpdateState] = useState<UpdateState>("unsupported");
  const [clusterRows, setClusterRows] = useState<Cluster[]>(() => buildDeterministicClusters(datasets[0].episodes));
  const [clusterHistory, setClusterHistory] = useState<Cluster[][]>([]);
  const [clusterRunState, setClusterRunState] = useState<OperationState>("idle");
  const [clusterProgress, setClusterProgress] = useState(0);
  const [intakeState, setIntakeState] = useState<OperationState>("idle");
  const [intakeMessage, setIntakeMessage] = useState("No browser-selected dataset is open.");
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const navigationTriggerRef = useRef<HTMLButtonElement>(null);
  const navigationCloseRef = useRef<HTMLButtonElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);
  const inspectorCloseRef = useRef<HTMLButtonElement>(null);
  const openDatasetButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const paletteRestoreRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const mobileDrawerLayout = useMediaQuery("(max-width: 760px)");
  const inspectorDrawerLayout = useMediaQuery("(max-width: 1180px)");

  const activeDataset = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const filteredEpisodes = useMemo(() => visibleEpisodes(activeDataset.episodes, filters, sort), [activeDataset.episodes, filters, sort]);
  const visibleGrid = useMemo(() => buildVirtualWindow(filteredEpisodes, gridOffset, density === "ultra" ? 36 : density === "compact" ? 24 : 16), [
    density,
    filteredEpisodes,
    gridOffset,
  ]);
  const selectedEpisode = activeDataset.episodes.find((episode) => episode.id === selectedEpisodeId) ?? filteredEpisodes[0] ?? activeDataset.episodes[0];
  const summary = summarizeDataset(activeDataset);
  const manifest = exportManifest(activeDataset, filteredEpisodes, exportTarget);

  useEffect(() => {
    const syncNetwork = () => setNetworkOnline(navigator.onLine);
    window.addEventListener("online", syncNetwork);
    window.addEventListener("offline", syncNetwork);
    return () => {
      window.removeEventListener("online", syncNetwork);
      window.removeEventListener("offline", syncNetwork);
    };
  }, []);

  useEffect(() => {
    const duration = selectedEpisode.duration;
    if (!playing || duration === null) {
      if (playing) setPlaying(false);
      return;
    }
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsedSeconds = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      setCursor((current) => {
        const next = clampTime(current + elapsedSeconds * speed, duration);
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, selectedEpisode.duration, speed]);

  useEffect(() => {
    const modalOpen = showOnboarding || showPalette;
    const background = Array.from(document.querySelectorAll<HTMLElement>(".topbar,.layout,.statusbar"));
    for (const element of background) {
      element.inert = modalOpen;
      if (modalOpen) {
        element.setAttribute("aria-hidden", "true");
      } else {
        element.removeAttribute("aria-hidden");
      }
    }
    return () => {
      for (const element of background) {
        element.inert = false;
        element.removeAttribute("aria-hidden");
      }
    };
  }, [showOnboarding, showPalette]);

  useEffect(() => {
    if (!notice || notice.onAction) return;
    const timeout = window.setTimeout(() => setNotice(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInteractive = Boolean(target?.closest("button,a,input,textarea,select,summary,[role='button'],[contenteditable='true']"));
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (showOnboarding) return;
        if (showPalette) closeCommandPalette();
        else openCommandPalette();
        return;
      }
      if (mod && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openLocalFilePicker();
        return;
      }
      if (mod && event.key.toLowerCase() === "p") {
        event.preventDefault();
        executeCommand("quick-switch");
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        executeCommand("save-view");
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setView("export");
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setView("export");
        setExportTarget("AuraOne Programs");
        return;
      }
      if (event.key === "Escape") {
        if (showPalette) {
          closeCommandPalette();
          return;
        }
        if (showOnboarding) {
          closeOnboarding();
          return;
        }
        if (sidebarOpen) navigationTriggerRef.current?.focus();
        if (inspectorOpen) inspectorTriggerRef.current?.focus();
        setSidebarOpen(false);
        setInspectorOpen(false);
        return;
      }
      if (isInteractive) return;
      if (event.key === " ") {
        event.preventDefault();
        if (selectedEpisode.duration !== null) setPlaying((value) => !value);
      }
      if (event.key === "ArrowRight") setCursor((value) => clampTime(value + (event.shiftKey ? 10 / 30 : 1 / 30), selectedEpisode.duration));
      if (event.key === "ArrowLeft") setCursor((value) => clampTime(value - (event.shiftKey ? 10 / 30 : 1 / 30), selectedEpisode.duration));
      if (!mod && event.key.toLowerCase() === "j") chooseRelativeEpisode(1);
      if (!mod && event.key.toLowerCase() === "k") chooseRelativeEpisode(-1);
      if (!mod && event.key.toLowerCase() === "t") executeCommand("tag-picker");
      if (!mod && event.key.toLowerCase() === "b") executeCommand("add-phase");
      if (!mod && event.key.toLowerCase() === "r") updateEpisode(selectedEpisode.id, { reviewed: selectedEpisode.reviewed === "reviewed" ? "unreviewed" : "reviewed" });
      if (!mod && event.key.toLowerCase() === "s") updateEpisode(selectedEpisode.id, { success: "success" });
      if (!mod && event.key.toLowerCase() === "f") updateEpisode(selectedEpisode.id, { success: "failure" });
      if (!mod && event.key.toLowerCase() === "c") setView("clusters");
      if (!mod && event.key.toLowerCase() === "v") setView("probe");
      if (!mod && event.key.toLowerCase() === "q") setView("qa");
      if (/^[1-8]$/.test(event.key) && !mod) setSpeed(Number(event.key) <= 4 ? [0.1, 0.25, 0.5, 1][Number(event.key) - 1] : [2, 4, 8, 1][Number(event.key) - 5]);
      if (/^[1-8]$/.test(event.key) && mod) {
        event.preventDefault();
        const tab = tabs[Number(event.key) - 1];
        if (tab) setActiveTabId(tab.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTabId, cursor, filteredEpisodes, filters, inspectorOpen, selectedEpisode, showOnboarding, showPalette, sidebarOpen, sort, tabs]);

  useEffect(() => {
    if (sidebarOpen) navigationCloseRef.current?.focus();
  }, [sidebarOpen]);

  useEffect(() => {
    if (inspectorOpen) inspectorCloseRef.current?.focus();
  }, [inspectorOpen]);

  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.inert = mobileDrawerLayout && !sidebarOpen;
    }
  }, [mobileDrawerLayout, sidebarOpen]);

  useEffect(() => {
    if (inspectorRef.current) {
      inspectorRef.current.inert = inspectorDrawerLayout && !inspectorOpen;
    }
  }, [inspectorDrawerLayout, inspectorOpen]);

  useEffect(() => {
    setClusterRows(buildDeterministicClusters(activeDataset.episodes));
    setClusterHistory([]);
    setClusterRunState("idle");
    setClusterProgress(0);
  }, [activeTabId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(sensorVisibilityStorageKey, JSON.stringify(sensorVisibilityStore(tabs)));
    } catch {
      // Persistence is best-effort; review state remains in-memory if storage is unavailable.
    }
  }, [tabs]);

  function updateFilters(partial: Partial<FilterState>) {
    setGridOffset(0);
    setFilters((current) => ({ ...current, ...partial }));
  }

  function updateEpisode(episodeId: string, partial: Partial<Episode>) {
    const updatedEpisodes = activeDataset.episodes.map((episode) =>
      episode.id === episodeId ? { ...episode, ...partial } : episode
    );
    setTabs((currentTabs) =>
      currentTabs.map((tab) => ({
        ...tab,
        lastSaved: "now",
        episodes: tab.id === activeDataset.id ? updatedEpisodes : tab.episodes,
      })),
    );
    setClusterRows((current) => refreshClusterRows(current, updatedEpisodes));
  }

  function chooseEpisode(episode: Episode) {
    recordDiagnostic("robotics_feature_used", { feature_id: "episode.scrub" });
    setSelectedEpisodeId(episode.id);
    setCursor(0);
    setPlaying(false);
    setView("scrub");
  }

  function chooseRelativeEpisode(delta: number) {
    const index = filteredEpisodes.findIndex((episode) => episode.id === selectedEpisode.id);
    const next = filteredEpisodes[clampIndex(index + delta, filteredEpisodes.length)];
    if (next) chooseEpisode(next);
  }

  function openSampleDataset() {
    recordDiagnostic("robotics_dataset_opened", { format: "lerobot_v3_metadata", episode_count: 96, repository_fixture: true });
    setActiveTabId("so101");
    setSelectedEpisodeId(datasets[0].episodes[0].id);
    setCursor(0);
    setPlaying(false);
    setIntakeState("success");
    setIntakeMessage("Bundled synthetic sample loaded: 96 fixture episodes.");
    setShowOnboarding(false);
    setView("browse");
  }

  function openLocalFilePicker() {
    fileInputRef.current?.click();
  }

  function openLocalDirectoryPicker() {
    directoryInputRef.current?.click();
  }

  async function handleLocalSelection(files: FileList | null) {
    if (!files?.length) return;
    setIntakeState("running");
    setIntakeMessage(`Reading ${files.length} browser-selected file${files.length === 1 ? "" : "s"} locally...`);
    try {
      const entries: LocalFileEntry[] = Array.from(files).map((file) => ({
        name: file.name,
        relativePath: file.webkitRelativePath || undefined,
        text: () => file.text(),
      }));
      const dataset = await createDatasetFromLocalFiles(entries);
      setTabs((current) => [dataset, ...current.filter((tab) => tab.id !== dataset.id)]);
      setActiveTabId(dataset.id);
      setSelectedEpisodeId(dataset.episodes[0].id);
      setFilters(defaultFilters);
      setSort(defaultSort);
      setGridOffset(0);
      setCursor(0);
      setPlaying(false);
      setView("browse");
      setShowOnboarding(false);
      setIntakeState("success");
      setIntakeMessage(`Opened ${dataset.name}: ${dataset.episodes.length} local episode record${dataset.episodes.length === 1 ? "" : "s"}.`);
      setNotice({ tone: "success", message: `Local dataset ${dataset.name} is ready for review.` });
      setClusterRows(buildDeterministicClusters(dataset.episodes));
      setClusterHistory([]);
      recordDiagnostic("robotics_dataset_opened", { format: dataset.format, episode_count: dataset.episodes.length, local_manifest: true });
      window.requestAnimationFrame(() => openDatasetButtonRef.current?.focus());
    } catch (error) {
      const message = error instanceof Error ? error.message : "The selected local input could not be opened.";
      setIntakeState("error");
      setIntakeMessage(message);
      setNotice({ tone: "danger", message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (directoryInputRef.current) directoryInputRef.current.value = "";
    }
  }

  function openCommandPalette() {
    paletteRestoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowPalette(true);
  }

  function closeCommandPalette() {
    setShowPalette(false);
    window.requestAnimationFrame(() => paletteRestoreRef.current?.focus());
  }

  function closeOnboarding() {
    setShowOnboarding(false);
    window.requestAnimationFrame(() => openDatasetButtonRef.current?.focus());
  }

  function runClustering() {
    if (clusterRunState === "running") return;
    setClusterRunState("running");
    setClusterProgress(10);
    setNotice({ tone: "info", message: "Grouping explicit failure metadata from the active dataset." });
    const interval = window.setInterval(() => {
      setClusterProgress((progress) => {
        const next = Math.min(100, progress + 30);
        if (next >= 100) {
          window.clearInterval(interval);
          setClusterRows((current) => {
            setClusterHistory((history) => [...history, current]);
            return recomputeDeterministicClusters(current, activeDataset.episodes);
          });
          setClusterRunState("success");
          const nextCount = buildDeterministicClusters(activeDataset.episodes).length;
          setNotice({
            tone: nextCount ? "success" : "warning",
            message: nextCount
              ? `Recomputed ${nextCount} deterministic clusters from explicit failure fields.`
              : "No explicit failure clusters or failure tags were present; no clusters were fabricated.",
          });
        }
        return next;
      });
    }, 120);
  }

  function splitCluster(clusterId: string) {
    setClusterRows((current) => {
      const next = splitClusterRows(current, clusterId, activeDataset.episodes);
      if (next.length === current.length) {
        setNotice({ tone: "warning", message: "This cluster cannot be split further." });
        return current;
      }
      setClusterHistory((history) => [...history, current]);
      setNotice({
        tone: "success",
        message: `Split ${clusterId} into two deterministic review segments.`,
        actionLabel: "Undo",
        onAction: undoClusters,
      });
      return next;
    });
  }

  function mergeCluster(clusterId: string) {
    setClusterRows((current) => {
      const next = mergeClusterRows(current, clusterId, activeDataset.episodes);
      if (next.length === current.length) {
        setNotice({ tone: "warning", message: "A second cluster is required before merging." });
        return current;
      }
      setClusterHistory((history) => [...history, current]);
      setNotice({
        tone: "success",
        message: `Merged ${clusterId} with its nearest comparison cluster.`,
        actionLabel: "Undo",
        onAction: undoClusters,
      });
      return next;
    });
  }

  function undoClusters() {
    setClusterHistory((history) => {
      const previous = history.at(-1);
      if (previous) {
        setClusterRows(refreshClusterRows(previous, activeDataset.episodes));
        setNotice({ tone: "info", message: "Restored the previous cluster state." });
      }
      return history.slice(0, -1);
    });
  }

  function executeCommand(commandId: CommandId) {
    if (commandId === "open-dataset") openLocalFilePicker();
    if (commandId === "quick-switch") {
      const index = tabs.findIndex((tab) => tab.id === activeTabId);
      const next = tabs[(index + 1) % tabs.length];
      if (next && next.id !== activeTabId) {
        setActiveTabId(next.id);
      } else {
        setNotice({ tone: "info", message: "Only one dataset is open. Import a JSON or JSONL manifest to enable quick switching." });
      }
    }
    if (commandId === "next-episode") chooseRelativeEpisode(1);
    if (commandId === "previous-episode") chooseRelativeEpisode(-1);
    if (commandId === "toggle-play" && selectedEpisode.duration !== null) setPlaying((current) => !current);
    if (commandId === "frame-back") setCursor((current) => clampTime(current - 1 / 30, selectedEpisode.duration));
    if (commandId === "frame-forward") setCursor((current) => clampTime(current + 1 / 30, selectedEpisode.duration));
    if (commandId === "tag-picker") {
      updateEpisode(selectedEpisode.id, {
        taxonomyTags: selectedEpisode.taxonomyTags.includes("org:custom:needs_second_pass")
          ? selectedEpisode.taxonomyTags
          : [...selectedEpisode.taxonomyTags, "org:custom:needs_second_pass"],
      });
      setNotice({ tone: "success", message: "Applied needs_second_pass to the selected episode." });
    }
    if (commandId === "toggle-reviewed") updateEpisode(selectedEpisode.id, { reviewed: selectedEpisode.reviewed === "reviewed" ? "unreviewed" : "reviewed" });
    if (commandId === "mark-success") updateEpisode(selectedEpisode.id, { success: "success" });
    if (commandId === "mark-failure") updateEpisode(selectedEpisode.id, { success: "failure" });
    if (commandId === "add-phase") {
      if (selectedEpisode.duration === null) {
        setNotice({ tone: "warning", message: "This imported record has no duration, so a timed phase boundary cannot be added." });
        closeCommandPalette();
        return;
      }
      updateEpisode(selectedEpisode.id, {
        phases: [...selectedEpisode.phases, {
          id: `review-boundary-${selectedEpisode.phases.length + 1}`,
          label: "review boundary",
          start: cursor,
          end: Math.min(selectedEpisode.duration, cursor + 0.5),
        }],
      });
      setNotice({ tone: "success", message: `Added a review boundary at ${formatTime(cursor)}.` });
    }
    if (commandId === "clusters") setView("clusters");
    if (commandId === "probe") setView("probe");
    if (commandId === "qa") setView("qa");
    if (commandId === "export") setView("export");
    if (commandId === "programs-intake") {
      setExportTarget("AuraOne Programs");
      setView("export");
    }
    if (commandId === "save-view") {
      setTabs((current) => current.map((tab) => tab.id === activeDataset.id ? {
        ...tab,
        savedViews: [...tab.savedViews, {
          id: `saved-${tab.savedViews.length + 1}`,
          name: `Review view ${tab.savedViews.length + 1}`,
          filters,
          sort,
        }],
      } : tab));
      setNotice({ tone: "success", message: "Saved the current filters and sort locally." });
    }
    closeCommandPalette();
  }

  function recordDiagnostic(
    eventName: "robotics_dataset_opened" | "robotics_export_completed" | "robotics_feature_used",
    payload: Record<string, string | number | boolean>,
  ) {
    if (!diagnosticBufferEnabled) return;
    diagnosticBuffer.record(createRoboticsDiagnosticEvent(eventName, payload));
    setDiagnosticEntries([...diagnosticBuffer.list()].reverse());
  }

  return (
    <main className={`app media-${mediaDark ? "dark" : "light"}`} data-pl-theme="light" aria-label="Robotics Studio Open review IDE">
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept=".json,.jsonl,application/json,application/x-ndjson"
        tabIndex={-1}
        aria-label="Select local dataset files"
        onChange={(event) => void handleLocalSelection(event.currentTarget.files)}
      />
      <input
        ref={directoryInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        tabIndex={-1}
        aria-label="Select local dataset folder"
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(event) => void handleLocalSelection(event.currentTarget.files)}
      />
      <header className="topbar">
        <button ref={navigationTriggerRef} className="icon-button navigation-toggle" onClick={() => setSidebarOpen(true)} title="Open navigation" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="workspace-navigation">
          <Menu size={18} />
        </button>
        <div className="brand" role="group" aria-label="Application identity">
          <RoboticsStudioLogo />
          <div className="brand-status">
            <span className="brand-path">
              <DatasetStatus status={activeDataset.status} compact />
              <strong>{activeDataset.name}</strong>
              <em>{activeDataset.indexed.toLocaleString()} ep</em>
              <span className="format-chip">{activeDataset.format}</span>
            </span>
          </div>
        </div>
        <div className="top-actions">
          <button className="search-trigger" onClick={openCommandPalette} title="Open command palette" aria-label="Search commands">
            <Search size={15} />
            <span>Search commands</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="icon-button ghost" onClick={() => setMediaDark((value) => !value)} title="Toggle media inspection contrast" aria-label={`Use ${mediaDark ? "light" : "dark"} media inspection surface`}>
            {mediaDark ? <Moon size={16} /> : <Eye size={16} />}
          </button>
          <button className="icon-button ghost" title="Settings" aria-label="Settings" onClick={() => setView("settings")}>
            <Settings size={16} />
          </button>
          <button className="primary" aria-label="Export evidence" onClick={() => { setExportTarget("Local disk"); setView("export"); }}>
            <FileArchive size={15} />
            Export evidence
          </button>
          <button ref={inspectorTriggerRef} className="icon-button inspector-toggle" onClick={() => setInspectorOpen(true)} title="Open inspector" aria-label="Open inspector" aria-expanded={inspectorOpen} aria-controls="episode-inspector">
            <PanelRight size={18} />
          </button>
        </div>
      </header>

      <section className={`layout ${sidebarOpen ? "sidebar-open" : ""} ${inspectorOpen ? "inspector-open" : "inspector-collapsed"}`}>
        {(sidebarOpen || inspectorOpen) ? <button className="drawer-scrim" onClick={() => { setSidebarOpen(false); setInspectorOpen(false); }} aria-label="Close open drawer" /> : null}
        <aside
          ref={sidebarRef}
          id="workspace-navigation"
          className="sidebar"
          aria-label="Datasets and saved views"
          aria-hidden={mobileDrawerLayout && !sidebarOpen ? "true" : undefined}
          tabIndex={0}
        >
          <div className="drawer-heading">
            <strong>Workspace</strong>
            <button ref={navigationCloseRef} className="icon-button drawer-close" onClick={() => { setSidebarOpen(false); navigationTriggerRef.current?.focus(); }} aria-label="Close navigation"><X size={18} /></button>
          </div>
          <div className="open-input-row">
            <button ref={openDatasetButtonRef} className="open-button" aria-label="Open JSON dataset" onClick={openLocalFilePicker}>
              <FileUp size={15} />
              <span>Open dataset</span>
            </button>
            <button className="icon-button folder-button" onClick={openLocalDirectoryPicker} aria-label="Open dataset folder" title="Choose a local dataset folder">
              <FolderOpen size={16} />
            </button>
          </div>
          <div className={`intake-status ${intakeState}`} role="status">
            <span>{intakeMessage}</span>
            {intakeState === "error" ? <button onClick={openLocalFilePicker}>Try again</button> : null}
          </div>
          <PanelTitle icon={Activity} label="Review workflow" />
          <nav className="mode-list" aria-label="Primary review modes">
            {primaryViews.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} aria-label={item.label} className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => { setView(item.id); setSidebarOpen(false); }}>
                  <Icon size={17} /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <PanelTitle icon={Wrench} label="Tools" />
          <nav className="mode-list" aria-label="Robotics Studio tools">
            {toolViews.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} aria-label={item.label} className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => { setView(item.id); setSidebarOpen(false); }}>
                  <Icon size={17} /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <PanelTitle icon={Database} label="Datasets" />
          <div className="tabs-list" role="tablist" aria-label="Open datasets">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                role="tab"
                aria-label={`Dataset ${tab.name}, ${tab.format}, ${tab.indexed} episode records`}
                aria-selected={tab.id === activeTabId}
                className={tab.id === activeTabId ? "tab active" : "tab"}
                onClick={() => setActiveTabId(tab.id)}
              >
                <DatasetStatus status={tab.status} compact />
                <span className="tab-meta">
                  <strong>{tab.name}</strong>
                  <small>{tab.format} · {tab.indexed.toLocaleString()}</small>
                </span>
                <kbd>{index + 1}</kbd>
              </button>
            ))}
          </div>
          <PanelTitle icon={Filter} label="Filters" />
          <FilterControls filters={filters} sort={sort} setFilters={updateFilters} setSort={setSort} />
          <PanelTitle icon={Save} label="Saved views" />
          {activeDataset.savedViews.length ? (
            activeDataset.savedViews.map((saved) => (
              <button key={saved.id} className="saved-view" onClick={() => { setFilters(saved.filters); setSort(saved.sort); }}>
                {saved.name}
              </button>
            ))
          ) : (
            <p className="muted small">No saved views yet. ⌘⇧V stores the current filter, sort, and columns.</p>
          )}
        </aside>

        <section className="workarea">
          <label className="mobile-view-switch">
            <span>Workspace view</span>
            <select value={view} onChange={(event) => setView(event.target.value as ViewMode)}>
              {[...primaryViews, ...toolViews].map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {activeDataset.status === "error" ? (
            <StateCard icon={XCircle} title="Could not read dataset metadata" text={activeDataset.error ?? "Expected meta/info.json, got null fps."} />
          ) : activeDataset.status === "loading" && view === "browse" ? (
            <LoadingIndex dataset={activeDataset} />
          ) : activeDataset.episodes.length === 0 ? (
            <StateCard icon={Database} title="No episode evidence" text="Open the bundled repository fixture or import a JSON manifest or JSONL episode metadata file." />
          ) : (
            <ViewBody
              view={view}
              density={density}
              setDensity={setDensity}
              dataset={activeDataset}
              selectedEpisode={selectedEpisode}
              filteredEpisodes={filteredEpisodes}
              visibleGrid={visibleGrid}
              gridOffset={gridOffset}
              setGridOffset={setGridOffset}
              cursor={cursor}
              setCursor={setCursor}
              playing={playing}
              setPlaying={setPlaying}
              speed={speed}
              setSpeed={setSpeed}
              chooseEpisode={chooseEpisode}
              updateEpisode={updateEpisode}
              exportTarget={exportTarget}
              setExportTarget={setExportTarget}
              manifest={manifest}
              diagnosticBufferEnabled={diagnosticBufferEnabled}
              setDiagnosticBufferEnabled={setDiagnosticBufferEnabled}
              diagnosticEntries={diagnosticEntries}
              mediaDark={mediaDark}
              setMediaDark={setMediaDark}
              networkOnline={networkOnline}
              updateState={updateState}
              setUpdateState={setUpdateState}
              activeSensorId={activeSensorId}
              setActiveSensorId={setActiveSensorId}
              clusterRows={clusterRows}
              clusterRunState={clusterRunState}
              clusterProgress={clusterProgress}
              runClustering={runClustering}
              splitCluster={splitCluster}
              mergeCluster={mergeCluster}
              recordDiagnostic={recordDiagnostic}
            />
          )}
        </section>

        <aside
          ref={inspectorRef}
          id="episode-inspector"
          className="right-rail"
          aria-label="Episode inspector"
          aria-hidden={inspectorDrawerLayout && !inspectorOpen ? "true" : undefined}
          tabIndex={0}
        >
          <div className="drawer-heading">
            <strong>Inspector</strong>
            <button ref={inspectorCloseRef} className="icon-button drawer-close" onClick={() => { setInspectorOpen(false); inspectorTriggerRef.current?.focus(); }} aria-label="Close inspector"><X size={18} /></button>
          </div>
          <PanelTitle icon={Info} label="Selected episode" />
          <dl className="inspector-record">
            <div><dt>Episode</dt><dd>{selectedEpisode.id}</dd></div>
            <div><dt>Task</dt><dd>{selectedEpisode.task ? selectedEpisode.task.replaceAll("_", " ") : "Unknown"}</dd></div>
            <div><dt>Decision</dt><dd><ProoflineStatus tone={selectedEpisode.reviewed === "reviewed" ? "success" : selectedEpisode.reviewed === "unreviewed" ? "review" : "warning"} label={selectedEpisode.reviewed === "reviewed" ? "Reviewed" : selectedEpisode.reviewed === "unreviewed" ? "Needs review" : "Unknown"} /></dd></div>
            <div><dt>Outcome</dt><dd><ProoflineStatus tone={selectedEpisode.success === "success" ? "success" : selectedEpisode.success === "failure" ? "danger" : "warning"} label={selectedEpisode.success} /></dd></div>
          </dl>
          <PanelTitle icon={Gauge} label="Dataset health" />
          <div className="health-grid">
            <Metric label="Visible" value={`${filteredEpisodes.length} / ${activeDataset.indexed.toLocaleString()}`} />
            <Metric label="Avg readiness" value={summary.avgReadiness === null ? "Unknown" : `${summary.avgReadiness}`} tone={readinessTone(summary.avgReadiness)} />
            <Metric label="Failures" value={summary.failures.toString()} tone={summary.failures ? "warn" : "pass"} />
            <Metric label="QA flags" value={summary.qaUnknown ? `${summary.qaFailures} + ${summary.qaUnknown} unknown` : summary.qaFailures.toString()} tone={summary.qaFailures ? "warn" : summary.qaUnknown ? "neutral" : "pass"} />
          </div>
          <PanelTitle icon={Layers3} label="Sensor streams" />
          <SensorToggles episode={selectedEpisode} updateEpisode={updateEpisode} />
          <PanelTitle icon={Keyboard} label="Shortcuts" />
          <ul className="shortcut-list">
            {commands.slice(0, 7).map((command) => (
              <li key={command.id}>
                <span>{command.title}</span>
                <kbd>{command.key}</kbd>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <footer className="statusbar">
        <ProoflineStatus tone="info" label="Source-build fixture renderer" />
        <ProoflineStatus tone="info" label="Local-only session" />
        <ProoflineStatus tone={networkOnline ? "info" : "blocked"} label={networkOnline ? "Browser online; destinations unverified" : "Browser offline"} />
        <span>{filteredEpisodes.length.toLocaleString()} visible / {activeDataset.indexed.toLocaleString()} episodes</span>
        <span>Saved {activeDataset.lastSaved}</span>
        <span className="status-spacer" />
        <span>v{appVersion}</span>
        <span><kbd>⇧⌘E</kbd> Export</span>
      </footer>

      {notice ? <AppToast notice={notice} close={() => setNotice(null)} /> : null}
      {showOnboarding ? <Onboarding close={closeOnboarding} openSample={openSampleDataset} openLocal={openLocalFilePicker} /> : null}
      {showPalette ? <CommandPalette query={commandQuery} setQuery={setCommandQuery} close={closeCommandPalette} executeCommand={executeCommand} /> : null}
    </main>
  );
}

function ViewBody(props: {
  view: ViewMode;
  density: Density;
  setDensity: (density: Density) => void;
  dataset: DatasetTab;
  selectedEpisode: Episode;
  filteredEpisodes: Episode[];
  visibleGrid: Episode[];
  gridOffset: number;
  setGridOffset: (offset: number) => void;
  cursor: number;
  setCursor: (cursor: number | ((current: number) => number)) => void;
  playing: boolean;
  setPlaying: (playing: boolean | ((current: boolean) => boolean)) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  chooseEpisode: (episode: Episode) => void;
  updateEpisode: (episodeId: string, partial: Partial<Episode>) => void;
  exportTarget: ExportTarget;
  setExportTarget: (target: ExportTarget) => void;
  manifest: ReturnType<typeof exportManifest>;
  diagnosticBufferEnabled: boolean;
  setDiagnosticBufferEnabled: (value: boolean) => void;
  diagnosticEntries: LocalDiagnosticEntry[];
  mediaDark: boolean;
  setMediaDark: (value: boolean) => void;
  networkOnline: boolean;
  updateState: UpdateState;
  setUpdateState: (state: UpdateState) => void;
  activeSensorId: string;
  setActiveSensorId: (sensorId: string) => void;
  clusterRows: Cluster[];
  clusterRunState: OperationState;
  clusterProgress: number;
  runClustering: () => void;
  splitCluster: (clusterId: string) => void;
  mergeCluster: (clusterId: string) => void;
  recordDiagnostic: (
    eventName: "robotics_dataset_opened" | "robotics_export_completed" | "robotics_feature_used",
    payload: Record<string, string | number | boolean>,
  ) => void;
}) {
  if (props.view === "browse") return <BrowseView {...props} />;
  if (props.view === "scrub") return <ScrubView {...props} />;
  if (props.view === "clusters") return <ClusterView {...props} />;
  if (props.view === "compare") return <CompareView dataset={props.dataset} selectedEpisode={props.selectedEpisode} peers={props.filteredEpisodes.slice(1, 4)} />;
  if (props.view === "probe") return <ProbeView dataset={props.dataset} />;
  if (props.view === "qa") return <QaView dataset={props.dataset} />;
  if (props.view === "settings") return <SettingsView {...props} />;
  return <ExportView {...props} />;
}

function SettingsView({
  diagnosticBufferEnabled,
  setDiagnosticBufferEnabled,
  diagnosticEntries,
  mediaDark,
  setMediaDark,
  networkOnline,
  updateState,
  setUpdateState,
}: Pick<
  Parameters<typeof ViewBody>[0],
  "diagnosticBufferEnabled" | "setDiagnosticBufferEnabled" | "diagnosticEntries" | "mediaDark" | "setMediaDark" | "networkOnline" | "updateState" | "setUpdateState"
>) {
  const [intakeIdentityStatus, setIntakeIdentityStatus] = useState(
    "Checking desktop keychain",
  );

  useEffect(() => {
    let cancelled = false;
    void ensureRoboticsIntakeInstallSigningKeypair()
      .then((keypair) => {
        if (!cancelled) {
          setIntakeIdentityStatus(
            `Ed25519 identity stored in the OS keychain · created ${new Date(
              keypair.created_at,
            ).toLocaleDateString()}`,
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setIntakeIdentityStatus(
            error instanceof Error
              ? error.message
              : "Intake identity is unavailable.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="surface settings-surface" aria-label="Settings" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>Settings</h1>
          <p>Inspect local diagnostic buffering, source-build boundaries, and shared platform declarations.</p>
        </div>
      </div>
      <div className="qa-grid">
        <StateLine
          label="Local diagnostic buffer"
          status={diagnosticBufferEnabled ? "pass" : "warn"}
          detail={diagnosticBufferEnabled ? "In-memory preview enabled; delivery is not configured or attempted" : "Disabled; no diagnostic events are retained"}
        />
        <StateLine
          label="Intake install identity"
          status={intakeIdentityStatus.startsWith("Ed25519") ? "pass" : "warn"}
          detail={`${intakeIdentityStatus} · scope ${roboticsIntakeInstallSigningKeypairKey.scope}`}
        />
        <StateLine label="Archive signing" status="warn" detail="Unavailable in this source build; no key is generated or stored" />
        <StateLine label="Release channel" status="warn" detail="Source build / unpublished" />
        <StateLine label="License" status="pass" detail="MIT" />
      </div>
      <div className="settings-grid">
        <section aria-labelledby="appearance-settings">
          <h2 id="appearance-settings">Media inspection</h2>
          <p>The application shell remains light. Dark contrast is bounded to camera, depth, and synchronized media surfaces.</p>
          <label className="setting-line">
            <span>Dark media surface</span>
            <input type="checkbox" checked={mediaDark} onChange={(event) => setMediaDark(event.target.checked)} />
          </label>
        </section>
        <section aria-labelledby="data-boundary-settings">
          <h2 id="data-boundary-settings">Data and network</h2>
          <ProoflineStatus tone="info" label="Dataset processing is local" />
          <ProoflineStatus tone={networkOnline ? "info" : "blocked"} label={networkOnline ? "Browser online; export destinations remain unverified" : "Browser offline; local workflows remain available"} />
        </section>
      </div>
      <label className="setting-line">
        <span>Retain local diagnostic previews in memory</span>
        <input type="checkbox" checked={diagnosticBufferEnabled} onChange={(event) => setDiagnosticBufferEnabled(event.target.checked)} />
      </label>
      <UpdateCenter state={updateState} setState={setUpdateState} />
      <LocalDiagnosticEventLog entries={diagnosticEntries} />
      <article className="manifest">
        <h2>Shared platform declarations</h2>
        <p>These identifiers are available to the source UI. No native robotics engine is connected.</p>
        <pre role="region" tabIndex={0} aria-label="Shared platform declarations JSON">{JSON.stringify(ROBOTICS_PLATFORM_HOOKS, null, 2)}</pre>
      </article>
    </section>
  );
}

function BrowseView({
  density,
  setDensity,
  visibleGrid,
  filteredEpisodes,
  gridOffset,
  setGridOffset,
  chooseEpisode,
}: Pick<Parameters<typeof ViewBody>[0], "density" | "setDensity" | "visibleGrid" | "filteredEpisodes" | "gridOffset" | "setGridOffset" | "chooseEpisode">) {
  const failures = filteredEpisodes.filter((episode) => episode.success === "failure").length;
  const needsReview = filteredEpisodes.filter((episode) => episode.reviewed !== "reviewed").length;
  const qaWarnings = filteredEpisodes.filter((episode) => episode.sensorQaStatus === "warn" || episode.sensorQaStatus === "fail").length;
  const qaUnknown = filteredEpisodes.filter((episode) => episode.sensorQaStatus === "unknown").length;
  const knownReadiness = filteredEpisodes.flatMap((episode) => episode.readiness === null ? [] : [episode.readiness]);
  const avgReadiness = knownReadiness.length
    ? Math.round(knownReadiness.reduce((total, value) => total + value, 0) / knownReadiness.length)
    : null;

  return (
    <section className="surface" aria-label="Episode browser" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>Dataset browser</h1>
          <p>Prioritize the episodes that need a human decision before export.</p>
        </div>
        <div className="segmented" role="group" aria-label="Grid density">
          {(["comfortable", "compact", "ultra"] as Density[]).map((option) => (
            <button key={option} className={density === option ? "active" : ""} onClick={() => setDensity(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="review-summary" role="region" aria-label="Filtered review summary">
        <article className="lead">
          <span>Visible episodes</span>
          <strong>{filteredEpisodes.length.toLocaleString()}</strong>
          <em>of {filteredEpisodes.length.toLocaleString()} filtered</em>
        </article>
        <article>
          <span>Needs review</span>
          <strong>{needsReview.toLocaleString()}</strong>
        </article>
        <article>
          <span>Failures</span>
          <strong className={failures ? "tone-fail" : ""}>{failures.toLocaleString()}</strong>
        </article>
        <article>
          <span>Avg readiness</span>
          <strong>{avgReadiness ?? "Unknown"}</strong>
        </article>
        <article>
          <span>Sensor QA</span>
          <strong className={qaWarnings ? "tone-warn" : ""}>{qaUnknown ? `${qaWarnings} + ${qaUnknown} unknown` : qaWarnings.toLocaleString()}</strong>
        </article>
      </div>
      <div className={`episode-grid ${density}`}>
        {visibleGrid.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} onSelect={chooseEpisode} />
        ))}
      </div>
      <div className="pager">
        <button
          onClick={() => setGridOffset(Math.max(0, gridOffset - visibleGrid.length))}
          disabled={gridOffset === 0}
          title={gridOffset === 0 ? "The first episode window is already visible." : undefined}
        >
          <SkipBack size={15} /> Previous window
        </button>
        <span>Rows {gridOffset + 1}-{Math.min(gridOffset + visibleGrid.length, filteredEpisodes.length)} of {filteredEpisodes.length}</span>
        <button
          onClick={() => setGridOffset(Math.min(Math.max(0, filteredEpisodes.length - visibleGrid.length), gridOffset + visibleGrid.length))}
          disabled={gridOffset + visibleGrid.length >= filteredEpisodes.length}
          title={gridOffset + visibleGrid.length >= filteredEpisodes.length ? "The final episode window is already visible." : undefined}
        >
          Next window <SkipForward size={15} />
        </button>
      </div>
    </section>
  );
}

function SensorPreview({ size = "card", embodiment, badge, foot, synthetic = true }: {
  size?: "card" | "cluster" | "compare" | "plane" | "banner";
  embodiment?: string | null;
  badge?: { tone: "pass" | "warn" | "fail" | "neutral"; label: string };
  foot?: { label: string; meta?: string };
  synthetic?: boolean;
}) {
  return (
    <div className={`sensor-preview ${size}`}>
      {synthetic ? <SyntheticSensorScene sensorId="cam-front" compact /> : <ManifestMetadataScene compact />}
      {badge || embodiment ? (
        <div className="sensor-preview-overlay">
          {badge ? (
            <span className={`episode-state ${badge.tone}`}>
              <i />
              {badge.label}
            </span>
          ) : <span />}
          {embodiment ? <span className="episode-embodiment">{embodiment}</span> : null}
        </div>
      ) : null}
      {foot ? (
        <div className="sensor-preview-foot">
          <span className="episode-task">{foot.label}</span>
          {foot.meta ? <span className="episode-duration">{foot.meta}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ViewContext({ dataset, summary, label }: {
  dataset: DatasetTab;
  summary: ReturnType<typeof summarizeDataset>;
  label: string;
}) {
  return (
    <div className="view-context" role="group" aria-label="Dataset context">
      <SensorPreview size="banner" embodiment={dataset.format} synthetic={dataset.provenance.kind === "repository-synthetic-fixture"} />
      <div className="view-context-meta">
        <span className="view-context-eyebrow">{label}</span>
        <strong className="view-context-name">{dataset.name}</strong>
        <span className="view-context-root">{dataset.root}</span>
      </div>
      <dl className="view-context-stats">
        <div>
          <dt>Episodes</dt>
          <dd>{dataset.episodes.length}<small>/{dataset.indexed.toLocaleString()}</small></dd>
        </div>
        <div>
          <dt>Avg readiness</dt>
          <dd className={`tone-${readinessTone(summary.avgReadiness)}`}>{summary.avgReadiness ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Failures</dt>
          <dd className={summary.failures ? "tone-fail" : ""}>{summary.failures}</dd>
        </div>
        <div>
          <dt>QA flags</dt>
          <dd className={summary.qaFailures ? "tone-warn" : ""}>{summary.qaUnknown ? `${summary.qaFailures} + ${summary.qaUnknown} unknown` : summary.qaFailures}</dd>
        </div>
      </dl>
    </div>
  );
}

function interventionTone(why: Intervention["why"]): "fail" | "warn" | "info" {
  if (why === "safety stop") return "fail";
  if (why === "detected anomaly" || why === "manual override") return "warn";
  return "info";
}

function InterventionStrip({ episode }: { episode: Episode }) {
  const duration = episode.duration;
  if (episode.interventionCount === null || duration === null) {
    return <span className="intervention-empty" aria-hidden="true">unknown</span>;
  }
  if (episode.interventionCount === 0) {
    return <span className="intervention-empty" aria-hidden="true">no interventions</span>;
  }
  return (
    <span className="intervention-strip" aria-hidden="true">
      {episode.interventions.map((intervention) => (
        intervention.start === null || intervention.end === null ? null :
        <i
          key={intervention.id}
          className={`tone-${interventionTone(intervention.why)}`}
          style={{
            left: `${(intervention.start / duration) * 100}%`,
            width: `${Math.max(4, ((intervention.end - intervention.start) / duration) * 100)}%`,
          }}
        />
      ))}
    </span>
  );
}

function EpisodeCard({ episode, onSelect }: { episode: Episode; onSelect: (episode: Episode) => void }) {
  const successTone = episode.success === "success" ? "pass" : episode.success === "failure" ? "fail" : "warn";
  const qaTone = episode.sensorQaStatus === "pass" ? "pass" : episode.sensorQaStatus === "fail" ? "fail" : episode.sensorQaStatus === "warn" ? "warn" : "neutral";
  const sensorBadges = episode.sensors.slice(0, 3);
  const readinessClass = readinessTone(episode.readiness);
  const taskLabel = episode.task ? episode.task.replaceAll("_", " ") : "Task unknown";
  const readinessLabel = episode.readiness === null ? "Unknown" : `${episode.readiness}`;
  return (
    <button className="episode-card" onClick={() => onSelect(episode)} aria-label={`Open ${episode.id}`}>
      <SensorPreview
        size="card"
        embodiment={episode.embodiment}
        badge={{ tone: successTone, label: episode.success }}
        foot={{ label: taskLabel, meta: formatTime(episode.duration) }}
        synthetic={episode.provenance === "repository-synthetic-fixture"}
      />
      <div className="episode-card-body">
        <div className="episode-card-topline">
          <strong>{episode.id}</strong>
          <span className={`episode-readiness-pill ${readinessClass}`}>{readinessLabel}</span>
        </div>
        <div className="readiness-track" aria-hidden="true">
          <i style={{ width: `${episode.readiness ?? 0}%` }} />
        </div>
        <div className="episode-meta">
          <span className="meta-cell meta-interventions">
            <CircleDot size={11} />
            <span className="meta-label">{episode.interventionCount === null ? "intv unknown" : `${episode.interventionCount} intv`}</span>
            <InterventionStrip episode={episode} />
          </span>
          <span className="meta-cell"><ShieldCheck size={11} /> QA {episode.sensorQaStatus}</span>
        </div>
        <div className="sensor-dots" aria-hidden="true">
          {sensorBadges.map((sensor) => (
            <span key={sensor.id} className={`sensor-dot ${sensor.kind}`} title={sensor.label} />
          ))}
          {episode.sensors.length > sensorBadges.length ? (
            <span className="sensor-dot-more">+{episode.sensors.length - sensorBadges.length}</span>
          ) : null}
          <span className={`chip-mini ${qaTone}`}>{episode.reviewed === "reviewed" ? "reviewed" : episode.reviewed === "unreviewed" ? "needs review" : "review unknown"}</span>
        </div>
      </div>
    </button>
  );
}

function ScrubView({
  dataset,
  selectedEpisode,
  cursor,
  setCursor,
  playing,
  setPlaying,
  speed,
  setSpeed,
  updateEpisode,
  activeSensorId,
  setActiveSensorId,
}: Pick<Parameters<typeof ViewBody>[0], "dataset" | "selectedEpisode" | "cursor" | "setCursor" | "playing" | "setPlaying" | "speed" | "setSpeed" | "updateEpisode" | "activeSensorId" | "setActiveSensorId">) {
  const visualSensors = selectedEpisode.sensors.filter((sensor) => sensor.visible && (sensor.kind === "rgb" || sensor.kind === "depth"));
  const telemetrySensors = selectedEpisode.sensors.filter((sensor) => sensor.visible && sensor.kind !== "rgb" && sensor.kind !== "depth" && sensor.kind !== "language");
  const activeSensor = visualSensors.find((sensor) => sensor.id === activeSensorId) ?? visualSensors[0];
  const taskTitle = humanTaskTitle(selectedEpisode.task);
  const synthetic = dataset.provenance.kind === "repository-synthetic-fixture";
  const duration = selectedEpisode.duration;
  const frameStep = selectedEpisode.frameRateHz ? 1 / selectedEpisode.frameRateHz : 0.01;
  return (
    <section className="surface scrub-surface" aria-label="Episode scrubber" tabIndex={0}>
      <div className="review-heading">
        <div className="review-title">
          <span className="eyebrow">Evidence review</span>
          <h1>{taskTitle}</h1>
          <p><code>{selectedEpisode.id}</code><span>{selectedEpisode.embodiment ?? "Embodiment unknown"}</span><span>{formatTime(duration)}</span></p>
        </div>
        <div className="decision-actions" role="group" aria-label="Episode decision">
          <button className={`decision-button outcome-${selectedEpisode.success}`} onClick={() => updateEpisode(selectedEpisode.id, { success: nextSuccessState(selectedEpisode.success) })}>
            <BadgeCheck size={16} /><span>Outcome</span><strong>{selectedEpisode.success}</strong>
          </button>
          <button className={selectedEpisode.reviewed === "reviewed" ? "decision-button confirmed" : "decision-button"} onClick={() => updateEpisode(selectedEpisode.id, { reviewed: selectedEpisode.reviewed === "reviewed" ? "unreviewed" : "reviewed" })}>
            <CheckCircle2 size={16} /><span>Decision</span><strong>{selectedEpisode.reviewed === "reviewed" ? "Reviewed" : "Mark reviewed"}</strong>
          </button>
        </div>
      </div>
      <div className="review-cockpit">
        <div className="evidence-column">
          <figure
            className={`evidence-viewport ${activeSensor?.kind ?? "unknown"}`}
            aria-label={activeSensor
              ? `${activeSensor.label} ${synthetic ? "synthetic evidence" : "imported manifest metadata"} viewport`
              : "No visual sensor evidence declared in imported manifest"}
          >
            {activeSensor
              ? synthetic
                ? <SyntheticSensorScene sensorId={activeSensor.id} />
                : <ManifestMetadataScene sensor={activeSensor} />
              : <ManifestMetadataScene />}
            <figcaption>
              <span className="synthetic-label">{synthetic ? "Synthetic repository evidence" : "Imported manifest metadata"}</span>
              <strong>{activeSensor?.label ?? "No visual sensor evidence"}</strong>
              <span>
                {activeSensor?.rateHz === null || activeSensor === undefined ? "Rate unknown" : `${activeSensor.rateHz} Hz`}
                {selectedEpisode.frameRateHz ? ` · frame ${Math.round(cursor * selectedEpisode.frameRateHz)}` : ""}
                {duration === null ? "" : ` · ${formatTime(cursor)}`}
              </span>
            </figcaption>
          </figure>
          {visualSensors.length ? (
            <div className="sensor-selector" role="tablist" aria-label="Evidence sensors">
              {visualSensors.map((sensor) => (
                <button
                  key={sensor.id}
                  role="tab"
                  aria-label={`${sensor.label}, ${sensor.kind === "depth" ? "depth map" : "RGB camera"}, health ${sensor.status}`}
                  aria-selected={sensor.id === activeSensor?.id}
                  className={sensor.id === activeSensor?.id ? "sensor-option active" : "sensor-option"}
                  onClick={() => setActiveSensorId(sensor.id)}
                >
                  <span className={`sensor-thumb ${sensor.kind}`}>
                    {synthetic ? <SyntheticSensorScene sensorId={sensor.id} compact /> : <ManifestMetadataScene sensor={sensor} compact />}
                  </span>
                  <span><strong>{sensor.label.replace("RGB ", "").replace("Depth ", "")}</strong><small>{sensor.kind === "depth" ? "Depth map" : "RGB camera"} · {sensor.status}</small></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sensor-empty" role="status">No RGB or depth sensor records were declared in this manifest.</div>
          )}
        </div>
        <aside className="evidence-context" aria-label="Language and telemetry">
          <section className="instruction-card">
            <span>Language instruction</span>
            <p>{selectedEpisode.instruction ?? "Unknown; no instruction field was imported."}</p>
          </section>
          <section className="telemetry-stack">
            <div className="telemetry-heading"><strong>Telemetry</strong><span>cursor aligned</span></div>
            {telemetrySensors.length ? telemetrySensors.map((sensor, index) => (
              <article key={sensor.id} className={`telemetry-row ${sensor.kind}`}>
                <div><strong>{sensor.label}</strong><span>{sensor.rateHz === null ? "Rate unknown" : `${sensor.rateHz} Hz`} · {sensor.status}</span></div>
                {sensor.samples.length
                  ? <Sparkline values={sensor.samples} accentKey={sensor.kind} fallbackIndex={index} />
                  : <span className="telemetry-unknown">No samples declared</span>}
              </article>
            )) : <p className="telemetry-unknown">No non-visual sensor records were declared.</p>}
          </section>
        </aside>
      </div>
      <div className="review-dock" data-testid="review-dock">
        <div className="transport">
          <button disabled={duration === null} title={duration === null ? "No duration was declared for this imported episode." : undefined} onClick={() => setCursor((value) => clampTime(value - frameStep, duration))} aria-label="Previous frame"><SkipBack size={16} /></button>
          <button disabled={duration === null} title={duration === null ? "Playback requires an imported duration." : undefined} className="play-button" onClick={() => setPlaying((current) => !current)} aria-label={playing ? "Pause episode" : "Play episode"}>{playing ? <Square size={16} /> : <Play size={16} />}</button>
          <button disabled={duration === null} title={duration === null ? "No duration was declared for this imported episode." : undefined} onClick={() => setCursor((value) => clampTime(value + frameStep, duration))} aria-label="Next frame"><SkipForward size={16} /></button>
          <strong data-testid="playback-time">{duration === null ? "Time unknown" : formatTime(cursor)} <span>/ {formatTime(duration)}</span></strong>
          <select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {[0.1, 0.25, 0.5, 1, 2, 4, 8].map((option) => <option key={option} value={option}>{option}x</option>)}
          </select>
        </div>
        <div className="timeline" role="group" aria-label="Synchronized episode timeline">
          <div className="phase-strip">
            {duration === null ? null : selectedEpisode.phases.map((phase) => (
              phase.start === null || phase.end === null ? null :
              <span key={phase.id} style={{ left: `${(phase.start / duration) * 100}%`, width: `${((phase.end - phase.start) / duration) * 100}%` }}>
                {phase.label}
              </span>
            ))}
          </div>
          <div className="marker-strip">
            {duration === null ? null : selectedEpisode.interventions.map((intervention) => (
              intervention.start === null || intervention.end === null ? null :
              <span
                key={intervention.id}
                className={`marker tone-${interventionTone(intervention.why)}`}
                aria-hidden="true"
                title={`${intervention.why}: ${intervention.outcome}`}
                style={{ left: `${(intervention.start / duration) * 100}%`, width: `${Math.max(1.5, ((intervention.end - intervention.start) / duration) * 100)}%` }}
              />
            ))}
            {duration === null ? null : selectedEpisode.anomalies.map((anomaly) => (
              anomaly.start === null ? null :
              <i key={anomaly.id} className={`anomaly tone-${anomaly.severity === "error" ? "fail" : anomaly.severity === "warn" ? "warn" : "info"}`} style={{ left: `${(anomaly.start / duration) * 100}%` }} title={anomaly.note} />
            ))}
          </div>
          <input
            aria-label="Frame-accurate scrubber"
            type="range"
            min={0}
            max={duration ?? 0}
            value={cursor}
            step="any"
            disabled={duration === null}
            onChange={(event) => setCursor(Number(event.target.value))}
          />
        </div>
      </div>
      <details className="accessible-data">
        <summary>Timeline records</summary>
        <div className="table-scroll" role="region" aria-label="Ordered timeline records" tabIndex={0}>
          <table>
            <thead><tr><th>Time</th><th>Type</th><th>Record</th><th>Outcome</th></tr></thead>
            <tbody>
              {selectedEpisode.phases.map((phase) => <tr key={phase.id}><td>{formatTime(phase.start)}-{formatTime(phase.end)}</td><td>Phase</td><td>{phase.label}</td><td>Sequence</td></tr>)}
              {selectedEpisode.interventions.map((intervention) => <tr key={intervention.id}><td>{formatTime(intervention.start)}-{formatTime(intervention.end)}</td><td>Intervention</td><td>{intervention.why}</td><td>{intervention.outcome}</td></tr>)}
              {selectedEpisode.anomalies.map((anomaly) => <tr key={anomaly.id}><td>{formatTime(anomaly.start)}-{formatTime(anomaly.end)}</td><td>{anomaly.severity}</td><td>{anomaly.sensorId}</td><td>{anomaly.note}</td></tr>)}
            </tbody>
          </table>
        </div>
      </details>
      <ReviewEditors episode={selectedEpisode} />
    </section>
  );
}

function ReviewEditors({ episode }: { episode: Episode }) {
  return (
    <div className="review-editors">
      <article>
        <h2><Tags size={16} /> Failure taxonomy</h2>
        <div className="chips">
          {episode.taxonomyTags.length ? episode.taxonomyTags.map((tag) => <Chip key={tag} label={tag} tone="warn" />) : <Chip label="T opens keyboard taxonomy picker" />}
        </div>
      </article>
      <article>
        <h2><AlertTriangle size={16} /> Intervention tags</h2>
        {episode.interventions.map((intervention) => (
          <p key={intervention.id}><strong>{formatTime(intervention.start)}</strong> {intervention.why}; {intervention.outcome}</p>
        ))}
      </article>
      <article>
        <h2><FileJson size={16} /> Anomaly notes</h2>
        {episode.anomalies.map((anomaly) => (
          <p key={anomaly.id}><strong>{anomaly.sensorId}</strong> {anomaly.severity}: {anomaly.note}</p>
        ))}
      </article>
    </div>
  );
}

function ClusterView({
  dataset,
  chooseEpisode,
  clusterRows,
  clusterRunState,
  clusterProgress,
  runClustering,
  splitCluster,
  mergeCluster,
}: Pick<
  Parameters<typeof ViewBody>[0],
  "dataset" | "chooseEpisode" | "clusterRows" | "clusterRunState" | "clusterProgress" | "runClustering" | "splitCluster" | "mergeCluster"
>) {
  const episodes = dataset.episodes;
  const aggregate = summarizeClusterRows(clusterRows, episodes);
  const synthetic = dataset.provenance.kind === "repository-synthetic-fixture";
  return (
    <section className="surface cluster-surface" aria-label="Failure intelligence" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>Failure intelligence</h1>
          <p>Group explicit failure fields locally, then review, split, merge, and reverse deterministic changes.</p>
        </div>
        <button aria-label={clusterRunState === "running" ? `Clustering ${clusterProgress}%` : "Run clustering"} onClick={runClustering} disabled={clusterRunState === "running"}>
          {clusterRunState === "running" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
          <span className="cluster-run-long">{clusterRunState === "running" ? `Clustering ${clusterProgress}%` : "Run clustering"}</span>
          <span className="cluster-run-short">{clusterRunState === "running" ? `${clusterProgress}%` : "Run"}</span>
        </button>
      </div>
      <DatasetProvenanceNote dataset={dataset} context="Deterministic local clustering uses only fields present in the active records." />
      {clusterRunState === "running" ? <progress className="operation-progress" value={clusterProgress} max={100} aria-label="Clustering progress" /> : null}
      <div className="cluster-list">
        {!clusterRows.length ? (
          <StateCard
            icon={Radar}
            title="No declared failure clusters"
            text="The active dataset has no explicit failure outcome, failure-cluster field, or failure taxonomy tag. Run clustering after importing those fields."
          />
        ) : null}
        {clusterRows.map((cluster) => {
          const representative = episodes.find((episode) => episode.id === cluster.representativeEpisodeId) ?? episodes[0];
          if (!representative) return null;
          return (
            <article key={cluster.id} className="cluster-row" data-testid="failure-card">
              <SensorPreview
                size="banner"
                badge={{ tone: cluster.trainingDecision === "exclude from training" ? "fail" : readinessTone(cluster.readiness), label: `${cluster.size} ep` }}
                synthetic={synthetic}
              />
              <div className="cluster-summary">
                <span className="cluster-id">{cluster.id} · {representative.embodiment ?? "embodiment unknown"}</span>
                <h2>{cluster.title}</h2>
                <p>{cluster.dominantTag ?? "Dominant taxonomy tag unknown"}</p>
              </div>
              <dl className="cluster-metrics">
                <div><dt>Episodes</dt><dd className="numeric">{cluster.size}</dd></div>
                <div><dt>Readiness</dt><dd className={`${typeof cluster.readiness === "number" ? "numeric " : ""}tone-${readinessTone(cluster.readiness)}`}>{cluster.readiness ?? "Unknown"}</dd></div>
                <div><dt>Homogeneity</dt><dd className={typeof cluster.homogeneity === "number" ? "numeric" : undefined}>{cluster.homogeneity ?? "Unknown"}</dd></div>
              </dl>
              <div className="cluster-decision">
                <Chip label={cluster.trainingDecision} tone={cluster.trainingDecision === "exclude from training" ? "fail" : cluster.trainingDecision === "training-ready" ? "pass" : cluster.trainingDecision === "unknown" ? "neutral" : "warn"} />
                <div className="row-actions">
                  <button className="primary cluster-review-action" onClick={() => chooseEpisode(representative)}>
                    <Eye size={15} />
                    <span className="cluster-review-long">Review evidence</span>
                    <span className="cluster-review-short">Review</span>
                  </button>
                  <button className="tertiary" aria-label={`Split ${cluster.title} cluster`} onClick={() => splitCluster(cluster.id)}><Scissors size={15} /><span>Split</span></button>
                  <button className="tertiary" aria-label={`Merge ${cluster.title} cluster`} onClick={() => mergeCluster(cluster.id)} disabled={clusterRows.length < 2} title={clusterRows.length < 2 ? "A second cluster is required before merging." : "Merge with the nearest comparison cluster"}><GitMerge size={15} /><span>Merge</span></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="dashboard-row">
        <Metric label="Recovery success" value={aggregate.recoverySuccess === null ? "Unknown" : `${aggregate.recoverySuccess}%`} tone={aggregate.recoverySuccess === null ? "neutral" : aggregate.recoverySuccess >= 75 ? "pass" : "warn"} />
        <Metric label="Median time to intervention" value={aggregate.medianTimeToIntervention === null ? "Unknown" : `${aggregate.medianTimeToIntervention}s`} tone={aggregate.medianTimeToIntervention === null ? "neutral" : "warn"} />
        <Metric label="Cluster homogeneity" value={aggregate.clusterHomogeneity === null ? "Unknown" : aggregate.clusterHomogeneity.toFixed(2)} tone={aggregate.clusterHomogeneity === null ? "neutral" : aggregate.clusterHomogeneity >= 0.75 ? "pass" : "warn"} />
      </div>
      <details className="accessible-data">
        <summary>Failure cluster records</summary>
        <div className="table-scroll" role="region" aria-label="Failure cluster table" tabIndex={0}>
          <table>
            <thead><tr><th>Cluster</th><th>Episodes</th><th>Dominant tag</th><th>Readiness</th><th>Decision</th></tr></thead>
            <tbody>{clusterRows.map((cluster) => <tr key={cluster.id}><td>{cluster.title}</td><td>{cluster.size}</td><td>{cluster.dominantTag ?? "Unknown"}</td><td>{cluster.readiness ?? "Unknown"}</td><td>{cluster.trainingDecision}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function CompareView({ dataset, selectedEpisode, peers }: { dataset: DatasetTab; selectedEpisode: Episode; peers: Episode[] }) {
  const compared = [selectedEpisode, ...peers.slice(0, 1)];
  const synthetic = dataset.provenance.kind === "repository-synthetic-fixture";
  return (
    <section className="surface" aria-label="Episode metadata compare" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>Compare</h1>
          <p>Compare declared episode metadata and available sensor samples without inferring missing model or simulation evidence.</p>
        </div>
        <button disabled title="Model-input mapping requires an adapter plugin that is not connected in this source build."><Columns3 size={16} /> Map model inputs</button>
      </div>
      <div className="compare-grid">
        {compared.map((episode, index) => {
          const sampledSensor = episode.sensors.find((sensor) => sensor.samples.length);
          return (
          <article key={episode.id} className="compare-pane">
            <SensorPreview
              size="compare"
              embodiment={episode.embodiment}
              badge={{ tone: index === 0 ? "pass" : "warn", label: index === 0 ? "reference" : "candidate" }}
              foot={{ label: episode.task?.replaceAll("_", " ") ?? "Task unknown", meta: formatTime(episode.duration) }}
              synthetic={synthetic}
            />
            <h2>{episode.id}</h2>
            {sampledSensor
              ? <Sparkline values={sampledSensor.samples} accentKey={sampledSensor.kind} fallbackIndex={index} />
              : <p className="telemetry-unknown">No sensor samples were declared.</p>}
          </article>
          );
        })}
      </div>
      <div className="table-scroll" role="region" aria-label="Compared episode fields" tabIndex={0}>
        <table>
          <thead><tr><th>Field</th>{compared.map((episode) => <th key={episode.id}>{episode.id}</th>)}</tr></thead>
          <tbody>
            <tr><th>Task</th>{compared.map((episode) => <td key={episode.id}>{episode.task ?? "Unknown"}</td>)}</tr>
            <tr><th>Duration</th>{compared.map((episode) => <td key={episode.id}>{formatTime(episode.duration)}</td>)}</tr>
            <tr><th>Frame rate</th>{compared.map((episode) => <td key={episode.id}>{episode.frameRateHz === null ? "Unknown" : `${episode.frameRateHz} Hz`}</td>)}</tr>
            <tr><th>Readiness</th>{compared.map((episode) => <td key={episode.id}>{episode.readiness ?? "Unknown"}</td>)}</tr>
            <tr><th>Sensor QA</th>{compared.map((episode) => <td key={episode.id}>{episode.sensorQaStatus}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProbeView({ dataset }: { dataset: DatasetTab }) {
  const summary = summarizeDataset(dataset);
  const [policy, setPolicy] = useState("mock");
  const [trialCount, setTrialCount] = useState(4);
  const [probeState, setProbeState] = useState<OperationState>("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ReturnType<typeof buildProbeReport> | null>(null);
  const visibleTrials = report?.trials ?? probeTrials.slice(0, trialCount);

  function runProbe() {
    if (policy !== "mock" || probeState === "running") return;
    setProbeState("running");
    setProgress(10);
    setReport(null);
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 30);
        if (next >= 100) {
          window.clearInterval(interval);
          setReport(buildProbeReport(dataset, probeTrials, trialCount));
          setProbeState("success");
        }
        return next;
      });
    }, 120);
  }

  function downloadReport() {
    if (!report) return;
    downloadTextArtifact(`${dataset.name}-vla-probe.json`, `${JSON.stringify(report, null, 2)}\n`, "application/json");
  }

  function downloadMarkdown() {
    if (!report) return;
    const rows = report.trials.map((trial) => `| ${trial.perturbation} | ${trial.status} | ${trial.latencyMs} ms | ${trial.description} |`).join("\n");
    const markdown = [
      `# Deterministic VLA probe: ${dataset.name}`,
      "",
      `Provenance: ${dataset.provenance.label}`,
      `Requested trials: ${report.requestedTrials}`,
      `Executed trials: ${report.executedTrials}`,
      "",
      "| Perturbation | Result | Latency | Description |",
      "| --- | --- | --- | --- |",
      rows,
      "",
      report.recommendation,
      "",
    ].join("\n");
    downloadTextArtifact(`${dataset.name}-vla-probe.md`, markdown, "text/markdown;charset=utf-8");
  }

  return (
    <section className="surface" aria-label="VLA robustness probe" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>VLA robustness probe</h1>
          <p>Run one to four deterministic local mock perturbations against the active dataset metadata.</p>
        </div>
        <button onClick={runProbe} disabled={policy !== "mock" || probeState === "running"} title={policy !== "mock" ? "BYO policy adapters are not connected in this source build. Select deterministic mock." : undefined}>
          {probeState === "running" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
          {probeState === "running" ? `Running ${progress}%` : "Run probe"}
        </button>
      </div>
      <ViewContext dataset={dataset} summary={summary} label="Probe target" />
      <div className="probe-config">
        <label>Policy<select value={policy} onChange={(event) => setPolicy(event.target.value)}><option value="mock">Deterministic local mock</option><option value="onnx" disabled>ONNX unavailable</option><option value="pytorch" disabled>PyTorch unavailable</option><option value="hf" disabled>Hosted model unavailable</option></select></label>
        <label>Trials<input type="number" value={trialCount} min={1} max={4} onChange={(event) => setTrialCount(Math.min(4, Math.max(1, Math.round(Number(event.target.value) || 1))))} /></label>
        <label>Artifact destination<input value="Browser downloads" readOnly aria-readonly="true" /></label>
      </div>
      {policy !== "mock" ? <div className="operation-note"><ProoflineStatus tone="blocked" label="Selected policy adapter is unavailable in this source build" /></div> : null}
      {probeState === "running" ? <progress className="operation-progress" value={progress} max={100} aria-label="Probe progress" /> : null}
      <div className="trial-list">
        {visibleTrials.map((trial) => (
          <div key={trial.id} className="trial-row">
            <Chip label={trial.perturbation} />
            <strong>{trial.description}</strong>
            <span>{trial.latencyMs ? `${trial.latencyMs} ms` : "-"}</span>
            <Chip label={trial.status} tone={trial.status === "fail" ? "fail" : trial.status === "pass" ? "pass" : "warn"} />
          </div>
        ))}
      </div>
      <article className="report-preview">
        <h2>Inline report</h2>
        <p>{report?.recommendation ?? "Run the deterministic mock probe to generate a local source-build result."}</p>
        {report ? <div className="row-actions"><button onClick={downloadReport}><FileJson size={16} /> Download JSON</button><button onClick={downloadMarkdown}><Download size={16} /> Export Markdown</button></div> : null}
      </article>
    </section>
  );
}

function QaView({ dataset }: { dataset: DatasetTab }) {
  const report = buildSensorQaReport(dataset);
  const summary = summarizeDataset(dataset);
  const [exported, setExported] = useState(false);
  function exportMarkdown() {
    downloadTextArtifact(`${dataset.name}-sensor-qa.md`, buildSensorQaMarkdown(dataset), "text/markdown;charset=utf-8");
    setExported(true);
  }
  return (
    <section className="surface" aria-label="Sensor QA" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>Sensor QA</h1>
          <p>Compute checks only from sample rates and QA fields declared in the active records; missing evidence remains unknown.</p>
        </div>
        <button onClick={exportMarkdown}><Download size={16} /> Export Markdown</button>
      </div>
      <ViewContext dataset={dataset} summary={summary} label="QA target" />
      <div className="qa-grid">
        {report.checks.map((check) => <StateLine key={check.id} label={check.label} status={check.status} detail={check.detail} />)}
      </div>
      <article className="report-preview">
        <h2>Metadata coverage</h2>
        <p>{report.sensorRecordCount} sensor records across {report.episodeCount} episodes were evaluated. Overall status: {report.overallStatus}. Provenance: {dataset.provenance.label}.</p>
        {exported ? <ProoflineStatus tone="success" label="Markdown downloaded locally" /> : null}
      </article>
    </section>
  );
}

function ExportView({
  dataset,
  filteredEpisodes,
  exportTarget,
  setExportTarget,
  manifest,
  clusterRows,
  recordDiagnostic,
}: Pick<Parameters<typeof ViewBody>[0], "dataset" | "filteredEpisodes" | "exportTarget" | "setExportTarget" | "manifest" | "clusterRows" | "recordDiagnostic">) {
  const summary = summarizeDataset(dataset);
  const [expandedStep, setExpandedStep] = useState<"source" | "destination" | "scope" | "artifacts">("artifacts");
  const [exportState, setExportState] = useState<OperationState>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [includeInterventions, setIncludeInterventions] = useState(true);
  const [includeSensorQa, setIncludeSensorQa] = useState(true);
  const [includeEmbodimentCard, setIncludeEmbodimentCard] = useState(true);
  const [exportMessage, setExportMessage] = useState("No archive generated in this session.");
  const networkTarget = exportTarget === "HF Hub" || exportTarget === "AuraOne Programs";
  const scope: ExportScope = {
    includeInterventions,
    includeSensorQa,
    includeEmbodimentCard,
  };
  const plannedArtifacts = artifactPlan(exportTarget, scope);

  function chooseTarget(target: ExportTarget) {
    setExportTarget(target);
    setExportState(target === "HF Hub" || target === "AuraOne Programs" ? "error" : "idle");
    setExportProgress(0);
    setExportMessage(target === "HF Hub" || target === "AuraOne Programs"
      ? `${target} requires authentication and an upload adapter that are not configured.`
      : "Ready to generate a browser-downloaded ZIP archive.");
  }

  async function startExport() {
    if (networkTarget || exportState === "running") {
      if (networkTarget) setExportState("error");
      return;
    }
    setExportState("running");
    setExportProgress(20);
    setExportMessage("Hashing selected artifacts...");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setExportProgress(60);
    try {
      const archive = await buildLocalEvidenceArchive({
        manifest,
        dataset,
        episodes: filteredEpisodes,
        clusters: clusterRows,
        target: exportTarget,
        scope,
      });
      setExportProgress(90);
      downloadBinaryArtifact(archive.filename, archive.bytes, archive.mimeType);
      setExportProgress(100);
      setExportState("success");
      setExportMessage(`${archive.filename} downloaded with ${archive.entries.length} verified entries.`);
      recordDiagnostic("robotics_export_completed", {
        target: exportTarget,
        episodes: filteredEpisodes.length,
        local_download: true,
        archive_entries: archive.entries.length,
      });
    } catch (error) {
      setExportState("error");
      setExportProgress(0);
      setExportMessage(error instanceof Error ? error.message : "The local ZIP archive could not be generated.");
    }
  }

  function toggleStep(step: "source" | "destination" | "scope" | "artifacts") {
    setExpandedStep((current) => current === step ? "artifacts" : step);
  }

  return (
    <section className="surface export-surface" aria-label="Export" tabIndex={0}>
      <div className="section-head">
        <div>
          <h1>Export</h1>
          <p>Confirm source, destination, scope, and real archive contents before generating a local evidence ZIP.</p>
        </div>
      </div>
      <DatasetProvenanceNote dataset={dataset} context="Archive contents are generated from the active filtered records." />
      <ol className="export-sequence">
        <li className={`export-step completed ${expandedStep === "source" ? "expanded" : ""}`} data-export-step="source">
          <span className="step-number">1</span>
          <div className="step-content">
            <button className="step-toggle" aria-expanded={expandedStep === "source"} onClick={() => toggleStep("source")}>
              <span><strong>Source</strong><small>{dataset.name} · {dataset.episodes.length} episodes</small></span>
              <ChevronDown size={16} />
            </button>
            <div className="step-detail"><ViewContext dataset={dataset} summary={summary} label="Source dataset" /></div>
          </div>
        </li>
        <li className={`export-step completed ${expandedStep === "destination" ? "expanded" : ""}`} data-export-step="destination">
          <span className="step-number">2</span>
          <div className="step-content">
            <button className="step-toggle" aria-expanded={expandedStep === "destination"} onClick={() => toggleStep("destination")}>
              <span><strong>Destination</strong><small>{exportTarget}{networkTarget ? " · not configured" : " · local download"}</small></span>
              <ChevronDown size={16} />
            </button>
            <div className="step-detail">
              <div className="target-list">
                {exportTargets.map((target) => (
                  <button key={target} className={exportTarget === target ? "active" : ""} onClick={() => chooseTarget(target)}>
                    {target === "HF Hub" ? <UploadCloud size={16} /> : target === "Local disk" ? <HardDrive size={16} /> : target === "AuraOne Programs" ? <Send size={16} /> : <BookOpen size={16} />}
                    <span>{target}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </li>
        <li className={`export-step completed ${expandedStep === "scope" ? "expanded" : ""}`} data-export-step="scope">
          <span className="step-number">3</span>
          <div className="step-content">
            <button className="step-toggle" aria-expanded={expandedStep === "scope"} onClick={() => toggleStep("scope")}>
              <span><strong>Scope</strong><small>{filteredEpisodes.length} filtered records · metadata artifacts only</small></span>
              <ChevronDown size={16} />
            </button>
            <div className="step-detail">
              <div className="export-scope">
                <label><input type="checkbox" checked readOnly /> Reviewed filtered subset <strong>{filteredEpisodes.length} episodes</strong></label>
                <label><input type="checkbox" checked={includeInterventions} onChange={(event) => setIncludeInterventions(event.target.checked)} /> Include intervention and anomaly records</label>
                <label><input type="checkbox" checked={includeSensorQa} onChange={(event) => setIncludeSensorQa(event.target.checked)} /> Include sensor QA evidence</label>
                <label><input type="checkbox" checked={includeEmbodimentCard} onChange={(event) => setIncludeEmbodimentCard(event.target.checked)} /> Include embodiment card</label>
                <p className="scope-boundary">Raw media and selected local paths are never included by this source build.</p>
              </div>
            </div>
          </div>
        </li>
        <li className={`export-step ${expandedStep === "artifacts" ? "expanded" : ""}`} data-export-step="artifacts">
          <span className="step-number">4</span>
          <div className="step-content">
            <button className="step-toggle" aria-expanded={expandedStep === "artifacts"} onClick={() => toggleStep("artifacts")}>
              <span><strong>Artifacts</strong><small>{plannedArtifacts.length} deterministic file{plannedArtifacts.length === 1 ? "" : "s"}</small></span>
              <ChevronDown size={16} />
            </button>
            <div className="step-detail">
              <div className="artifact-grid" role="region" aria-label="Generated export artifacts" tabIndex={0}>
                {plannedArtifacts.length ? plannedArtifacts.map((artifact) => (
                  <article key={artifact.name}>
                    {artifact.kind === "card" ? <BookOpen size={18} /> : artifact.kind === "qa" ? <ShieldCheck size={18} /> : artifact.kind === "checksum" ? <BadgeCheck size={18} /> : <FileJson size={18} />}
                    <strong>{artifact.name}</strong>
                    <span>{artifact.description}</span>
                  </article>
                )) : <p>No local artifacts are available for this network destination.</p>}
              </div>
            </div>
          </div>
        </li>
      </ol>
      <section className="export-confirmation" data-export-step="confirmation">
        <div>
          <span className="eyebrow">Ready to confirm</span>
          <h2>{exportTarget}</h2>
          <p>{filteredEpisodes.length} filtered records from {dataset.name}; {plannedArtifacts.length} archive entries are currently selected.</p>
          {networkTarget ? (
            <div className="handoff-disclosure">
              <ProoflineStatus tone="blocked" label="Network destination not configured" />
              <p>This source build can prepare a local manifest but cannot authenticate or upload to {exportTarget}. Choose a local destination to download evidence.</p>
            </div>
          ) : (
            <ProoflineStatus tone="info" label="Browser-downloaded local ZIP" />
          )}
          {exportState === "error" ? <ProoflineStatus tone="danger" label={networkTarget ? "Export blocked: destination is not configured" : "Local download could not be generated"} /> : null}
          {exportState === "success" ? <ProoflineStatus tone="success" label="Local evidence ZIP downloaded" /> : null}
          {exportState === "running" ? <progress className="operation-progress" value={exportProgress} max={100} aria-label="Export progress" /> : null}
          {exportState !== "idle" ? <p className="export-state-message" role="status">{exportMessage}</p> : null}
        </div>
        <button
          className="primary export-cta"
          onClick={startExport}
          disabled={networkTarget || exportState === "running"}
          title={networkTarget ? `${exportTarget} authentication and upload are not configured in this source build.` : "Generate and download a deterministic local ZIP archive"}
        >
          {exportState === "running" ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
          {exportState === "running" ? `Preparing ${exportProgress}%` : exportState === "success" ? "Download ZIP again" : "Confirm and export ZIP"}
        </button>
      </section>
      <details className="manifest raw-manifest">
        <summary>Raw manifest preview</summary>
        <pre role="region" tabIndex={0} aria-label="Raw export manifest">{JSON.stringify(manifest, null, 2)}</pre>
      </details>
    </section>
  );
}

function FilterControls({
  filters,
  sort,
  setFilters,
  setSort,
}: {
  filters: FilterState;
  sort: SortState;
  setFilters: (partial: Partial<FilterState>) => void;
  setSort: (sort: SortState) => void;
}) {
  return (
    <div className="filter-stack">
      <label><span>Search</span><input value={filters.query} onChange={(event) => setFilters({ query: event.target.value })} placeholder="episode, task, tag" /></label>
      <label><span>Success</span><select value={filters.success} onChange={(event) => setFilters({ success: event.target.value as FilterState["success"] })}><option>all</option><option>success</option><option>failure</option><option>unknown</option></select></label>
      <label><span>Reviewed</span><select value={filters.reviewed} onChange={(event) => setFilters({ reviewed: event.target.value as FilterState["reviewed"] })}><option>all</option><option>reviewed</option><option>unreviewed</option><option>unknown</option></select></label>
      <label><span>Sensor QA</span><select value={filters.qa} onChange={(event) => setFilters({ qa: event.target.value as FilterState["qa"] })}><option>all</option><option>pass</option><option>warn</option><option>fail</option></select></label>
      <label><span>Min interventions</span><input type="number" min={0} value={filters.minInterventions} onChange={(event) => setFilters({ minInterventions: Number(event.target.value) })} /></label>
      <label><span>Max seconds</span><input type="number" min={1} value={filters.maxLength} onChange={(event) => setFilters({ maxLength: Number(event.target.value) })} /></label>
      <label><span>Sort</span><select value={sort.field} onChange={(event) => setSort({ ...sort, field: event.target.value as SortField })}><option>readiness</option><option>duration</option><option>interventionCount</option><option>sensorQaStatus</option><option>date</option><option>id</option></select></label>
      <button onClick={() => setSort({ ...sort, direction: sort.direction === "asc" ? "desc" : "asc" })}>Direction: {sort.direction} <ChevronDown size={14} /></button>
    </div>
  );
}

function SensorToggles({ episode, updateEpisode }: { episode: Episode; updateEpisode: (episodeId: string, partial: Partial<Episode>) => void }) {
  return (
    <div className="sensor-list">
      {episode.sensors.map((sensor, index) => (
        <button
          key={sensor.id}
          className={sensor.visible ? "active" : ""}
          onClick={() => updateEpisode(episode.id, { sensors: episode.sensors.map((entry) => entry.id === sensor.id ? { ...entry, visible: !entry.visible } : entry) })}
        >
          <span>{index + 1}. {sensor.label}</span>
          <Chip label={sensor.status} tone={sensor.status === "pass" ? "pass" : sensor.status === "fail" ? "fail" : "warn"} />
        </button>
      ))}
    </div>
  );
}

function CommandPalette({
  query,
  setQuery,
  close,
  executeCommand,
}: {
  query: string;
  setQuery: (query: string) => void;
  close: () => void;
  executeCommand: (commandId: CommandId) => void;
}) {
  const dialogRef = useDialogFocusTrap(close);
  const results = commands.filter((command) => `${command.title} ${command.group} ${command.key}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section ref={dialogRef} className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-search"><Search size={18} /><input data-autofocus aria-label="Search commands" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every command" /></div>
        <div className="command-results">
          {results.map((command) => (
            <button key={command.id} type="button" onClick={() => executeCommand(command.id)}>
              <span><strong>{command.title}</strong><small>{command.group}</small></span>
              <kbd>{command.key}</kbd>
            </button>
          ))}
          {!results.length ? <p className="command-empty">No matching local command.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Onboarding({ close, openSample, openLocal }: { close: () => void; openSample: () => void; openLocal: () => void }) {
  const dialogRef = useDialogFocusTrap(close);

  function chooseLocalDataset() {
    close();
    window.setTimeout(openLocal, 0);
  }

  return (
    <div className="modal-backdrop onboarding-backdrop" role="presentation">
      <section ref={dialogRef} className="onboarding" role="dialog" aria-modal="true" aria-label="First-run onboarding">
        <div className="onboarding-grid">
          <div className="onboarding-copy">
            <RoboticsStudioLogo size="large" />
            <span className="eyebrow">Robotics Studio Open v{appVersion}</span>
            <h1>Start a local robot evidence review.</h1>
            <p>No AuraOne account is required. Your dataset remains on this machine unless you choose an explicit network export.</p>
            <ol className="first-run-steps">
              <li><strong>Choose metadata</strong><span>Open JSON or JSONL episode metadata, or use the bundled synthetic SO-101 fixture.</span></li>
              <li><strong>Confirm provenance</strong><span>Imported fields stay distinct from repository fixture evidence.</span></li>
              <li><strong>Review evidence</strong><span>Inspect declared sensors, events, failures, and QA without filling unknown fields.</span></li>
              <li><strong>Export locally</strong><span>Generate a checksummed ZIP containing only the selected metadata artifacts.</span></li>
            </ol>
            <div className="onboarding-actions">
              <button data-autofocus className="primary" onClick={openSample}>
                <Play size={15} />
                Explore sample
              </button>
              <button className="ghost" onClick={chooseLocalDataset}>Open my dataset</button>
              <button className="ghost" onClick={close}>Dismiss</button>
            </div>
            <dl className="onboarding-facts" role="group" aria-label="What this build does">
              <div><dt>Intake</dt><dd>JSON manifests and JSONL episode records</dd></div>
              <div><dt>Evidence</dt><dd>Only fields declared by the selected metadata</dd></div>
              <div><dt>Export</dt><dd>Local ZIP, embodiment card, or failure gallery</dd></div>
            </dl>
          </div>
          <aside className="onboarding-preview" aria-label="Sample review preview">
            <div className="preview-topline">
              <span className="preview-name">
                <CheckCircle2 size={15} aria-hidden="true" />
                so101_kitchen_v3
              </span>
              <Chip label="96 visible" tone="pass" />
            </div>
            <div className="preview-media" aria-hidden="true">
              <span className="preview-media-main" />
              <span className="preview-media-sub" />
              <span className="preview-media-sub" />
            </div>
            <div className="preview-timeline" aria-hidden="true">
              <i style={{ left: "6%", width: "16%" }} />
              <i style={{ left: "26%", width: "20%" }} />
              <i style={{ left: "52%", width: "24%" }} />
              <i style={{ left: "82%", width: "12%" }} />
              <b style={{ left: "44%" }} />
            </div>
            <div className="preview-stats">
              <article><span>Records</span><strong>96</strong></article>
              <article><span>Seed scenes</span><strong>3</strong></article>
              <article><span>Control rate</span><strong>30 Hz</strong></article>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function LoadingIndex({ dataset }: { dataset: DatasetTab }) {
  return (
    <section className="surface centered" aria-live="polite">
      <Loader2 className="spin" size={32} />
      <h1>Indexing {dataset.name}</h1>
      <p>Validated {dataset.indexed.toLocaleString()} of {dataset.totalEstimate.toLocaleString()} metadata records in browser memory. No binary adapter or local database is active.</p>
      <progress value={dataset.indexed} max={dataset.totalEstimate} />
    </section>
  );
}

function StateCard({ icon: Icon, title, text }: { icon: typeof AlertTriangle; title: string; text: string }) {
  return <section className="surface centered"><Icon size={34} /><h1>{title}</h1><p>{text}</p></section>;
}

function StateLine({ label, status, detail }: { label: string; status: SensorStream["status"]; detail: string }) {
  const tone = status === "pass" ? "success" : status === "fail" ? "danger" : status === "warn" ? "warning" : "info";
  const statusLabel = status === "pass" ? "Pass" : status === "fail" ? "Failed" : status === "warn" ? "Review" : "Unknown";
  return <article className="state-line"><ProoflineStatus tone={tone} label={statusLabel} /><strong>{label}</strong><span>{detail}</span></article>;
}

function LocalDiagnosticEventLog({ entries }: { entries: LocalDiagnosticEntry[] }) {
  return (
    <section className="diagnostic-log" aria-labelledby="diagnostic-log-title">
      <div className="diagnostic-log-heading">
        <h2 id="diagnostic-log-title">Local diagnostic event preview</h2>
        <ProoflineStatus tone="info" label={`${entries.length} retained in memory`} />
      </div>
      <p>No delivery endpoint is configured, and these preview records are not sent by this source build.</p>
      <AuraTelemetryEventLog events={toAuraTelemetryEvents(entries)} />
      {entries.length === 0 ? (
        <p className="muted">
          No local diagnostic previews have been retained in this session.
        </p>
      ) : null}
    </section>
  );
}

function DatasetProvenanceNote({ dataset, context }: { dataset: DatasetTab; context: string }) {
  const synthetic = dataset.provenance.kind === "repository-synthetic-fixture";
  return (
    <div className={`sample-provenance ${synthetic ? "synthetic" : "imported"}`} role="note" aria-label="Dataset provenance">
      <Info size={16} aria-hidden="true" />
      <strong>{synthetic ? "Synthetic sample" : dataset.provenance.label}</strong>
      <span>{dataset.provenance.recordCount} records{dataset.provenance.seedSceneCount ? ` from ${dataset.provenance.seedSceneCount} seed scenes` : ""}. {context}</span>
    </div>
  );
}

function AppToast({ notice, close }: { notice: AppNotice; close: () => void }) {
  const action = notice.onAction;
  return (
    <div className={`app-toast ${notice.tone}`} role={notice.tone === "danger" ? "alert" : "status"} aria-live="polite">
      <span>{notice.message}</span>
      {action && notice.actionLabel ? (
        <button
          type="button"
          onClick={() => {
            close();
            action();
          }}
        >
          <Undo2 size={15} />
          {notice.actionLabel}
        </button>
      ) : null}
      <button type="button" className="icon-button" onClick={close} aria-label="Dismiss notification"><X size={15} /></button>
    </div>
  );
}

function useDialogFocusTrap(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "summary",
      "[tabindex]:not([tabindex='-1'])",
      "[contenteditable='true']",
    ].join(",");
    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.hidden && element.getClientRects().length > 0);
    const initial = dialog.querySelector<HTMLElement>("[data-autofocus]") ?? focusableElements()[0] ?? dialog;
    const frame = window.requestAnimationFrame(() => initial.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return dialogRef;
}

function PanelTitle({ icon: Icon, label }: { icon: typeof Filter; label: string }) {
  return <h2 className="panel-title"><Icon size={15} /> {label}</h2>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "pass" | "warn" | "fail" }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "pass" | "warn" | "fail" }) {
  return <span className={`chip ${tone}`}>{label}</span>;
}

function Sparkline({ values, accentKey, fallbackIndex }: { values: number[]; accentKey: SensorStream["kind"]; fallbackIndex: number }) {
  const max = Math.max(...values, 1);
  const accent = sensorAccentVar(accentKey, fallbackIndex);
  return <div className="sparkline" role="img" aria-label="Sensor time-series plot">{values.map((value, index) => <span key={index} style={{ height: `${Math.max(8, (value / max) * 100)}%`, background: accent }} />)}</div>;
}

function humanTaskTitle(task: string | null) {
  if (!task) return "Task unknown";
  return task
    .replace(/_v\d+$/i, "")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function SyntheticSensorScene({ sensorId, compact = false }: { sensorId: string; compact?: boolean }) {
  const isWrist = sensorId.includes("wrist");
  const isDepth = sensorId.includes("depth");
  const label = isDepth ? "Synthetic depth view of robot grasping a cup" : isWrist ? "Synthetic wrist camera view of gripper and cup" : "Synthetic front camera view of robot workcell";
  const source = isWrist
    ? "/media/synthetic-workcell-wrist-v1.webp"
    : "/media/synthetic-workcell-front-v1.webp";
  const mode = isDepth ? "depth" : isWrist ? "wrist" : "front";
  const channelLabel = isDepth ? "Depth overhead" : isWrist ? "RGB wrist" : "RGB front";

  return (
    <div
      className={`synthetic-scene synthetic-scene--${mode}${compact ? " synthetic-scene--compact" : ""}`}
      role={compact ? undefined : "img"}
      aria-label={compact ? undefined : label}
      aria-hidden={compact ? "true" : undefined}
      data-synthetic-source="repository-generated-media"
    >
      <img
        className="synthetic-scene__image"
        src={source}
        alt=""
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {isDepth ? (
        <span className="synthetic-scene__depth-grid" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : null}
      {!compact ? (
        <>
          <span className="synthetic-scene__channel">
            <i aria-hidden="true" />
            {channelLabel}
          </span>
          <span className="synthetic-scene__crosshair" aria-hidden="true" />
          <span className="synthetic-scene__provenance">
            <strong>Synthetic media</strong>
            <span>Repository fixture</span>
          </span>
        </>
      ) : null}
    </div>
  );
}

function ManifestMetadataScene({ sensor, compact = false }: { sensor?: SensorStream; compact?: boolean }) {
  const label = sensor?.label ?? "No visual sensor declared";
  const rate = sensor?.rateHz === null || sensor === undefined ? "Rate unknown" : `${sensor.rateHz} Hz`;
  const accessibleLabel = sensor
    ? `Imported manifest metadata for ${sensor.label}; no media evidence was parsed`
    : "Imported manifest contains no visual media evidence";
  return (
    <svg
      className="synthetic-scene manifest-metadata-scene"
      viewBox="0 0 960 540"
      role={compact ? undefined : "img"}
      aria-label={compact ? undefined : accessibleLabel}
      aria-hidden={compact ? "true" : undefined}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="960" height="540" fill="#101820" />
      <path d="M0 90h960M0 180h960M0 270h960M0 360h960M0 450h960" stroke="#526572" strokeOpacity="0.28" />
      <path d="M160 0v540M320 0v540M480 0v540M640 0v540M800 0v540" stroke="#526572" strokeOpacity="0.22" />
      <rect x="210" y="90" width="540" height="360" rx="6" fill="#18242d" stroke="#7d8d98" strokeWidth="3" />
      <path d="M300 166h155l48 48v160H300Z" fill="#eef2f6" stroke="#101820" strokeWidth="5" />
      <path d="M455 166v50h50" fill="none" stroke="#101820" strokeWidth="5" />
      <path d="M350 272h102M350 306h102M350 340h72" stroke="#007582" strokeWidth="9" strokeLinecap="round" />
      {!compact ? (
        <g>
          <text x="540" y="205" fill="#ffffff" fontFamily="var(--pl-font-ui)" fontSize="22" fontWeight="700">Manifest metadata</text>
          <text x="540" y="252" fill="#aebbc5" fontFamily="var(--pl-font-ui)" fontSize="18">No media evidence parsed</text>
          <text x="540" y="306" fill="#ffffff" fontFamily="var(--pl-font-ui)" fontSize="17">{label}</text>
          <text x="540" y="340" fill="#7dcfd4" fontFamily="var(--pl-font-mono)" fontSize="16">{rate}</text>
          <rect x="20" y="20" width="245" height="34" rx="4" fill="#101820" stroke="#526572" />
          <circle cx="39" cy="37" r="6" fill="#e5ad42" />
          <text x="55" y="42" fill="#ffffff" fontFamily="var(--pl-font-ui)" fontSize="16" fontWeight="700">Imported metadata only</text>
        </g>
      ) : null}
    </svg>
  );
}

function sensorAccentVar(kind: SensorStream["kind"], fallbackIndex: number) {
  const variables: Record<SensorStream["kind"], string> = {
    rgb: "var(--sensor-rgb)",
    depth: "var(--sensor-depth)",
    joint: "var(--sensor-joint)",
    pose: "var(--sensor-pose)",
    force: "var(--sensor-force)",
    audio: "var(--sensor-audio)",
    language: "var(--sensor-language)",
    custom: "var(--sensor-custom)",
  };

  return variables[kind] ?? `var(--accent-${(fallbackIndex % 4) + 1})`;
}

function DatasetStatus({ status, compact = false }: { status: DatasetTab["status"]; compact?: boolean }) {
  const tone = status === "ready" ? "success" : status === "loading" ? "review" : status === "error" ? "danger" : "blocked";
  const label = status === "ready" ? "Ready" : status === "loading" ? "Indexing" : status === "error" ? "Error" : "Empty";
  return <span className={compact ? "compact-status" : ""}><ProoflineStatus tone={tone} label={label} /></span>;
}

function UpdateCenter({ state, setState }: { state: UpdateState; setState: (state: UpdateState) => void }) {
  const content: Record<UpdateState, { tone: "success" | "info" | "review" | "warning" | "danger" | "blocked"; title: string; detail: string; action?: string }> = {
    checking: { tone: "review", title: "Checking update configuration", detail: "Looking for a signed release channel without asserting a published build." },
    current: { tone: "blocked", title: "Published release status unavailable", detail: `Version ${appVersion} is running from source; no stable publication is asserted.`, action: "Recheck configuration" },
    available: { tone: "blocked", title: "Release metadata unavailable", detail: "This unpublished source build cannot verify that an update exists." },
    downloading: { tone: "blocked", title: "Download unavailable", detail: "No signed update package is configured for this source build." },
    ready: { tone: "blocked", title: "Restart update unavailable", detail: "No verified update has been downloaded by this source build." },
    failed: { tone: "danger", title: "Update configuration check failed", detail: "The source build could not verify a signed release channel. Local work is unaffected.", action: "Try again" },
    unsupported: { tone: "blocked", title: "Release channel unavailable", detail: "Version 0.2.0 is an unpublished source build and is not connected to a signed update channel." },
    "signature-invalid": { tone: "danger", title: "Signature verification failed", detail: "No installation was attempted because release verification did not pass." },
  };
  const current = content[state];
  function advance() {
    if (state === "current" || state === "failed") {
      setState("checking");
      window.setTimeout(() => setState("unsupported"), 650);
    }
  }
  return (
    <section className="update-center" aria-label="Software update" aria-live="polite">
      <div>
        <ProoflineStatus tone={current.tone} label={current.title} />
        <p>{current.detail}</p>
      </div>
      {current.action ? <button onClick={advance}><RefreshCw size={15} /> {current.action}</button> : null}
    </section>
  );
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}
