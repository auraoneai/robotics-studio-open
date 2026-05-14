// Robotics Studio Open · shell (top bar, left rail, tab bar, right rail, status)

function TopBar({ tab, onTab, theme, onTheme, onCommand }) {
  const Icon = window.ROIcon;
  return (
    <header className="ro-topbar">
      <div className="ro-active-dataset">
        <span className="ro-dot is-ok is-pulse"/>
        <span className="ro-mono" style={{ fontSize: 13, color: 'var(--ro-ink)', fontWeight: 600 }}>so101_kitchen_v3</span>
        <span className="ro-mono" style={{ fontSize: 11.5, color: 'var(--ro-ink-3)' }}>12,847 ep</span>
        <span className="ro-pill is-outline" style={{ fontSize: 9, letterSpacing: '0.06em' }}>LEROBOT v3</span>
      </div>

      <div style={{ flex: 1 }}/>

      {/* Search */}
      <div
        role="button"
        tabIndex={0}
        onClick={onCommand}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCommand();
          }
        }}
        style={{
        display: 'flex', alignItems: 'center', gap: 9,
        height: 34, padding: '0 12px 0 11px',
        width: 280, flex: '0 0 auto',
        background: 'var(--ro-paper-2)',
        border: '1px solid var(--ro-line)',
        borderRadius: 8,
        color: 'var(--ro-ink-3)',
        cursor: 'pointer',
      }}>
        <Icon name="search" size={13}/>
        <span className="ro-mono" style={{ fontSize: 11.5, color: 'var(--ro-ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Find episode, task, taxonomy…
        </span>
        <span style={{ flex: 1 }}/>
        <span className="ro-kbd">⌘K</span>
      </div>

      {/* Theme toggle */}
      <button className="ro-btn is-ghost" onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ width: 34, padding: 0, justifyContent: 'center' }} title="Toggle theme">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15}/>
      </button>

      {/* Settings icon */}
      <button className="ro-btn is-ghost" onClick={() => onTab('settings')}
              style={{ width: 34, padding: 0, justifyContent: 'center' }} title="Settings">
        <Icon name="gear" size={15}/>
      </button>

      {/* Primary CTA */}
      <button className="ro-btn is-accent is-lg">
        <Icon name="send" size={14}/>
        Send to AuraOne Programs
      </button>
    </header>
  );
}

function TabBar({ tab, onTab }) {
  const Icon = window.ROIcon;
  const TABS = window.RO_TABS;
  return (
    <div className="ro-tabbar">
      {TABS.map(t => (
        <button key={t.id} className={`ro-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => onTab(t.id)}>
          <Icon name={t.icon} size={13}/>
          {t.label}
        </button>
      ))}
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 7 }}>
        <span className="ro-eyebrow-mono" style={{ fontSize: 9, color: 'var(--ro-ink-3)' }}>VIEW</span>
        <button className="ro-btn is-sm is-ghost">Comfortable</button>
        <button className="ro-btn is-sm is-ghost">Compact</button>
      </div>
    </div>
  );
}

function LeftRail() {
  const Icon = window.ROIcon, RSMark = window.RSMark;
  const datasets = window.RO_DATASETS;
  const views = window.RO_SAVED_VIEWS;
  return (
    <aside className="sidebar ro-sidebar" aria-label="Robotics Studio navigation">
      <div className="brand ro-sidebar-brand">
        <RSMark size={42}/>
        <div className="ro-sidebar-brand-copy">
          <span className="ro-display">Robotics Studio</span>
          <span className="ro-eyebrow-mono">Desktop IDE</span>
        </div>
      </div>

      <nav className="ro-sidebar-nav" aria-label="Datasets, filters, and saved views">
        <div style={{ padding: 14 }}>
          <button className="ro-btn is-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <Icon name="plus" size={13}/> Open dataset
          </button>
        </div>

        <div style={{ padding: '0 14px 14px' }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="database" size={11}/> Datasets
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {datasets.map((d, i) => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px',
              borderRadius: 7,
              background: d.current ? 'var(--ro-paper)' : 'transparent',
              border: d.current ? '1px solid var(--ro-line)' : '1px solid transparent',
              cursor: 'pointer',
              boxShadow: d.current ? 'var(--ro-shadow-2)' : 'none',
            }}>
              <span className={`ro-dot is-${d.color}`}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ro-mono" style={{ fontSize: 11.5, color: 'var(--ro-ink)', fontWeight: d.current ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ro-ink-3)', marginTop: 1 }}>
                  {d.format} · {d.count.toLocaleString()}
                </div>
              </div>
              <span className="ro-mono" style={{ fontSize: 10.5, color: 'var(--ro-ink-4)' }}>{i + 1}</span>
            </div>
          ))}
        </div>
        </div>

        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--ro-line)', paddingTop: 14 }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="filter" size={11}/> Filters
        </div>
        <RailField label="Search">
          <input className="ro-input" placeholder="episode, task, tag" style={{ height: 26, fontSize: 11.5 }}/>
        </RailField>
        <RailField label="Success">
          <RailSelect value="all"/>
        </RailField>
        <RailField label="Reviewed">
          <RailSelect value="all"/>
        </RailField>
        <RailField label="Sensor QA">
          <RailSelect value="all"/>
        </RailField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <RailField label="Min intv">
            <input className="ro-input" defaultValue="0" style={{ height: 26, fontSize: 11.5 }}/>
          </RailField>
          <RailField label="Max sec">
            <input className="ro-input" defaultValue="999" style={{ height: 26, fontSize: 11.5 }}/>
          </RailField>
        </div>
        <RailField label="Sort">
          <RailSelect value="readiness"/>
        </RailField>
        </div>

        <div style={{ minHeight: 12 }}/>

        <div style={{ padding: '14px', borderTop: '1px solid var(--ro-line)' }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="bookmark" size={11}/> Saved views
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {views.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>
              <Icon name="bookmark" size={11} style={{ color: 'var(--ro-ink-3)' }}/>
              <span style={{ flex: 1, fontSize: 11.5 }}>{v.name}</span>
              <span className="ro-mono" style={{ fontSize: 10, color: 'var(--ro-ink-4)' }}>{v.count}</span>
            </div>
          ))}
        </div>
        </div>
      </nav>
    </aside>
  );
}

function RailField({ label, children }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9, color: 'var(--ro-ink-3)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function RailSelect({ value }) {
  const Icon = window.ROIcon;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      height: 26, padding: '0 8px 0 10px',
      background: 'var(--ro-paper)',
      border: '1px solid var(--ro-line-strong)',
      borderRadius: 6,
      fontSize: 11.5, color: 'var(--ro-ink-2)',
    }}>
      <span style={{ flex: 1 }}>{value}</span>
      <Icon name="chevron-down" size={11}/>
    </div>
  );
}

function RightRail() {
  const Icon = window.ROIcon;
  const H = window.RO_HEALTH;
  const sensors = window.RO_SENSORS;
  return (
    <aside className="ro-right-rail">
      {/* Dataset health */}
      <div style={{ padding: 16 }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="shield" size={11}/> Dataset health
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--ro-line)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ro-line)' }}>
          <HealthTile label="Visible" value={`${H.visible}`} sub={`of ${H.total.toLocaleString()}`}/>
          <HealthTile label="Readiness" value={`${H.readiness}`} sub="avg / 100" color="ok"/>
          <HealthTile label="Failures" value={`${H.failures}`} sub="episodes" color="fail"/>
          <HealthTile label="QA flags" value={`${H.qaFlags}`} sub="across checks" color="warn"/>
        </div>
      </div>

      {/* Sensor streams */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="wave" size={11}/> Sensor streams
        </div>
        <div>
          {sensors.map(s => (
            <div key={s.id} className="ro-sensor">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="ro-mono" style={{ fontSize: 10, color: 'var(--ro-ink-4)' }}>{s.id}.</span>
                <span style={{ fontWeight: 500 }}>{s.name}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="ro-mono" style={{ fontSize: 10, color: 'var(--ro-ink-3)' }}>{s.rate}</span>
                <span className={`ro-pill is-${s.status}`} style={{ height: 17, padding: '0 6px', fontSize: 9.5 }}>{s.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shortcuts */}
      <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--ro-line)', paddingTop: 14 }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 10 }}>Shortcuts</div>
        <ShortcutRow label="Open dataset" keys={['⌘', '0']}/>
        <ShortcutRow label="Quick switch" keys={['⌘', 'P']}/>
        <ShortcutRow label="Next episode" keys={['J']}/>
        <ShortcutRow label="Previous episode" keys={['K']}/>
        <ShortcutRow label="Toggle play" keys={['Space']}/>
        <ShortcutRow label="Frame -1 / +1" keys={['←', '→']}/>
        <ShortcutRow label="Mark failure" keys={['F']}/>
        <ShortcutRow label="Mark reviewed" keys={['R']}/>
      </div>
    </aside>
  );
}

function HealthTile({ label, value, sub, color }) {
  const accent = color === 'ok' ? 'var(--ro-ok-ink)' : color === 'fail' ? 'var(--ro-fail-ink)' : color === 'warn' ? 'var(--ro-warn-ink)' : 'var(--ro-ink)';
  return (
    <div style={{ padding: '12px 12px 10px', background: 'var(--ro-paper)' }}>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9, color: 'var(--ro-ink-3)', marginBottom: 6 }}>{label}</div>
      <div className="ro-display" style={{ fontSize: 30, color: accent, fontWeight: 400 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ro-ink-3)' }}>{sub}</div>
    </div>
  );
}

function ShortcutRow({ label, keys }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', fontSize: 11.5 }}>
      <span style={{ color: 'var(--ro-ink-2)' }}>{label}</span>
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {keys.map((k, i) => <span key={i} className="ro-kbd">{k}</span>)}
      </span>
    </div>
  );
}

function StatusBar({ tab }) {
  return (
    <footer className="ro-statusbar">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="ro-dot is-ok"/> engine OK
      </span>
      <span>96 visible / 12,847</span>
      <span>last save 2s ago</span>
      <span style={{ flex: 1 }}/>
      <span>tab: <span style={{ color: 'var(--ro-ink-2)' }}>{tab}</span></span>
      <span>density comfortable</span>
      <span>iME export</span>
    </footer>
  );
}

Object.assign(window, { TopBar, TabBar, LeftRail, RightRail, StatusBar });
