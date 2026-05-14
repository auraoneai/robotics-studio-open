// Robotics Studio Open · Settings screen
// Layout: document with margin notes — each section feels like a chapter.

function SettingsScreen({ onAction }) {
  const Icon = window.ROIcon;
  const [optIn, setOptIn] = React.useState(false);
  const [keyChecked, setKeyChecked] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', overflow: 'visible' }}>
      <div style={{ padding: '22px 28px 16px', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>8 of 8 · platform</div>
          <h1 className="ro-display" style={{ fontSize: 34, margin: 0 }}>
            How this <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>open</span> studio talks to AuraOne.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 660 }}>
            Telemetry stays local by default. Signing key, video decode, dataset stream, embodiment card — all inherited from the AuraOne Open Studio Platform.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn" onClick={() => onAction('Re-checked 7 shared platform hooks')}><Icon name="bolt" size={13}/> Re-check hooks</button>
          <button className="ro-btn is-accent" onClick={() => { setKeyChecked(true); onAction('Intake signing key verified in local keychain'); }}><Icon name="shield" size={13}/> Ensure intake key</button>
        </div>
      </div>

      <div style={{ padding: '0 28px 26px', maxWidth: 1080 }}>
        <div className="ro-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Three "subscription cards" */}
          <div style={{ padding: '20px 28px 22px' }}>
            <SettingsRow
              kind={optIn ? 'ok' : 'warn'}
              title="Telemetry opt-in"
              status={optIn ? 'events stream to AuraOne' : 'events stay local as would-send'}
              hint="When off, we log events locally and never network anything. Useful for compliance reviews."
              control={<Toggle on={optIn} onChange={(value) => { setOptIn(value); onAction(value ? 'Telemetry opt-in enabled' : 'Telemetry switched to local-only mode'); }} label="On"/>}
            />
            <SettingsRow
              kind={keyChecked ? 'ok' : 'warn'}
              title="Install signing key"
              status={keyChecked ? 'ED25519:VLPS…6yqA · valid' : 'not checked'}
              hint="One-way ED25519 key used to sign exports headed for AuraOne Programs. Stored in the OS keychain."
              control={<button className="ro-btn is-sm" onClick={() => { setKeyChecked(true); onAction('Install signing key verified'); }}>{keyChecked ? 'Re-verify' : 'Verify now'}</button>}
            />
            <SettingsRow
              kind="ok"
              title="Platform hooks"
              status="7 shared hooks consumed"
              hint="Provided by the AuraOne Open Studio Platform — video decode backends, dataset streams, embodiment cards, and the failure-cluster service."
              control={<span className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-2)' }}>see manifest ↓</span>}
              last
            />
          </div>

          <div style={{ borderTop: '1px solid var(--ro-line)', background: 'var(--ro-paper-2)', padding: '18px 28px' }}>
            <TelemetryLog/>
          </div>

          <div style={{ borderTop: '1px solid var(--ro-line)', padding: '18px 28px' }}>
            <PlatformHooks/>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ kind, title, status, hint, control, last }) {
  const accent = kind === 'ok' ? 'var(--ro-ok)' : kind === 'fail' ? 'var(--ro-fail)' : 'var(--ro-warn)';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '90px 1fr 1fr 200px',
      gap: 18,
      alignItems: 'flex-start',
      padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid var(--ro-line-2)',
    }}>
      <div>
        <span className={`ro-pill is-${kind}`} style={{ height: 19, fontSize: 9.5 }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: accent }}/>
          {kind === 'ok' ? 'pass' : kind}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ro-ink)' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ro-ink-2)', marginTop: 2 }}>{status}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ro-ink-3)', fontFamily: 'var(--ro-display)', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 2 }}>
        {hint}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{control}</div>
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '4px 4px 4px 12px',
      borderRadius: 999,
      background: on ? 'var(--ro-accent-soft)' : 'var(--ro-paper-3)',
      border: '1px solid ' + (on ? 'var(--ro-accent-line)' : 'var(--ro-line-strong)'),
      color: 'var(--ro-ink)', cursor: 'pointer',
      fontFamily: 'var(--ro-mono)', fontSize: 11,
    }}>
      <span>{on ? 'On' : 'Off'}</span>
      <span style={{
        width: 30, height: 18, borderRadius: 999,
        background: on ? 'var(--ro-accent)' : 'var(--ro-paper-4)',
        position: 'relative',
        transition: 'background .14s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 14 : 2,
          width: 14, height: 14, borderRadius: 999,
          background: 'var(--ro-paper)', boxShadow: 'var(--ro-shadow-2)',
          transition: 'left .14s',
        }}/>
      </span>
    </button>
  );
}

function TelemetryLog() {
  const log = window.RO_LOG[0];
  return (
    <div>
      <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Telemetry event log</span>
        <span style={{ flex: 1, height: 1, background: 'var(--ro-line)' }}/>
        <span className="ro-mono" style={{ color: 'var(--ro-ink-3)', textTransform: 'none', letterSpacing: 0 }}>1 event · local only</span>
      </div>
      <div className="ro-card" style={{
        padding: 16,
        background: 'oklch(0.18 0.01 60)', color: 'oklch(0.94 0.005 75)',
        borderColor: 'oklch(0.28 0.01 60)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--ro-display)', fontStyle: 'italic', fontSize: 18, color: 'oklch(0.9 0.06 195)' }}>
            {log.name}
          </span>
          <span style={{ fontFamily: 'var(--ro-mono)', fontSize: 10.5, color: 'oklch(0.65 0.005 75)' }}>2026-05-14T{log.t}</span>
          <span className="ro-pill" style={{ background: 'oklch(0.25 0.01 60)', color: 'oklch(0.85 0.06 195)', height: 18, fontSize: 9.5 }}>{log.kind}</span>
        </div>
        <pre style={{ margin: 0, fontFamily: 'var(--ro-mono)', fontSize: 11, lineHeight: 1.55, color: 'oklch(0.86 0.005 75)' }}>
{JSON.stringify(log.body, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function PlatformHooks() {
  const hooks = window.RO_PLATFORM_HOOKS;
  return (
    <div>
      <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Shared platform hooks</span>
        <span style={{ flex: 1, height: 1, background: 'var(--ro-line)' }}/>
        <span className="ro-mono" style={{ color: 'var(--ro-ink-3)', textTransform: 'none', letterSpacing: 0 }}>{hooks.length} consumed</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {hooks.map((h, i) => (
          <div key={h.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 90px 1fr',
            gap: 14, alignItems: 'center',
            padding: '10px 0',
            borderBottom: i === hooks.length - 1 ? 'none' : '1px solid var(--ro-line-2)',
          }}>
            <span className="ro-mono" style={{ fontSize: 11.5, color: 'var(--ro-ink)' }}>{h.id}</span>
            <span className="ro-pill is-outline" style={{ height: 18, fontSize: 9.5, fontFamily: 'var(--ro-mono)' }}>{h.kind}</span>
            <span className={`ro-pill is-${h.channel === 'stable' ? 'ok' : 'warn'}`} style={{ height: 18, fontSize: 9.5 }}>{h.channel}</span>
            <span style={{ fontSize: 11, color: 'var(--ro-ink-3)' }}>
              owner <span className="ro-mono" style={{ color: 'var(--ro-ink-2)' }}>{h.owner}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
