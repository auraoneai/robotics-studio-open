import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Box,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Columns3,
  Database,
  Download,
  FileJson,
  Filter,
  Gauge,
  GitCompareArrows,
  Grid3X3,
  HardDrive,
  HelpCircle,
  Keyboard,
  Layers3,
  Loader2,
  Maximize2,
  Moon,
  Play,
  Plus,
  Radar,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  Sun,
  Tags,
  UploadCloud,
  Wand2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuraTelemetryEventLog } from "@auraone/aura-ide-kit";
import { clusters, commands, datasets, probeTrials } from "./data";
import {
  buildVirtualWindow,
  clampTime,
  defaultFilters,
  defaultSort,
  exportManifest,
  formatTime,
  nextSuccessState,
  summarizeDataset,
  visibleEpisodes,
} from "./core";
import {
  ROBOTICS_PLATFORM_HOOKS,
  TelemetryEventLog,
  createRoboticsTelemetryEvent,
  ensureRoboticsIntakeInstallSigningKeypair,
  toAuraTelemetryEvents,
  type TelemetryLogEntry,
} from "./platformContracts";
import type { DatasetTab, Density, Episode, ExportTarget, FilterState, Intervention, SensorStream, SortField, SortState, ThemeMode, ViewMode } from "./types";

const viewTabs: Array<{ id: ViewMode; label: string; icon: typeof Grid3X3 }> = [
  { id: "browse", label: "Browse", icon: Grid3X3 },
  { id: "scrub", label: "Scrub", icon: Play },
  { id: "clusters", label: "Failures", icon: Radar },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "probe", label: "VLA probe", icon: Wand2 },
  { id: "qa", label: "Sensor QA", icon: ShieldCheck },
  { id: "export", label: "Export", icon: UploadCloud },
  { id: "settings", label: "Settings", icon: Settings },
];

const exportTargets: ExportTarget[] = ["HF Hub", "Local disk", "Embodiment card", "Failure gallery", "AuraOne Programs"];
const sensorVisibilityStorageKey = "robostudio:sensor-visibility:v1";

type SensorVisibilityStore = Record<string, boolean>;

function RoboticsStudioLogo({ size = "standard" }: { size?: "standard" | "large" }) {
  return (
    <span className={`rs-logo ${size}`} role="img" aria-label="RS Robotics Studio logo">
      <svg className="rs-logo-symbol" viewBox="0 0 72 72" aria-hidden="true">
        <defs>
          <linearGradient id="rs-logo-mark" x1="8" x2="64" y1="8" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#52d3e8" />
            <stop offset="0.52" stopColor="#7fdc83" />
            <stop offset="1" stopColor="#f3c65a" />
          </linearGradient>
        </defs>
        <rect className="rs-logo-mark-shell" x="2" y="2" width="68" height="68" rx="16" />
        <rect x="8" y="8" width="56" height="56" rx="12" fill="url(#rs-logo-mark)" />
        <path className="rs-logo-mark-line" d="M17 23h13c6.8 0 10.8 3.4 10.8 8.5 0 3.5-1.9 6.1-5.3 7.5l7.2 10.7h-9.8l-6.1-9.3h-2.1v9.3H17V23Zm12.4 11.3c2.7 0 4.1-1 4.1-2.9s-1.4-2.9-4.1-2.9h-4.7v5.8h4.7Z" />
        <path className="rs-logo-mark-line" d="M49.5 22.6c4.1 0 7.3 1 9.6 3.1l-3.8 5.6a11 11 0 0 0-6-1.9c-2.1 0-3.3.7-3.3 1.9 0 1.3 1.3 1.8 5.3 2.7 5.4 1.2 8.8 3.2 8.8 8.1 0 5.2-4.1 8.6-10.6 8.6-5.1 0-9-1.5-11.7-4l4.1-5.7c2.2 1.9 4.9 2.8 7.4 2.8 2.1 0 3.3-.7 3.3-2 0-1.5-1.5-2-5.8-3-4.9-1.1-8.5-3-8.5-7.9 0-4.9 4.1-8.3 11.2-8.3Z" />
      </svg>
      <span className="rs-logo-copy">
        <small>RS</small>
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
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showPalette, setShowPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [gridOffset, setGridOffset] = useState(0);
  const [exportTarget, setExportTarget] = useState<ExportTarget>("AuraOne Programs");
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);
  const [telemetryLog] = useState(() => new TelemetryEventLog());
  const [telemetryEntries, setTelemetryEntries] = useState<TelemetryLogEntry[]>([]);
  const [installKeyStatus, setInstallKeyStatus] = useState("not checked");

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
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowPalette((shown) => !shown);
      }
      if (mod && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openSampleDataset();
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setView("export");
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setView("export");
        setExportTarget("AuraOne Programs");
      }
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (event.key === "ArrowRight") setCursor((value) => clampTime(value + (event.shiftKey ? 10 / 30 : 1 / 30), selectedEpisode.duration));
      if (event.key === "ArrowLeft") setCursor((value) => clampTime(value - (event.shiftKey ? 10 / 30 : 1 / 30), selectedEpisode.duration));
      if (event.key.toLowerCase() === "j") chooseRelativeEpisode(1);
      if (event.key.toLowerCase() === "k" && !mod) chooseRelativeEpisode(-1);
      if (event.key.toLowerCase() === "t") setView("scrub");
      if (event.key.toLowerCase() === "r") updateEpisode(selectedEpisode.id, { reviewed: selectedEpisode.reviewed === "reviewed" ? "unreviewed" : "reviewed" });
      if (event.key.toLowerCase() === "s") updateEpisode(selectedEpisode.id, { success: "success" });
      if (event.key.toLowerCase() === "f") updateEpisode(selectedEpisode.id, { success: "failure" });
      if (event.key.toLowerCase() === "c") setView("clusters");
      if (event.key.toLowerCase() === "v") setView("probe");
      if (event.key.toLowerCase() === "q") setView("qa");
      if (/^[1-8]$/.test(event.key) && !mod) setSpeed(Number(event.key) <= 4 ? [0.1, 0.25, 0.5, 1][Number(event.key) - 1] : [2, 4, 8, 1][Number(event.key) - 5]);
      if (/^[1-8]$/.test(event.key) && mod) {
        event.preventDefault();
        const tab = tabs[Number(event.key) - 1];
        if (tab) setActiveTabId(tab.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredEpisodes, selectedEpisode, tabs]);

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
    setTabs((currentTabs) =>
      currentTabs.map((tab) => ({
        ...tab,
        lastSaved: "now",
        episodes: tab.episodes.map((episode) => (episode.id === episodeId ? { ...episode, ...partial } : episode)),
      })),
    );
  }

  function chooseEpisode(episode: Episode) {
    recordTelemetry("robotics_feature_used", { feature_id: "episode.scrub" });
    setSelectedEpisodeId(episode.id);
    setCursor(0);
    setView("scrub");
  }

  function chooseRelativeEpisode(delta: number) {
    const index = filteredEpisodes.findIndex((episode) => episode.id === selectedEpisode.id);
    const next = filteredEpisodes[clampIndex(index + delta, filteredEpisodes.length)];
    if (next) chooseEpisode(next);
  }

  function openSampleDataset() {
    recordTelemetry("robotics_dataset_opened", { format: "lerobot_v3", episode_bucket: "50000_plus" });
    setActiveTabId("so101");
    setShowOnboarding(false);
    setView("browse");
  }

  function recordTelemetry(
    eventName: "robotics_dataset_opened" | "robotics_export_completed" | "robotics_feature_used",
    payload: Record<string, string | number | boolean>,
  ) {
    telemetryLog.record(createRoboticsTelemetryEvent(eventName, payload), telemetryOptIn);
    setTelemetryEntries([...telemetryLog.list()].slice(-25).reverse());
  }

  async function ensureInstallKeypair() {
    const keypair = await ensureRoboticsIntakeInstallSigningKeypair();
    setInstallKeyStatus(`${keypair.algorithm} key ready`);
  }

  return (
    <main className={`app ${theme}`} aria-label="Robotics Studio Open review IDE">
      <header className="topbar">
        <div className="brand" aria-label="application identity">
          <RoboticsStudioLogo />
          <div className="brand-status">
            <span className="brand-path">
              <i className={`status-dot ${activeDataset.status}`} aria-hidden="true" />
              <strong>{activeDataset.name}</strong>
              <em>{activeDataset.indexed.toLocaleString()} ep</em>
              <span className="format-chip">{activeDataset.format}</span>
            </span>
          </div>
        </div>
        <div className="top-actions">
          <button className="search-trigger" onClick={() => setShowPalette(true)} title="Open command palette">
            <Search size={15} />
            <span>Search commands</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="icon-button ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme" aria-label="Toggle theme">
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="icon-button ghost" title="Settings" aria-label="Settings" onClick={() => setView("settings")}>
            <Settings size={16} />
          </button>
          <button className="primary" onClick={() => { recordTelemetry("robotics_export_completed", { target: "auraone_programs" }); setView("export"); }}>
            <Send size={15} />
            Send to AuraOne Programs
          </button>
        </div>
      </header>

      <section className="layout">
        <aside className="sidebar" aria-label="Datasets and saved views">
          <button className="open-button" onClick={openSampleDataset}>
            <Plus size={15} />
            Open dataset
          </button>
          <PanelTitle icon={Database} label="Datasets" />
          <div className="tabs-list" role="tablist" aria-label="Open datasets">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={tab.id === activeTabId}
                className={tab.id === activeTabId ? "tab active" : "tab"}
                onClick={() => setActiveTabId(tab.id)}
              >
                <i className={`status-dot ${tab.status}`} aria-hidden="true" />
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
          <nav className="view-tabs" aria-label="Robotics Studio Open views">
            {viewTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} className={view === tab.id ? "view-tab active" : "view-tab"} onClick={() => setView(tab.id)}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          {activeDataset.status === "error" ? (
            <StateCard icon={XCircle} title="Could not read dataset metadata" text={activeDataset.error ?? "Expected meta/info.json, got null fps."} />
          ) : activeDataset.status === "loading" && view === "browse" ? (
            <LoadingIndex dataset={activeDataset} />
          ) : activeDataset.episodes.length === 0 ? (
            <StateCard icon={Database} title="No dataset open" text="Try the bundled sample or open a LeRobot, RLDS, OpenX, HDF5, ROS bag, or mp4/jsonl folder." />
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
              telemetryOptIn={telemetryOptIn}
              setTelemetryOptIn={setTelemetryOptIn}
              telemetryEntries={telemetryEntries}
              installKeyStatus={installKeyStatus}
              ensureInstallKeypair={ensureInstallKeypair}
            />
          )}
        </section>

        <aside className="right-rail" aria-label="Context panels">
          <PanelTitle icon={Gauge} label="Dataset health" />
          <div className="health-grid">
            <Metric label="Visible" value={`${filteredEpisodes.length} / ${activeDataset.indexed.toLocaleString()}`} />
            <Metric label="Avg readiness" value={`${summary.avgReadiness}`} tone={summary.avgReadiness > 70 ? "pass" : "warn"} />
            <Metric label="Failures" value={summary.failures.toString()} tone={summary.failures ? "warn" : "pass"} />
            <Metric label="QA warnings" value={summary.qaFailures.toString()} tone={summary.qaFailures ? "warn" : "pass"} />
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
        <span className="status-engine"><i className="status-dot ready" aria-hidden="true" /> engine OK</span>
        <span>{filteredEpisodes.length.toLocaleString()} visible / {activeDataset.indexed.toLocaleString()}</span>
        <span>last save {activeDataset.lastSaved}</span>
        <span className="status-spacer" />
        <span>density {density}</span>
        <span><kbd>⇧⌘E</kbd> export</span>
      </footer>

      {showOnboarding ? <Onboarding close={() => setShowOnboarding(false)} openSample={openSampleDataset} /> : null}
      {showPalette ? <CommandPalette query={commandQuery} setQuery={setCommandQuery} close={() => setShowPalette(false)} setView={setView} /> : null}
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
  telemetryOptIn: boolean;
  setTelemetryOptIn: (value: boolean) => void;
  telemetryEntries: TelemetryLogEntry[];
  installKeyStatus: string;
  ensureInstallKeypair: () => Promise<void>;
}) {
  if (props.view === "browse") return <BrowseView {...props} />;
  if (props.view === "scrub") return <ScrubView {...props} />;
  if (props.view === "clusters") return <ClusterView chooseEpisode={props.chooseEpisode} episodes={props.dataset.episodes} />;
  if (props.view === "compare") return <CompareView selectedEpisode={props.selectedEpisode} peers={props.filteredEpisodes.slice(1, 4)} />;
  if (props.view === "probe") return <ProbeView dataset={props.dataset} />;
  if (props.view === "qa") return <QaView dataset={props.dataset} />;
  if (props.view === "settings") return <SettingsView {...props} />;
  return <ExportView {...props} />;
}

function SettingsView({
  telemetryOptIn,
  setTelemetryOptIn,
  telemetryEntries,
  installKeyStatus,
  ensureInstallKeypair,
}: Pick<
  Parameters<typeof ViewBody>[0],
  "telemetryOptIn" | "setTelemetryOptIn" | "telemetryEntries" | "installKeyStatus" | "ensureInstallKeypair"
>) {
  return (
    <section className="surface" aria-label="Settings">
      <div className="section-head">
        <div>
          <h1>Settings</h1>
          <p>Telemetry, intake signing, and platform extension hooks are inherited from Open Studio Platform contracts.</p>
        </div>
        <button className="primary" onClick={() => void ensureInstallKeypair()}>
          <ShieldCheck size={16} /> Ensure intake key
        </button>
      </div>
      <div className="qa-grid">
        <StateLine label="Telemetry opt-in" status={telemetryOptIn ? "pass" : "warn"} detail={telemetryOptIn ? "events send to platform telemetry" : "events stay local as would-send"} />
        <StateLine label="Install signing key" status={installKeyStatus.includes("ready") ? "pass" : "warn"} detail={installKeyStatus} />
        <StateLine label="Platform hooks" status="pass" detail={`${ROBOTICS_PLATFORM_HOOKS.length} shared hooks consumed`} />
      </div>
      <label className="setting-line">
        <span>Telemetry opt-in</span>
        <input type="checkbox" checked={telemetryOptIn} onChange={(event) => setTelemetryOptIn(event.target.checked)} />
      </label>
      <AuraTelemetryEventLog events={toAuraTelemetryEvents(telemetryEntries)} />
      <article className="manifest">
        <h2>Shared platform hooks</h2>
        <pre>{JSON.stringify(ROBOTICS_PLATFORM_HOOKS, null, 2)}</pre>
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
  const needsReview = filteredEpisodes.filter((episode) => episode.reviewed === "unreviewed").length;
  const qaWarnings = filteredEpisodes.filter((episode) => episode.sensorQaStatus !== "pass").length;
  const avgReadiness = Math.round(filteredEpisodes.reduce((total, episode) => total + episode.readiness, 0) / Math.max(1, filteredEpisodes.length));

  return (
    <section className="surface" aria-label="Episode browser">
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
      <div className="review-summary" aria-label="Filtered review summary">
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
          <strong>{avgReadiness}</strong>
        </article>
        <article>
          <span>Sensor QA</span>
          <strong className={qaWarnings ? "tone-warn" : ""}>{qaWarnings.toLocaleString()}</strong>
        </article>
      </div>
      <div className={`episode-grid ${density}`}>
        {visibleGrid.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} onSelect={chooseEpisode} />
        ))}
      </div>
      <div className="pager">
        <button onClick={() => setGridOffset(Math.max(0, gridOffset - visibleGrid.length))}><SkipBack size={15} /> Previous window</button>
        <span>Rows {gridOffset + 1}-{Math.min(gridOffset + visibleGrid.length, filteredEpisodes.length)} of {filteredEpisodes.length}</span>
        <button onClick={() => setGridOffset(Math.min(Math.max(0, filteredEpisodes.length - visibleGrid.length), gridOffset + visibleGrid.length))}>
          Next window <SkipForward size={15} />
        </button>
      </div>
    </section>
  );
}

function SensorPreview({ size = "card", embodiment, badge, foot }: {
  size?: "card" | "cluster" | "compare" | "plane" | "banner";
  embodiment?: string;
  badge?: { tone: "pass" | "warn" | "fail" | "neutral"; label: string };
  foot?: { label: string; meta?: string };
}) {
  return (
    <div className={`sensor-preview ${size}`}>
      <div className="sensor-preview-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="sensor-preview-scan" aria-hidden="true" />
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
  summary: { failures: number; qaFailures: number; avgReadiness: number };
  label: string;
}) {
  return (
    <div className="view-context" aria-label="Dataset context">
      <SensorPreview size="banner" embodiment={dataset.format} />
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
          <dd className={summary.avgReadiness < 60 ? "tone-fail" : summary.avgReadiness < 80 ? "tone-warn" : "tone-pass"}>{summary.avgReadiness}</dd>
        </div>
        <div>
          <dt>Failures</dt>
          <dd className={summary.failures ? "tone-fail" : ""}>{summary.failures}</dd>
        </div>
        <div>
          <dt>QA flags</dt>
          <dd className={summary.qaFailures ? "tone-warn" : ""}>{summary.qaFailures}</dd>
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
  if (episode.interventionCount === 0) {
    return <span className="intervention-empty" aria-hidden="true">no interventions</span>;
  }
  return (
    <span className="intervention-strip" aria-hidden="true">
      {episode.interventions.map((intervention) => (
        <i
          key={intervention.id}
          className={`tone-${interventionTone(intervention.why)}`}
          style={{
            left: `${(intervention.start / episode.duration) * 100}%`,
            width: `${Math.max(4, ((intervention.end - intervention.start) / episode.duration) * 100)}%`,
          }}
        />
      ))}
    </span>
  );
}

function readinessTone(value: number): "pass" | "warn" | "fail" {
  if (value >= 80) return "pass";
  if (value >= 55) return "warn";
  return "fail";
}

function EpisodeCard({ episode, onSelect }: { episode: Episode; onSelect: (episode: Episode) => void }) {
  const successTone = episode.success === "success" ? "pass" : episode.success === "failure" ? "fail" : "warn";
  const qaTone = episode.sensorQaStatus === "pass" ? "pass" : episode.sensorQaStatus === "fail" ? "fail" : "warn";
  const sensorBadges = episode.sensors.slice(0, 3);
  const readinessClass = readinessTone(episode.readiness);
  return (
    <button className="episode-card" onClick={() => onSelect(episode)} aria-label={`Open ${episode.id}`}>
      <SensorPreview
        size="card"
        embodiment={episode.embodiment}
        badge={{ tone: successTone, label: episode.success }}
        foot={{ label: episode.task.replaceAll("_", " "), meta: formatTime(episode.duration) }}
      />
      <div className="episode-card-body">
        <div className="episode-card-topline">
          <strong>{episode.id}</strong>
          <span className={`episode-readiness-pill ${readinessClass}`} aria-label={`Readiness ${episode.readiness}`}>{episode.readiness}</span>
        </div>
        <div className="readiness-track" aria-hidden="true">
          <i style={{ width: `${episode.readiness}%` }} />
        </div>
        <div className="episode-meta">
          <span className="meta-cell meta-interventions">
            <CircleDot size={11} />
            <span className="meta-label">{episode.interventionCount} intv</span>
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
          <span className={`chip-mini ${qaTone}`}>{episode.reviewed === "reviewed" ? "reviewed" : "needs review"}</span>
        </div>
      </div>
    </button>
  );
}

function ScrubView({
  selectedEpisode,
  cursor,
  setCursor,
  playing,
  setPlaying,
  speed,
  setSpeed,
  updateEpisode,
}: Pick<Parameters<typeof ViewBody>[0], "selectedEpisode" | "cursor" | "setCursor" | "playing" | "setPlaying" | "speed" | "setSpeed" | "updateEpisode">) {
  const visibleSensors = selectedEpisode.sensors.filter((sensor) => sensor.visible);
  return (
    <section className="surface scrub-surface" aria-label="Episode scrubber">
      <div className="section-head">
        <div>
          <h1>{selectedEpisode.id}</h1>
          <p>{selectedEpisode.task} / embodiment {selectedEpisode.embodiment} / {selectedEpisode.instruction}</p>
        </div>
        <div className="row-actions">
          <button onClick={() => updateEpisode(selectedEpisode.id, { success: nextSuccessState(selectedEpisode.success) })}><BadgeCheck size={16} /> {selectedEpisode.success}</button>
          <button onClick={() => updateEpisode(selectedEpisode.id, { reviewed: selectedEpisode.reviewed === "reviewed" ? "unreviewed" : "reviewed" })}><CheckCircle2 size={16} /> {selectedEpisode.reviewed}</button>
        </div>
      </div>
      <div className="sensor-grid">
        {visibleSensors.map((sensor, index) => (
          <article key={sensor.id} className={`sensor-panel ${sensor.kind}`}>
            <div className="sensor-header">
              <strong>{sensor.label}</strong>
              <span>{sensor.rateHz} Hz</span>
            </div>
            {sensor.kind === "rgb" || sensor.kind === "depth" ? (
              <div className={`video-plane ${sensor.kind}`}>
                <div className="video-plane-grid" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="video-plane-scan" aria-hidden="true" />
                <div className="video-plane-meta">
                  <Maximize2 size={16} />
                  <span>{sensor.kind === "depth" ? "color-mapped depth" : "hardware decode path"}</span>
                </div>
              </div>
            ) : sensor.kind === "language" ? (
              <div className="language-banner">{selectedEpisode.instruction}</div>
            ) : (
              <Sparkline values={sensor.samples} accentKey={sensor.kind} fallbackIndex={index} />
            )}
          </article>
        ))}
      </div>
      <div className="timeline" aria-label="Synchronized episode timeline">
        <div className="phase-strip">
          {selectedEpisode.phases.map((phase) => (
            <span key={phase.id} style={{ left: `${(phase.start / selectedEpisode.duration) * 100}%`, width: `${((phase.end - phase.start) / selectedEpisode.duration) * 100}%` }}>
              {phase.label}
            </span>
          ))}
        </div>
        <div className="marker-strip">
          {selectedEpisode.interventions.map((intervention) => (
            <button
              key={intervention.id}
              className={`marker tone-${interventionTone(intervention.why)}`}
              title={`${intervention.why}: ${intervention.outcome}`}
              style={{ left: `${(intervention.start / selectedEpisode.duration) * 100}%`, width: `${((intervention.end - intervention.start) / selectedEpisode.duration) * 100}%` }}
            />
          ))}
          {selectedEpisode.anomalies.map((anomaly) => (
            <i key={anomaly.id} className={`anomaly tone-${anomaly.severity === "error" ? "fail" : anomaly.severity === "warn" ? "warn" : "info"}`} style={{ left: `${(anomaly.start / selectedEpisode.duration) * 100}%` }} title={anomaly.note} />
          ))}
        </div>
        <input
          aria-label="Frame-accurate scrubber"
          type="range"
          min={0}
          max={selectedEpisode.duration}
          value={cursor}
          step={1 / 30}
          onChange={(event) => setCursor(Number(event.target.value))}
        />
      </div>
      <div className="transport">
        <button onClick={() => setCursor((value) => clampTime(value - 1 / 30, selectedEpisode.duration))}><SkipBack size={16} /></button>
        <button className="play-button" onClick={() => setPlaying((current) => !current)}>{playing ? <Square size={16} /> : <Play size={16} />}</button>
        <button onClick={() => setCursor((value) => clampTime(value + 1 / 30, selectedEpisode.duration))}><SkipForward size={16} /></button>
        <strong>{formatTime(cursor)} / {formatTime(selectedEpisode.duration)}</strong>
        <select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
          {[0.1, 0.25, 0.5, 1, 2, 4, 8].map((option) => <option key={option} value={option}>{option}x</option>)}
        </select>
      </div>
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

function ClusterView({ episodes, chooseEpisode }: { episodes: Episode[]; chooseEpisode: (episode: Episode) => void }) {
  return (
    <section className="surface" aria-label="Failure intelligence">
      <div className="section-head">
        <div>
          <h1>Failure intelligence</h1>
          <p>Auto-cluster with CLIP, custom encoder, or hash-based embeddings; review, split, merge, and apply tags in bulk.</p>
        </div>
        <button><Wand2 size={16} /> Run clustering</button>
      </div>
      <div className="cluster-grid">
        {clusters.map((cluster) => {
          const representative = episodes.find((episode) => episode.id === cluster.representativeEpisodeId) ?? episodes[0];
          return (
            <article key={cluster.id} className="cluster-card">
              <SensorPreview
                size="cluster"
                embodiment={representative.embodiment}
                badge={{ tone: cluster.trainingDecision === "exclude from training" ? "fail" : cluster.readiness > 70 ? "pass" : "warn", label: `${cluster.size} ep` }}
                foot={{ label: cluster.dominantTag.split(":").slice(-2).join(":"), meta: `${cluster.readiness}` }}
              />
              <h2>{cluster.title}</h2>
              <div className="chips">
                <Chip label={`${cluster.size} episodes`} />
                <Chip label={`${cluster.readiness} readiness`} tone={cluster.readiness > 70 ? "pass" : "warn"} />
                <Chip label={cluster.trainingDecision} tone={cluster.trainingDecision === "exclude from training" ? "fail" : "pass"} />
              </div>
              <p>{cluster.dominantTag}</p>
              <div className="row-actions">
                <button onClick={() => chooseEpisode(representative)}>Review representative</button>
                <button>Split</button>
                <button>Merge</button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="dashboard-row">
        <Metric label="Recovery success" value="74%" tone="pass" />
        <Metric label="Median time to intervention" value="2.8s" tone="warn" />
        <Metric label="Cluster homogeneity" value="0.81" tone="pass" />
      </div>
    </section>
  );
}

function CompareView({ selectedEpisode, peers }: { selectedEpisode: Episode; peers: Episode[] }) {
  return (
    <section className="surface" aria-label="Policy and sim-to-real compare">
      <div className="section-head">
        <div>
          <h1>Compare</h1>
          <p>Synchronized side-by-side policy and sim-to-real diff with divergence heatmap across joint state, pose, and gripper command.</p>
        </div>
        <button><Columns3 size={16} /> Map model inputs</button>
      </div>
      <div className="compare-grid">
        {[selectedEpisode, ...peers.slice(0, 1)].map((episode, index) => (
          <article key={episode.id} className="compare-pane">
            <SensorPreview
              size="compare"
              embodiment={episode.embodiment}
              badge={{ tone: index === 0 ? "pass" : "warn", label: index === 0 ? "reference" : "candidate" }}
              foot={{ label: episode.task.replaceAll("_", " "), meta: formatTime(episode.duration) }}
            />
            <h2>{episode.id}</h2>
            <Sparkline values={[12, 18, 30, 26, 44, 39, 64, 53]} accentKey="joint" fallbackIndex={2} />
          </article>
        ))}
      </div>
      <div className="heatmap" aria-label="Per-frame divergence heatmap">
        {Array.from({ length: 80 }, (_, index) => <span key={index} style={{ opacity: 0.2 + ((index * 17) % 70) / 100 }} />)}
      </div>
    </section>
  );
}

function ProbeView({ dataset }: { dataset: DatasetTab }) {
  const summary = summarizeDataset(dataset);
  return (
    <section className="surface" aria-label="VLA robustness probe">
      <div className="section-head">
        <div>
          <h1>VLA robustness probe</h1>
          <p>Run vla-robustness-kit with mock or BYO weights, streaming JSON progress, and cross-linked failure clusters.</p>
        </div>
        <button><Play size={16} /> Run probe</button>
      </div>
      <ViewContext dataset={dataset} summary={summary} label="Probe target" />
      <div className="probe-config">
        <label>Policy<select defaultValue="mock"><option>mock</option><option>ONNX weights</option><option>PyTorch state_dict</option><option>HF Transformers model id</option></select></label>
        <label>Trials<input type="number" defaultValue={16} min={1} /></label>
        <label>Output directory<input defaultValue="~/robostudio/probes/so101" /></label>
      </div>
      <div className="trial-list">
        {probeTrials.map((trial) => (
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
        <p>Recommendation: collect 200 more episodes with lighting variation under 50 lux and add gripper-slip counterexamples to the next training mix.</p>
      </article>
    </section>
  );
}

function QaView({ dataset }: { dataset: DatasetTab }) {
  const checks = [
    ["Dropped frames", "warn", "230 episodes exceed the 5% threshold"],
    ["Calibration drift", "pass", "Intrinsics stable across available metadata"],
    ["Audio-video sync", "pass", "All checked streams within +/-25 ms"],
    ["Joint-state continuity", "fail", "14 episodes contain >3 sigma jumps"],
    ["Timestamp monotonicity", "pass", "No negative deltas detected"],
    ["Sample rate stability", "warn", "Wrist camera variance above configured tolerance"],
  ] as const;
  const summary = summarizeDataset(dataset);
  return (
    <section className="surface" aria-label="Sensor QA">
      <div className="section-head">
        <div>
          <h1>Sensor QA</h1>
          <p>Auto checks run on dataset open and validate dropped frames, drift, sync, continuity, monotonicity, and embodiment-card claims.</p>
        </div>
        <button><Download size={16} /> Export Markdown</button>
      </div>
      <ViewContext dataset={dataset} summary={summary} label="QA target" />
      <div className="qa-grid">
        {checks.map(([label, status, detail]) => <StateLine key={label} label={label} status={status} detail={detail} />)}
      </div>
      <article className="report-preview">
        <h2>Embodiment validation</h2>
        <p>{dataset.name} claims 6 sensor streams and 7 action dimensions. Measured control frequency is 49.8 Hz against a 50 Hz card claim.</p>
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
}: Pick<Parameters<typeof ViewBody>[0], "dataset" | "filteredEpisodes" | "exportTarget" | "setExportTarget" | "manifest">) {
  const summary = summarizeDataset(dataset);
  return (
    <section className="surface" aria-label="Export">
      <div className="section-head">
        <div>
          <h1>Export</h1>
          <p>Reviewed subset export to HF Hub, local disk, embodiment card, failure-gallery contribution, or one-way AuraOne Programs intake.</p>
        </div>
        <button className="primary"><Send size={16} /> Start export</button>
      </div>
      <ViewContext dataset={dataset} summary={summary} label="Source dataset" />
      <div className="export-layout">
        <div className="target-list">
          {exportTargets.map((target) => (
            <button key={target} className={exportTarget === target ? "active" : ""} onClick={() => setExportTarget(target)}>
              {target === "HF Hub" ? <UploadCloud size={16} /> : target === "Local disk" ? <HardDrive size={16} /> : target === "AuraOne Programs" ? <Send size={16} /> : <BookOpen size={16} />}
              {target}
            </button>
          ))}
        </div>
        <article className="manifest">
          <h2>{exportTarget}</h2>
          <p>{filteredEpisodes.length} filtered episodes from {dataset.name} will be packaged with ReviewKit records, cluster manifest, interventions, embodiment card, and sensor QA report.</p>
          <pre>{JSON.stringify(manifest, null, 2)}</pre>
        </article>
      </div>
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
      <label><span>Reviewed</span><select value={filters.reviewed} onChange={(event) => setFilters({ reviewed: event.target.value as FilterState["reviewed"] })}><option>all</option><option>reviewed</option><option>unreviewed</option></select></label>
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
  setView,
}: {
  query: string;
  setQuery: (query: string) => void;
  close: () => void;
  setView: (view: ViewMode) => void;
}) {
  const results = commands.filter((command) => `${command.title} ${command.group} ${command.key}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-search"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every command" /></div>
        <div className="command-results">
          {results.map((command) => (
            <button key={command.id} onClick={() => { if (command.id === "clusters") setView("clusters"); if (command.id === "probe") setView("probe"); if (command.id === "qa") setView("qa"); if (command.id === "export" || command.id === "programs-intake") setView("export"); close(); }}>
              <span><strong>{command.title}</strong><small>{command.group}</small></span>
              <kbd>{command.key}</kbd>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Onboarding({ close, openSample }: { close: () => void; openSample: () => void }) {
  return (
    <div className="modal-backdrop onboarding-backdrop" role="presentation">
      <section className="onboarding" role="dialog" aria-modal="true" aria-label="First-run onboarding">
        <div className="onboarding-grid">
          <div className="onboarding-copy">
            <RoboticsStudioLogo size="large" />
            <span className="eyebrow">Robotics Studio Open · v0.1</span>
            <h1>Review every robot episode with every sensor still in view.</h1>
            <p>Open a local dataset, scrub synchronized camera and telemetry streams, tag failures, and export the clean subset. Nothing leaves your machine until you say so.</p>
            <div className="onboarding-actions">
              <button className="primary" onClick={openSample}>
                <Play size={15} />
                Explore sample
              </button>
              <button className="ghost" onClick={close}>Open my dataset</button>
              <button className="ghost" onClick={close}>Connect HF later</button>
            </div>
            <dl className="onboarding-facts" aria-label="What this build does">
              <div><dt>Formats</dt><dd>LeRobot v3 · RLDS · OpenX · HDF5 · ROS bag · mp4/jsonl</dd></div>
              <div><dt>Streams</dt><dd>RGB · depth · joint · pose · force · audio · language</dd></div>
              <div><dt>Export</dt><dd>HF Hub · local disk · embodiment card · AuraOne Programs</dd></div>
            </dl>
          </div>
          <aside className="onboarding-preview" aria-label="Sample review preview">
            <div className="preview-topline">
              <span className="preview-name">
                <i className="status-dot ready" aria-hidden="true" />
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
              <article><span>Readiness</span><strong>75</strong></article>
              <article><span>Failures</span><strong className="tone-fail">14</strong></article>
              <article><span>QA flags</span><strong className="tone-warn">30</strong></article>
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
      <p>Indexed {dataset.indexed.toLocaleString()} of about {dataset.totalEstimate.toLocaleString()} episodes. Media stays lazy; the SQLite sidecar is updated incrementally.</p>
      <progress value={dataset.indexed} max={dataset.totalEstimate} />
    </section>
  );
}

function StateCard({ icon: Icon, title, text }: { icon: typeof AlertTriangle; title: string; text: string }) {
  return <section className="surface centered"><Icon size={34} /><h1>{title}</h1><p>{text}</p></section>;
}

function StateLine({ label, status, detail }: { label: string; status: "pass" | "warn" | "fail"; detail: string }) {
  return <article className="state-line"><Chip label={status} tone={status} /><strong>{label}</strong><span>{detail}</span></article>;
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
  return <div className="sparkline" aria-label="Sensor time-series plot">{values.map((value, index) => <span key={index} style={{ height: `${Math.max(8, (value / max) * 100)}%`, background: accent }} />)}</div>;
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

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}
