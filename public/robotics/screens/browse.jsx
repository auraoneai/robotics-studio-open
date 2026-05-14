// Robotics Studio Open · Browse screen
// Layout: hero metric strip + filter chips + asymmetric "gallery wall" of episodes

function BrowseScreen() {
  const Icon = window.ROIcon;
  const eps = window.RO_EPISODES;
  const { ReadinessBar } = window;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Hero — title + metric strip */}
      <div style={{ padding: '22px 26px 16px', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18 }}>
          <div>
            <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>1 of 8 · review</div>
            <h1 className="ro-display" style={{ fontSize: 34, margin: 0, color: 'var(--ro-ink)' }}>
              The episodes that need <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>a human eye</span>.
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 620 }}>
              96 episodes match your filters. Sorted by readiness — least confident first, so the next thing you scrub is the one most likely to bend training.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="ro-btn"><Icon name="filter" size={13}/> Filter</button>
            <button className="ro-btn">Sort: readiness ↓</button>
            <button className="ro-btn is-primary"><Icon name="check" size={13}/> Mark all reviewed</button>
          </div>
        </div>
      </div>

      {/* Metric strip */}
      <div style={{ padding: '0 26px 18px', flex: '0 0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          border: '1px solid var(--ro-line)',
          borderRadius: 12,
          background: 'var(--ro-paper)',
          overflow: 'hidden',
        }}>
          <MetricCell label="Visible episodes"   value="96"   sub="of 96 filtered"           emphasis/>
          <MetricCell label="Needs review"       value="64"   sub="first pass" />
          <MetricCell label="Failures"           value="14"   sub="exclude or recover" color="fail"/>
          <MetricCell label="Avg readiness"      value="75"   sub="↑ 4 since Monday" color="ok"/>
          <MetricCell label="Sensor QA flags"    value="30"   sub="6 checks · 14 episodes" color="warn"/>
        </div>
      </div>

      {/* Active filter chips */}
      <div style={{ padding: '0 26px 14px', flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="ro-eyebrow-mono" style={{ marginRight: 4 }}>active</span>
        <FilterChip label="readiness < 70"   onRemove={() => {}}/>
        <FilterChip label="cluster: gripper_slip:glass"/>
        <FilterChip label="embodiment: SO-101"/>
        <FilterChip label="reviewed: any"/>
        <span style={{ flex: 1 }}/>
        <a className="ro-link" style={{ fontSize: 11.5 }}>Save as view</a>
      </div>

      {/* Episode grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 26px 26px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
          {eps.map((ep, i) => <EpisodeCard key={ep.id} ep={ep} hero={i === 0}/>)}
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, sub, color, emphasis }) {
  const valColor = color === 'fail' ? 'var(--ro-fail-ink)' : color === 'warn' ? 'var(--ro-warn-ink)' : color === 'ok' ? 'var(--ro-ok-ink)' : 'var(--ro-ink)';
  return (
    <div style={{
      padding: '14px 18px 14px',
      borderRight: '1px solid var(--ro-line)',
      background: emphasis ? 'var(--ro-paper-2)' : 'transparent',
      position: 'relative',
    }}>
      <div className="ro-eyebrow-mono" style={{ marginBottom: 6, fontSize: 9.5 }}>{label}</div>
      <div className="ro-display" style={{ fontSize: 36, color: valColor, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ro-ink-3)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  const Icon = window.ROIcon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 24, padding: '0 4px 0 10px',
      borderRadius: 999,
      background: 'var(--ro-paper)',
      border: '1px solid var(--ro-line-strong)',
      fontSize: 11.5, color: 'var(--ro-ink-2)',
      fontFamily: 'var(--ro-mono)',
    }}>
      {label}
      <button style={{
        width: 18, height: 18, padding: 0,
        border: 0, background: 'transparent', color: 'var(--ro-ink-4)',
        borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}><Icon name="cross" size={10}/></button>
    </span>
  );
}

function EpisodeCard({ ep, hero = false }) {
  const Icon = window.ROIcon;
  const flagToPill = {
    'needs review': { kind: 'warn', label: 'needs review' },
    'reviewed':     { kind: 'ok',   label: 'reviewed' },
    'failure':      { kind: 'fail', label: 'failure' },
  };
  const flagPill = flagToPill[ep.flag];
  const successLabel = ep.success ? 'success' : 'failure';
  const successKind = ep.success ? 'ok' : 'fail';

  // Generate "readiness" mini-spark by deterministic seed
  const seed = parseInt(ep.id.slice(-3));
  const spark = Array.from({ length: 24 }).map((_, i) => Math.sin(i * 0.7 + seed) * 0.4 + 0.5 + Math.cos(i * 1.3 + seed * 0.6) * 0.2);

  return (
    <div className="ro-ep" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Thumb area — synced multi-cam placeholder */}
      <div style={{ position: 'relative', aspectRatio: '16 / 10', borderBottom: '1px solid var(--ro-line)' }}>
        <SyncedThumb seed={seed}/>
        <span className={`ro-pill is-${successKind}`} style={{ position: 'absolute', top: 9, left: 9, height: 19, fontSize: 9.5 }}>
          <span className={`ro-dot is-${successKind}`} style={{ width: 5, height: 5 }}/>
          {successLabel}
        </span>
        <span className="ro-pill is-outline" style={{ position: 'absolute', top: 9, right: 9, height: 19, fontSize: 9.5, fontFamily: 'var(--ro-mono)', background: 'oklch(0.985 0.005 75 / 0.85)' }}>
          {ep.embod}
        </span>
        <span style={{
          position: 'absolute', bottom: 8, right: 9,
          fontFamily: 'var(--ro-mono)', fontSize: 10, color: 'var(--ro-ink)',
          background: 'oklch(0.985 0.005 75 / 0.85)', padding: '2px 6px', borderRadius: 4,
        }}>
          {String(ep.secs.toFixed(2)).padStart(5, '0')}
        </span>
      </div>

      <div style={{ padding: '12px 14px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ro-ink)' }}>{ep.task}</span>
          <span className="ro-mono" style={{ fontSize: 10.5, color: 'var(--ro-ink-3)' }}>so101_kitchen_v3-{ep.id}</span>
        </div>

        {/* Readiness band */}
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ro-ink-3)', marginBottom: 4, fontFamily: 'var(--ro-mono)' }}>
            <span>readiness</span>
            <span style={{ color: 'var(--ro-ink-2)' }}>{ep.readiness} / 100</span>
          </div>
          <window.ReadinessBar value={ep.readiness}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, fontSize: 11, color: 'var(--ro-ink-3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="wrench" size={11}/> {ep.intv} intv
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className={`ro-dot is-${ep.qa === 'fail' ? 'fail' : 'warn'}`}/> QA {ep.qa}
            </span>
          </div>
          {flagPill && (
            <span className={`ro-pill is-${flagPill.kind}`}>{flagPill.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Synced thumb — three small camera tiles arranged 2-up + 1
function SyncedThumb({ seed = 1 }) {
  // hue based on seed → subtle variety
  const tint = (seed % 4);
  const bg = ['oklch(0.32 0.04 75)', 'oklch(0.3 0.04 60)', 'oklch(0.31 0.05 200)', 'oklch(0.3 0.04 25)'][tint];
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: 2,
      padding: 2,
      background: 'oklch(0.18 0.01 60)',
    }}>
      <div style={{ gridRow: 'span 2', background: bg, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(140% 100% at 30% 30%, oklch(0.45 0.06 75) 0%, transparent 60%)` }}/>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
          background: `linear-gradient(180deg, transparent, oklch(0.16 0.01 60))`,
        }}/>
        {/* Suggestion of "robot arm" — a single diagonal stroke */}
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
          <line x1={20 + (seed % 10)} y1="56" x2={60 + (seed % 14)} y2={30 - (seed % 8)} stroke="oklch(0.7 0.08 75)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx={60 + (seed % 14)} cy={30 - (seed % 8)} r="2.5" fill="oklch(0.75 0.1 75)"/>
        </svg>
      </div>
      <div style={{ background: bg, opacity: 0.85 }}/>
      <div style={{ background: bg, opacity: 0.7 }}/>
    </div>
  );
}

Object.assign(window, { BrowseScreen });
