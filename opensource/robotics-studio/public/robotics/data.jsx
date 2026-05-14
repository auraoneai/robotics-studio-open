// Robotics Studio Open · shared data

const RO_DATASETS = [
  { id: 'so101_kitchen_v3', name: 'so101_kitchen_v3', format: 'LeRobot v3', count: 12847, visible: 96, color: 'ok', current: true },
  { id: 'sim_rollout_policy_b', name: 'sim_rollout_policy_b', format: 'RLDS', count: 4300, visible: 0, color: 'ok' },
  { id: 'aloha_bin_pick_hdf5', name: 'aloha_bin_pick_hdf5', format: 'HDF5', count: 1832, visible: 0, color: 'warn' },
];

const RO_HEALTH = {
  visible: 96, total: 12847,
  readiness: 75,
  failures: 14,
  qaFlags: 30,
};

const RO_SENSORS = [
  { id: 1, name: 'RGB cam_front',       rate: '30 Hz',  status: 'pass' },
  { id: 2, name: 'RGB cam_wrist',       rate: '30 Hz',  status: 'fail' },
  { id: 3, name: 'Depth cam_top',       rate: '15 Hz',  status: 'pass' },
  { id: 4, name: 'Joint state',         rate: '200 Hz', status: 'pass' },
  { id: 5, name: 'Force / torque',      rate: '100 Hz', status: 'warn' },
  { id: 6, name: 'Language instruction',rate: '1 Hz',   status: 'pass' },
];

const RO_TABS = [
  { id: 'browse',   label: 'Browse',    icon: 'grid' },
  { id: 'scrub',    label: 'Scrub',     icon: 'play' },
  { id: 'failures', label: 'Failures',  icon: 'flag' },
  { id: 'compare',  label: 'Compare',   icon: 'split' },
  { id: 'probe',    label: 'VLA probe', icon: 'wand' },
  { id: 'sensorqa', label: 'Sensor QA', icon: 'wave' },
  { id: 'export',   label: 'Export',    icon: 'send' },
  { id: 'settings', label: 'Settings',  icon: 'gear' },
];

// 12 episode mock thumbnails for Browse
const RO_EPISODES = [
  { id: 'ep-00045', task: 'sort blocks',  embod: 'RoboMimic', success: true,  intv: 4, readiness: 36, qa: 'fail',   secs: 20.00,  flag: 'needs review' },
  { id: 'ep-00034', task: 'place cup',    embod: 'SO-101',    success: true,  intv: 3, readiness: 44, qa: 'warn',   secs: 27.25,  flag: 'reviewed' },
  { id: 'ep-00089', task: 'place cup',    embod: 'ALOHA',     success: true,  intv: 3, readiness: 44, qa: 'fail',   secs: 28.00,  flag: 'needs review' },
  { id: 'ep-00005', task: 'sort blocks',  embod: 'ALOHA',     success: true,  intv: 4, readiness: 52, qa: 'warn',   secs: 16.00,  flag: 'needs review' },
  { id: 'ep-00023', task: 'open drawer',  embod: 'ALOHA',     success: true,  intv: 2, readiness: 52, qa: 'fail',   secs: 16.50,  flag: 'needs review' },
  { id: 'ep-00025', task: 'sort blocks',  embod: 'SO-101',    success: true,  intv: 4, readiness: 52, qa: 'warn',   secs: 18.00,  flag: 'reviewed' },
  { id: 'ep-00065', task: 'sort blocks',  embod: 'ALOHA',     success: true,  intv: 4, readiness: 52, qa: 'warn',   secs: 22.00,  flag: 'needs review' },
  { id: 'ep-00078', task: 'open drawer',  embod: 'RoboMimic', success: false, intv: 2, readiness: 52, qa: 'fail',   secs: 17.25,  flag: 'needs review' },
  { id: 'ep-00085', task: 'sort blocks',  embod: 'SO-101',    success: false, intv: 4, readiness: 52, qa: 'warn',   secs: 24.00,  flag: 'failure' },
  { id: 'ep-00009', task: 'place cup',    embod: 'RoboMimic', success: true,  intv: 3, readiness: 60, qa: 'warn',   secs: 20.00,  flag: null },
  { id: 'ep-00012', task: 'wipe counter', embod: 'RoboMimic', success: true,  intv: 1, readiness: 60, qa: 'fail',   secs: 23.75,  flag: null },
  { id: 'ep-00029', task: 'place cup',    embod: 'ALOHA',     success: false, intv: 3, readiness: 60, qa: 'warn',   secs: 22.00,  flag: 'failure' },
];

// Phases for scrub timeline
const RO_PHASES = [
  { name: 'approach',  start: 0,    end: 2.4,  width: 20 },
  { name: 'align',     start: 2.4,  end: 4.2,  width: 15 },
  { name: 'grasp',     start: 4.2,  end: 6.6,  width: 20 },
  { name: 'transport', start: 6.6,  end: 9.0,  width: 20 },
  { name: 'place',     start: 9.0,  end: 12.0, width: 25 },
];

// Failure clusters
const RO_CLUSTERS = [
  {
    id: 'c1', label: 'gripper_slip:glass', count: 47, embod: 'SO-101',
    headline: 'gripper slip on glossy objects',
    taxonomy: 'manipulation:grasp:slip:gripper_slip:glass',
    readiness: 61, tag: 'needs review', color: 'ok',
    recovery: 74, time: '2.8s', homo: 0.81,
  },
  {
    id: 'c2', label: 'miss:occlusion', count: 31, embod: 'SO-101',
    headline: 'wrist-camera occlusion during approach',
    taxonomy: 'manipulation:grasp:miss:occlusion',
    readiness: 72, tag: 'training-ready', color: 'ok',
    recovery: 62, time: '3.1s', homo: 0.74,
  },
  {
    id: 'c3', label: 'sequence:wrong_phase', count: 18, embod: 'RoboMimic',
    headline: 'phase-order mismatch after manual reset',
    taxonomy: 'planning:sequence:wrong_phase',
    readiness: 43, tag: 'exclude from training', color: 'fail',
    recovery: 41, time: '5.6s', homo: 0.62,
  },
  {
    id: 'c4', label: 'language:misalign', count: 12, embod: 'ALOHA',
    headline: 'instruction paraphrase missed by policy',
    taxonomy: 'language:semantic:misalign',
    readiness: 58, tag: 'needs review', color: 'warn',
    recovery: 68, time: '2.2s', homo: 0.79,
  },
];

// Sensor QA checks
const RO_QA_CHECKS = [
  { kind: 'warn', name: 'Dropped frames',         note: '230 episodes exceed the 5% threshold',
    detail: 'Concentrated in 14 long-horizon kitchen episodes — consider re-encoding from raw.' },
  { kind: 'pass', name: 'Calibration drift',      note: 'Intrinsics stable across available metadata',
    detail: 'Max delta 0.0008 across 96 visible episodes.' },
  { kind: 'pass', name: 'Audio-video sync',       note: 'All checked streams within ±25 ms',
    detail: 'Mean offset 7 ms; 99th percentile 19 ms.' },
  { kind: 'fail', name: 'Joint-state continuity', note: '14 episodes contain >3σ jumps',
    detail: 'Most jumps coincide with manual interventions — review or exclude.' },
  { kind: 'pass', name: 'Timestamp monotonicity', note: 'No negative deltas detected',
    detail: 'All 12,847 episodes monotonic.' },
  { kind: 'warn', name: 'Sample rate stability',  note: 'Wrist camera variance above configured tolerance',
    detail: 'σ = 1.7 Hz vs configured ±0.5 Hz over a 30 Hz target.' },
];

const RO_PROBE_RUNS = [
  { tag: 'language', name: 'Replace direct instruction with paraphrase', ms: 42, status: 'pass' },
  { tag: 'vision',   name: 'Apply 40 lux lighting drop',                 ms: 58, status: 'fail' },
  { tag: 'embodiment', name: 'Perturb gripper width metadata by +8%',    ms: 61, status: 'running' },
  { tag: 'task-phase', name: 'Swap align and approach phase labels',     ms: null, status: 'queued' },
];

// Telemetry log
const RO_LOG = [
  { t: '10:41:41.701Z', name: 'robotics_dataset_opened', kind: 'local only',
    body: { validation: 'valid', format: 'lerobot_v3', episode_bucket: '50000_plus' } },
];

const RO_PLATFORM_HOOKS = [
  { id: 'video.decode.videotoolbox', kind: 'video_decode', channel: 'stable', owner: 'open-studio-platform', consumedBy: 'robotics-studio-open' },
  { id: 'video.decode.vaapi',        kind: 'video_decode', channel: 'stable', owner: 'open-studio-platform', consumedBy: 'robotics-studio-open' },
  { id: 'video.decode.nvdec',        kind: 'video_decode', channel: 'beta',   owner: 'open-studio-platform', consumedBy: 'robotics-studio-open' },
  { id: 'dataset.stream.chunked_ipc',kind: 'dataset_stream', channel: 'stable', owner: 'open-studio-platform', consumedBy: 'robotics-studio-open' },
  { id: 'embodiment.card.lerobot_v3',kind: 'embodiment_card', channel: 'stable', owner: 'open-studio-platform', consumedBy: 'robotics-studio-open' },
  { id: 'failure.cluster.clip_l14',  kind: 'failure_cluster', channel: 'beta', owner: 'aura-research',         consumedBy: 'robotics-studio-open' },
  { id: 'export.sink.auraone_programs', kind: 'export_sink', channel: 'stable', owner: 'aura-programs',       consumedBy: 'robotics-studio-open' },
];

const RO_SAVED_VIEWS = [
  { id: 'sv1', name: 'Second-pass review',  count: 96  },
  { id: 'sv2', name: 'Gripper-slip cluster',count: 47  },
  { id: 'sv3', name: 'Long-horizon ≥ 20s',  count: 312 },
];

Object.assign(window, {
  RO_DATASETS, RO_HEALTH, RO_SENSORS, RO_TABS, RO_EPISODES, RO_PHASES,
  RO_CLUSTERS, RO_QA_CHECKS, RO_PROBE_RUNS, RO_LOG, RO_PLATFORM_HOOKS, RO_SAVED_VIEWS,
});
