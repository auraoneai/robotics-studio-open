// Robotics Studio Open · Compare screen
// Layout: reference vs candidate, stacked, with a divergence "stave" between them.

function CompareScreen() {
  const Icon = window.ROIcon;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '22px 28px 16px', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>4 of 8 · policy diff</div>
          <h1 className="ro-display" style={{ fontSize: 34, margin: 0 }}>
            Reference vs <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>candidate</span>, in lockstep.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 640 }}>
            Side-by-side playback synced to the same world clock. The divergence stave below shows where joint state, end-effector pose, and gripper command drift apart.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn"><Icon name="split" size={13}/> Map model inputs</button>
          <button className="ro-btn is-primary"><Icon name="download" size={13}/> Export diff</button>
        </div>
      </div>

      {/* Selector strip */}
      <div style={{ padding: '0 28px 14px', flex: '0 0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <CompareLane kind="reference" name="so101_kitchen_v3-ep-00001" label="pick apple v2" embod="SO-101" status="ok"/>
        <CompareLane kind="candidate" name="policy_b_rollout_034" label="pick apple v2 · trial 12" embod="SO-101" status="warn"/>
      </div>

      {/* Stacked playback */}
      <div style={{ padding: '0 28px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: '0 0 auto' }}>
        <ComparePane variant="ref"/>
        <ComparePane variant="cand"/>
      </div>

      {/* Divergence stave */}
      <div style={{ padding: '4px 28px 22px' }}>
        <div className="ro-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ro-eyebrow-mono">Divergence stave</span>
              <span className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)' }}>L2 distance · per channel · 30 Hz</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['joint_state', 'ee_pose', 'gripper_cmd'].map((c, i) => (
                <span key={c} style={{
                  padding: '3px 8px', borderRadius: 4,
                  background: 'var(--ro-paper-3)', border: '1px solid var(--ro-line)',
                  fontFamily: 'var(--ro-mono)', fontSize: 10, color: 'var(--ro-ink-2)',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: ['var(--ro-accent)', 'var(--ro-violet)', 'var(--ro-warn)'][i] }}/>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <DivergenceStave/>

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--ro-ink-3)' }}>
            <span><b style={{ color: 'var(--ro-ink)' }}>max L2</b> 0.241 at 06.4s (grasp)</span>
            <span>•</span>
            <span><b style={{ color: 'var(--ro-ink)' }}>area-under-curve</b> 1.84</span>
            <span>•</span>
            <span><b style={{ color: 'var(--ro-fail-ink)' }}>2 critical windows</b> over 0.2 threshold</span>
            <span style={{ flex: 1 }}/>
            <span className="ro-mono">play head <span style={{ color: 'var(--ro-accent-ink)' }}>04.20s</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareLane({ kind, name, label, embod, status }) {
  const Icon = window.ROIcon;
  const isRef = kind === 'reference';
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 8,
      background: isRef ? 'var(--ro-accent-soft)' : 'var(--ro-warn-soft)',
      border: `1px solid ${isRef ? 'var(--ro-accent-line)' : 'var(--ro-warn-line)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span className={`ro-pill is-${isRef ? 'accent' : 'warn'}`} style={{ height: 19, fontSize: 9.5, letterSpacing: '0.06em' }}>
          {isRef ? '◇ REFERENCE' : '◇ CANDIDATE'}
        </span>
        <span className="ro-mono" style={{ fontSize: 11.5, color: 'var(--ro-ink)', fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 12, color: 'var(--ro-ink-3)' }}>· {label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="ro-pill is-outline" style={{ height: 18, fontSize: 9.5, fontFamily: 'var(--ro-mono)' }}>{embod}</span>
        <button className="ro-btn is-sm is-ghost"><Icon name="chevron-down" size={11}/></button>
      </div>
    </div>
  );
}

function ComparePane({ variant }) {
  return (
    <div className="ro-card" style={{ overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr',
        aspectRatio: '16 / 9',
        background: 'oklch(0.18 0.01 60)',
        gap: 2, padding: 2,
      }}>
        <div style={{ gridRow: 'span 2', background: variant === 'ref' ? 'oklch(0.3 0.04 75)' : 'oklch(0.3 0.04 60)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 40% 30%, oklch(0.5 0.06 75) 0%, transparent 65%)' }}/>
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <line x1={20} y1="54" x2={58 + (variant === 'cand' ? 6 : 0)} y2={28 + (variant === 'cand' ? 4 : 0)} stroke="oklch(0.85 0.05 75)" strokeWidth="2.6" strokeLinecap="round"/>
            <circle cx={58 + (variant === 'cand' ? 6 : 0)} cy={28 + (variant === 'cand' ? 4 : 0)} r="2.6" fill="oklch(0.9 0.06 75)"/>
            <circle cx="73" cy="32" r="3" fill="none" stroke="oklch(0.9 0.06 75)" strokeWidth="1.5"/>
          </svg>
        </div>
        <div style={{ background: variant === 'ref' ? 'oklch(0.28 0.04 75)' : 'oklch(0.28 0.04 60)' }}/>
        <div style={{ background: variant === 'ref' ? 'oklch(0.26 0.04 75)' : 'oklch(0.26 0.04 60)' }}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderTop: '1px solid var(--ro-line)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ro-ink-2)' }}>{variant === 'ref' ? 'ground-truth trajectory' : 'policy_b trial 12'}</span>
        <span className="ro-mono" style={{ fontSize: 10.5, color: 'var(--ro-ink-3)' }}>00:04.20 / 00:12.00</span>
      </div>
    </div>
  );
}

function DivergenceStave() {
  const pts = (seed, mag = 1) => Array.from({ length: 60 }).map((_, i) => {
    const x = (i / 59) * 600;
    const y = 25 + Math.sin(i * 0.4 + seed) * 8 * mag + (i > 28 && i < 38 ? 18 * mag : 0) + Math.cos(i * 0.25 + seed * 2) * 4;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(50 - y * 0.4).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 600 80" preserveAspectRatio="none" style={{ width: '100%', height: 86, display: 'block' }}>
      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={t * 600} y1="0" x2={t * 600} y2="80" stroke="var(--ro-line)" strokeWidth="0.5" strokeDasharray={i === 0 || i === 4 ? '' : '2 3'}/>
      ))}
      {[0.2, 0.5, 0.8].map((y, i) => (
        <line key={i} x1="0" y1={y * 80} x2="600" y2={y * 80} stroke="var(--ro-line-2)" strokeWidth="0.5"/>
      ))}
      {/* threshold band */}
      <rect x="0" y="58" width="600" height="22" fill="var(--ro-fail-soft)" opacity="0.5"/>
      <line x1="0" y1="58" x2="600" y2="58" stroke="var(--ro-fail)" strokeWidth="0.7" strokeDasharray="3 3"/>

      {/* three channels */}
      <path d={pts(0, 0.8)} fill="none" stroke="var(--ro-accent)" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d={pts(1.5, 1)} fill="none" stroke="var(--ro-violet)" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d={pts(3, 0.6)} fill="none" stroke="var(--ro-warn)" strokeWidth="1.4" strokeLinejoin="round"/>

      {/* phase labels */}
      {['approach', 'align', 'grasp', 'transport', 'place'].map((p, i, arr) => {
        const x = ((i + 0.5) / arr.length) * 600;
        return <text key={p} x={x} y="78" textAnchor="middle" style={{ fontFamily: 'var(--ro-display)', fontSize: 11, fontStyle: 'italic', fill: 'var(--ro-ink-4)' }}>{p}</text>;
      })}
      {/* playhead */}
      <line x1={600 * 0.35} y1="0" x2={600 * 0.35} y2="68" stroke="var(--ro-ink)" strokeWidth="1.5"/>
      <circle cx={600 * 0.35} cy="0" r="3" fill="var(--ro-ink)"/>
    </svg>
  );
}

Object.assign(window, { CompareScreen });
