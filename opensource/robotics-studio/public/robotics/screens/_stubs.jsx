// Placeholder screens — replaced one-by-one
function ScrubScreen()    { return <Placeholder name="Scrub"/>; }
function FailuresScreen() { return <Placeholder name="Failures"/>; }
function CompareScreen()  { return <Placeholder name="Compare"/>; }
function ProbeScreen()    { return <Placeholder name="VLA probe"/>; }
function SensorQAScreen() { return <Placeholder name="Sensor QA"/>; }
function ExportScreen()   { return <Placeholder name="Export"/>; }
function SettingsScreen() { return <Placeholder name="Settings"/>; }

function Placeholder({ name }) {
  return (
    <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ro-ink-3)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 8 }}>placeholder</div>
        <div className="ro-display" style={{ fontSize: 40, color: 'var(--ro-ink-2)' }}>{name} screen</div>
      </div>
    </div>
  );
}

Object.assign(window, { ScrubScreen, FailuresScreen, CompareScreen, ProbeScreen, SensorQAScreen, ExportScreen, SettingsScreen });
