// Robotics Studio Open · Scrub screen (hero surface)
// Layout: editorial spread — display-serif episode header, large synced sensor windows,
// phase ribbon as chapter markers, transport controls, anomaly marginalia.

function ScrubScreen() {
  const Icon = window.ROIcon;
  const phases = window.RO_PHASES;
  const [playing, setPlaying] = React.useState(false);
  const [t, setT] = React.useState(4.2); // current time in seconds
  const DURATION = 12.0;

  // current phase
  const curPhaseIdx = phases.findIndex(p => t >= p.start && t < p.end);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', overflow: 'visible' }}>
      {/* HEADER — episode "title card" */}
      <div style={{
        padding: '20px 28px 18px',
        borderBottom: '1px dashed var(--ro-line-strong)',
        flex: '0 0 auto',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 24, alignItems: 'flex-end',
      }}>
        <div style={{ minWidth: 0 }}>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>
            EPISODE 00001 · OF 96 VISIBLE
          </div>
          <div className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)', marginBottom: 6 }}>
            so101_kitchen_v3 / ep-00001 / embodiment SO-101
          </div>
          <h1 className="ro-display" style={{ fontSize: 38, margin: 0, color: 'var(--ro-ink)' }}>
            Pick the apple, <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>v2</span> — stable wrist alignment.
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--ro-ink-3)' }}>
            <span><b style={{ color: 'var(--ro-ink)' }}>00:12.00</b> duration</span>
            <span>•</span>
            <span><b style={{ color: 'var(--ro-ink)' }}>4</b> interventions</span>
            <span>•</span>
            <span>readiness <b style={{ color: 'var(--ro-ink)' }}>36</b> / 100</span>
            <span>•</span>
            <span className="ro-pill is-warn" style={{ height: 18, fontSize: 9.5 }}>QA: wrist dropped frames</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          <button className="ro-btn"><Icon name="skip-prev" size={13}/> Prev</button>
          <button className="ro-btn">Next <Icon name="skip-next" size={13}/></button>
          <div style={{ width: 1, height: 22, background: 'var(--ro-line)', margin: '0 4px' }}/>
          <button className="ro-btn" style={{ color: 'var(--ro-fail-ink)', borderColor: 'var(--ro-fail-line)' }}>
            <Icon name="flag" size={13}/> Mark failure
          </button>
          <button className="ro-btn is-primary">
            <Icon name="check" size={13}/> Mark reviewed
          </button>
        </div>
      </div>

      {/* SENSOR GRID — 3 cameras top row + joint state + language bottom row */}
      <div style={{ padding: '20px 28px 0', display: 'grid', gridTemplateColumns: '1.6fr 1.6fr 1fr', gap: 16 }}>
        <SensorWindow name="RGB cam_front" rate="30 Hz" seed={5} note="hardware decode · color-corrected"/>
        <SensorWindow name="RGB cam_wrist" rate="30 Hz" seed={7} note="hardware decode · DROPPED 6.4%" warn/>
        <SensorWindow name="Depth cam_top" rate="15 Hz" seed={11} depth note="color-mapped 0.2 → 1.8m"/>
      </div>

      <div style={{ padding: '14px 28px 0', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}>
        <JointStatePanel/>
        <LanguagePanel/>
        <ForceTorquePanel/>
      </div>

      {/* PHASE RIBBON + SCRUBBER */}
      <div style={{ padding: '22px 28px 14px', flex: '0 0 auto' }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Episode phases</span>
          <span style={{ flex: 1, height: 1, background: 'var(--ro-line)' }}/>
          <span className="ro-mono" style={{ color: 'var(--ro-ink-3)', textTransform: 'none', letterSpacing: 0 }}>
            now: <span style={{ color: 'var(--ro-accent-ink)' }}>{phases[curPhaseIdx]?.name || 'idle'}</span>
          </span>
        </div>

        {/* Phase ribbon (chapter markers) */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 3, height: 40 }}>
            {phases.map((p, i) => {
              const isPast = i < curPhaseIdx;
              const isCur = i === curPhaseIdx;
              return (
                <div key={p.name} style={{
                  flex: p.width,
                  position: 'relative',
                  borderRadius: 6,
                  background: isCur ? 'var(--ro-ink)' : isPast ? 'var(--ro-paper-3)' : 'var(--ro-paper-2)',
                  border: isCur ? '1px solid var(--ro-ink)' : '1px solid var(--ro-line)',
                  color: isCur ? 'var(--ro-paper)' : 'var(--ro-ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 12px',
                }}>
                  <span style={{ fontFamily: 'var(--ro-display)', fontSize: 16, fontStyle: 'italic', letterSpacing: '0.01em' }}>
                    {p.name}
                  </span>
                  <span className="ro-mono" style={{ fontSize: 10, opacity: 0.7 }}>
                    {p.end.toFixed(1)}s
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scrubber */}
          <div style={{ marginTop: 14, position: 'relative', height: 8 }}>
            <div style={{
              position: 'absolute', inset: '3px 0',
              background: 'var(--ro-paper-3)',
              borderRadius: 999,
            }}/>
            <div style={{
              position: 'absolute', inset: '3px auto 3px 0',
              width: `${(t / DURATION) * 100}%`,
              background: 'linear-gradient(90deg, var(--ro-accent-2), var(--ro-accent))',
              borderRadius: 999,
            }}/>
            {/* Intervention ticks */}
            {[2.1, 4.2, 7.8, 10.3].map((tick, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(${(tick / DURATION) * 100}% - 1px)`,
                top: -2, bottom: -2, width: 2,
                background: 'var(--ro-warn)',
                borderRadius: 999,
                opacity: 0.8,
              }} title="intervention"/>
            ))}
            {/* Playhead */}
            <div style={{
              position: 'absolute',
              left: `calc(${(t / DURATION) * 100}% - 9px)`,
              top: -5, width: 18, height: 18,
              borderRadius: 999,
              background: 'var(--ro-ink)',
              border: '3px solid var(--ro-paper)',
              boxShadow: 'var(--ro-shadow-2)',
              cursor: 'grab',
            }}/>
          </div>
        </div>

        {/* Transport */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button className="ro-btn is-ghost" style={{ width: 32, padding: 0, justifyContent: 'center' }}><Icon name="skip-prev" size={14}/></button>
            <button className="ro-btn is-primary" style={{ width: 36, padding: 0, justifyContent: 'center' }} onClick={() => setPlaying(p => !p)}>
              <Icon name={playing ? 'pause' : 'play'} size={14}/>
            </button>
            <button className="ro-btn is-ghost" style={{ width: 32, padding: 0, justifyContent: 'center' }}><Icon name="skip-next" size={14}/></button>
          </div>

          <div className="ro-mono" style={{ fontSize: 13, color: 'var(--ro-ink)', fontWeight: 600 }}>
            <span style={{ color: 'var(--ro-accent-ink)' }}>{fmtTime(t)}</span>
            <span style={{ color: 'var(--ro-ink-3)', margin: '0 6px' }}>/</span>
            <span style={{ color: 'var(--ro-ink-3)' }}>{fmtTime(DURATION)}</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, border: '1px solid var(--ro-line-strong)', borderRadius: 6 }}>
            {['0.25x', '0.5x', '1x', '2x', '4x'].map((s, i) => (
              <button key={s} style={{
                padding: '5px 10px',
                background: s === '1x' ? 'var(--ro-ink)' : 'transparent',
                color: s === '1x' ? 'var(--ro-paper)' : 'var(--ro-ink-2)',
                border: 0,
                fontFamily: 'var(--ro-mono)', fontSize: 11,
                cursor: 'pointer',
                borderRight: i < 4 ? '1px solid var(--ro-line)' : 'none',
              }}>{s}</button>
            ))}
          </div>

          <span style={{ flex: 1 }}/>

          <span className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)' }}>
            <span className="ro-kbd">Space</span> play · <span className="ro-kbd">←</span><span className="ro-kbd">→</span> ±1 frame · <span className="ro-kbd">F</span> failure
          </span>
        </div>
      </div>

      {/* MARGINALIA — taxonomy + tags + notes */}
      <div style={{ padding: '0 28px 26px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <MarginCard title="Failure taxonomy" icon="flag">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <TaxonomyChip parts={['manipulation', 'grasp', 'slip']} leaf="gripper_slip:glass"/>
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ro-ink-3)', lineHeight: 1.5 }}>
            Auto-clustered with 46 other episodes. <a className="ro-link">View cluster →</a>
          </div>
        </MarginCard>

        <MarginCard title="Intervention tags" icon="wrench">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[{ t: '02.1s', l: 'reposition' }, { t: '04.2s', l: 'reset gripper' }, { t: '07.8s', l: 'tilt object' }, { t: '10.3s', l: 'guide place' }].map((iv, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 8px', borderRadius: 5,
                background: 'var(--ro-warn-soft)', color: 'var(--ro-warn-ink)',
                border: '1px solid var(--ro-warn-line)',
                fontFamily: 'var(--ro-mono)', fontSize: 10.5,
              }}>
                <span style={{ opacity: 0.7 }}>{iv.t}</span> {iv.l}
              </span>
            ))}
          </div>
        </MarginCard>

        <MarginCard title="Anomaly notes" icon="sparkle">
          <div style={{ fontSize: 12.5, color: 'var(--ro-ink-2)', lineHeight: 1.55 }}>
            <span className="ro-mono" style={{ color: 'var(--ro-fail-ink)', fontWeight: 600 }}>cam_wrist</span>
            <span> · Dropped frames exceed configured threshold (6.4% vs 5%).</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ro-ink-3)', marginTop: 8, lineHeight: 1.55 }}>
            <span className="ro-mono" style={{ color: 'var(--ro-warn-ink)', fontWeight: 600 }}>joint_4</span>
            <span> · 4.2σ spike at 04.18s coincides with intervention.</span>
          </div>
        </MarginCard>
      </div>
    </div>
  );
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = (s - m * 60).toFixed(2).padStart(5, '0');
  return `${String(m).padStart(2, '0')}:${sec}`;
}

function SensorWindow({ name, rate, seed = 1, depth = false, warn = false, note }) {
  const Icon = window.ROIcon;
  const baseBg = depth
    ? 'oklch(0.32 0.06 30)'
    : 'oklch(0.28 0.025 60)';
  return (
    <div className="ro-card" style={{
      overflow: 'hidden',
      border: warn ? '1px solid var(--ro-warn-line)' : '1px solid var(--ro-line)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--ro-paper-2)',
        borderBottom: '1px solid var(--ro-line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="camera" size={12} style={{ color: warn ? 'var(--ro-warn-ink)' : 'var(--ro-ink-3)' }}/>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ro-ink)' }}>{name}</span>
          <span className="ro-pill is-outline" style={{ height: 17, fontSize: 9, fontFamily: 'var(--ro-mono)' }}>{rate}</span>
        </div>
        {warn && <span className="ro-pill is-warn" style={{ height: 17, fontSize: 9 }}>QA WARN</span>}
      </div>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: baseBg, overflow: 'hidden' }}>
        {/* Faux frame composition */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 80% at 40% 30%, oklch(0.5 0.05 ${depth ? 30 : 75}) 0%, transparent 65%)` }}/>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, oklch(0.18 0.01 60) 100%)` }}/>
        {/* arm suggestion */}
        <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: depth ? 0.3 : 0.45 }}>
          <line x1={15 + seed} y1="50" x2={55 + seed} y2={25 + (seed % 6)} stroke="oklch(0.8 0.06 75)" strokeWidth="3" strokeLinecap="round"/>
          <line x1={55 + seed} y1={25 + (seed % 6)} x2={72 + seed} y2={32 + (seed % 4)} stroke="oklch(0.8 0.06 75)" strokeWidth="2.6" strokeLinecap="round"/>
          <circle cx={55 + seed} cy={25 + (seed % 6)} r="2.5" fill="oklch(0.9 0.08 75)"/>
          <circle cx={72 + seed} cy={32 + (seed % 4)} r="3" fill="none" stroke="oklch(0.9 0.08 75)" strokeWidth="1.5"/>
        </svg>
        {/* grid overlay (telemetry) */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.16 }}>
          <defs>
            <pattern id={`g${seed}`} width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#g${seed})`}/>
        </svg>
        {/* corner badge */}
        <span style={{
          position: 'absolute', bottom: 8, left: 10,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 7px', borderRadius: 4,
          background: 'oklch(0.16 0.01 60 / 0.7)',
          color: 'oklch(0.9 0.02 75)',
          fontFamily: 'var(--ro-mono)', fontSize: 9.5,
          backdropFilter: 'blur(6px)',
        }}>
          <Icon name="arrow-up-right" size={9}/> {note || 'open frame'}
        </span>
      </div>
    </div>
  );
}

function JointStatePanel() {
  return (
    <div className="ro-card" style={{ padding: '12px 14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ro-ink)' }}>Joint state</span>
          <span className="ro-pill is-outline" style={{ height: 17, fontSize: 9, fontFamily: 'var(--ro-mono)' }}>200 Hz · 7 dof</span>
        </div>
        <span className="ro-mono" style={{ fontSize: 10, color: 'var(--ro-ink-3)' }}>rad</span>
      </div>
      <svg viewBox="0 0 300 70" preserveAspectRatio="none" style={{ width: '100%', height: 70, display: 'block' }}>
        <defs>
          <linearGradient id="jsfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--ro-accent)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--ro-accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* 7 dof traces */}
        {[0, 1, 2, 3, 4, 5, 6].map(j => {
          const path = Array.from({ length: 40 }).map((_, i) => {
            const x = (i / 39) * 300;
            const y = 35 + Math.sin(i * 0.3 + j) * (10 - j) + Math.cos(i * 0.7 + j * 1.4) * 4;
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          }).join(' ');
          return (
            <path key={j} d={path} fill="none"
              stroke={j === 3 ? 'var(--ro-warn)' : `oklch(0.5 0.08 ${195 + j * 15})`}
              strokeWidth={j === 3 ? 1.6 : 1}
              strokeOpacity={j === 3 ? 1 : 0.7}/>
          );
        })}
        {/* playhead */}
        <line x1="150" y1="0" x2="150" y2="70" stroke="var(--ro-accent)" strokeWidth="1.5" strokeDasharray="2 3"/>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--ro-ink-3)', fontFamily: 'var(--ro-mono)' }}>
        <span>00:00</span>
        <span style={{ color: 'var(--ro-warn-ink)' }}>j4 4.2σ jump</span>
        <span>00:12</span>
      </div>
    </div>
  );
}

function LanguagePanel() {
  return (
    <div className="ro-card" style={{ padding: '12px 14px 14px', background: 'var(--ro-accent-soft)', borderColor: 'var(--ro-accent-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ro-accent-ink)' }}>Language instruction</span>
        <span className="ro-pill is-outline" style={{ height: 17, fontSize: 9, fontFamily: 'var(--ro-mono)', borderColor: 'var(--ro-accent-line)', color: 'var(--ro-accent-ink)' }}>1 Hz · t=0</span>
      </div>
      <p className="ro-display" style={{ fontSize: 18, margin: 0, color: 'var(--ro-accent-ink)', lineHeight: 1.3 }}>
        “Pick the apple from the right basket and place it on the cutting board, with stable wrist alignment.”
      </p>
      <div style={{ marginTop: 8, fontSize: 10.5, fontFamily: 'var(--ro-mono)', color: 'var(--ro-accent-ink)', opacity: 0.8 }}>
        en · 16 tokens · paraphrased v2
      </div>
    </div>
  );
}

function ForceTorquePanel() {
  return (
    <div className="ro-card" style={{ padding: '12px 14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ro-ink)' }}>Force / torque</span>
          <span className="ro-pill is-warn" style={{ height: 17, fontSize: 9, fontFamily: 'var(--ro-mono)' }}>100 Hz · warn</span>
        </div>
        <span className="ro-mono" style={{ fontSize: 10, color: 'var(--ro-ink-3)' }}>N · Nm</span>
      </div>
      <svg viewBox="0 0 300 70" preserveAspectRatio="none" style={{ width: '100%', height: 70, display: 'block' }}>
        {/* bars */}
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i / 60) * 300;
          const h = 8 + Math.abs(Math.sin(i * 0.4)) * 18 + (i > 38 && i < 46 ? 22 : 0);
          return (
            <rect key={i} x={x} y={(70 - h) / 2} width="3" height={h} rx="1"
              fill={i > 38 && i < 46 ? 'var(--ro-fail)' : 'var(--ro-ink-3)'}
              fillOpacity={i > 38 && i < 46 ? 0.95 : 0.55}/>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--ro-ink-3)', fontFamily: 'var(--ro-mono)' }}>
        <span>peak <span style={{ color: 'var(--ro-fail-ink)' }}>18.4 N</span> at grasp</span>
        <span>μ 6.1 N</span>
      </div>
    </div>
  );
}

function MarginCard({ title, icon, children }) {
  const Icon = window.ROIcon;
  return (
    <div style={{
      borderTop: '1px solid var(--ro-line-strong)',
      padding: '14px 2px 4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name={icon} size={12} style={{ color: 'var(--ro-ink-3)' }}/>
        <span className="ro-eyebrow-mono">{title}</span>
      </div>
      {children}
    </div>
  );
}

function TaxonomyChip({ parts, leaf }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px', borderRadius: 5,
      background: 'var(--ro-warn-soft)', border: '1px solid var(--ro-warn-line)',
      fontFamily: 'var(--ro-mono)', fontSize: 10.5,
      color: 'var(--ro-warn-ink)',
    }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <span style={{ opacity: 0.65 }}>{p}</span>
          <span style={{ opacity: 0.5 }}>›</span>
        </React.Fragment>
      ))}
      <span style={{ fontWeight: 600 }}>{leaf}</span>
    </div>
  );
}

Object.assign(window, { ScrubScreen });
