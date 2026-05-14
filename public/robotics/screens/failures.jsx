// Robotics Studio Open · Failures screen
// Layout: editorial "research index" — clusters as card "specimens" with
// distribution histograms, recovery / homogeneity meters, and bulk actions.

function FailuresScreen({ onAction, onTab }) {
  const Icon = window.ROIcon;
  const clusters = window.RO_CLUSTERS;
  const [selected, setSelected] = React.useState('c1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', overflow: 'visible' }}>
      {/* Header */}
      <div style={{ padding: '22px 28px 16px', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>
            3 of 8 · failure intelligence
          </div>
          <h1 className="ro-display" style={{ fontSize: 34, margin: 0 }}>
            Specimens of <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>failure</span>.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 640 }}>
            108 episodes auto-clustered into <b>4 specimens</b> across <b>3 embodiments</b>. Review the representative, then split, merge, or apply taxonomy to the cluster in bulk.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn" onClick={() => onAction('Embedder set to CLIP L/14')}>
            <Icon name="sparkle" size={13}/> Embedder: <b style={{ marginLeft: 4 }}>CLIP L/14</b>
          </button>
          <button className="ro-btn is-accent" onClick={() => onAction('Failure clusters refreshed with current filters')}><Icon name="bolt" size={13}/> Re-cluster</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ padding: '0 28px 18px', flex: '0 0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          border: '1px solid var(--ro-line)', borderRadius: 12, background: 'var(--ro-paper)',
        }}>
          <SmallMetric label="Clusters" value="4" sub="confidence ≥ 0.7"/>
          <SmallMetric label="Episodes" value="108" sub="13% of visible" color="warn"/>
          <SmallMetric label="Avg homogeneity" value="0.74" sub="cosine"/>
          <SmallMetric label="Recovery rate" value="61%" sub="post-intervention" color="ok"/>
          <SmallMetric label="Median time-to-intervention" value="2.8s" sub="across all clusters"/>
        </div>
      </div>

      {/* Cluster cards */}
      <div style={{ padding: '0 28px 26px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
        {clusters.map(c => (
          <ClusterCard key={c.id} c={c} selected={selected === c.id} onSelect={() => setSelected(c.id)} onAction={onAction} onTab={onTab}/>
        ))}
      </div>
    </div>
  );
}

function SmallMetric({ label, value, sub, color, emphasis }) {
  const valColor = color === 'fail' ? 'var(--ro-fail-ink)' : color === 'warn' ? 'var(--ro-warn-ink)' : color === 'ok' ? 'var(--ro-ok-ink)' : 'var(--ro-ink)';
  return (
    <div style={{ padding: '14px 18px', borderRight: '1px solid var(--ro-line)', background: emphasis ? 'var(--ro-paper-2)' : 'transparent' }}>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div className="ro-display" style={{ fontSize: 30, color: valColor, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ro-ink-3)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function ClusterCard({ c, selected, onSelect, onAction, onTab }) {
  const Icon = window.ROIcon;
  const pillKind = c.color === 'fail' ? 'fail' : c.color === 'warn' ? 'warn' : 'ok';
  return (
    <div className={`ro-card ${selected ? 'is-selected' : ''}`} onClick={onSelect}
      style={{
        cursor: 'pointer', padding: 0, overflow: 'hidden',
        borderColor: selected ? 'var(--ro-accent)' : 'var(--ro-line)',
        boxShadow: selected ? '0 0 0 3px var(--ro-accent-soft)' : 'var(--ro-shadow-2)',
        transition: 'border-color .14s, box-shadow .14s, transform .14s',
      }}>
      {/* Specimen header */}
      <div style={{
        padding: '14px 18px 12px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14,
        borderBottom: '1px dashed var(--ro-line-strong)',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="ro-mono" style={{ fontSize: 10.5, color: 'var(--ro-ink-3)' }}>CLUSTER · {c.label}</span>
            <span className={`ro-pill is-${pillKind}`} style={{ height: 17, fontSize: 9.5 }}>{c.tag}</span>
          </div>
          <h2 className="ro-display" style={{ fontSize: 22, margin: 0, color: 'var(--ro-ink)' }}>
            {c.headline}
          </h2>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div className="ro-display" style={{ fontSize: 42, color: 'var(--ro-ink)', lineHeight: 1 }}>{c.count}</div>
          <div className="ro-mono" style={{ fontSize: 10, color: 'var(--ro-ink-3)' }}>episodes</div>
        </div>
      </div>

      {/* Strip of representative frames */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2,
        padding: 2, background: 'oklch(0.18 0.01 60)',
      }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const isRep = i === 1;
          return (
            <div key={i} style={{
              aspectRatio: '4 / 3',
              position: 'relative',
              background: `oklch(${0.3 + i * 0.02} 0.04 ${60 + i * 30})`,
              outline: isRep ? '2px solid var(--ro-accent)' : 'none',
              outlineOffset: '-2px',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 80% at 35% 30%, oklch(0.5 0.07 75) 0%, transparent 60%)` }}/>
              <svg viewBox="0 0 100 75" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
                <line x1={20 + i * 3} y1="68" x2={55 + i * 4} y2={30 + i * 2} stroke="oklch(0.85 0.05 75)" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx={55 + i * 4} cy={30 + i * 2} r="2.5" fill="oklch(0.85 0.05 75)"/>
              </svg>
              {isRep && (
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  fontFamily: 'var(--ro-mono)', fontSize: 8, fontWeight: 600,
                  background: 'var(--ro-accent)', color: 'oklch(0.18 0.01 60)',
                  padding: '1px 5px', borderRadius: 3,
                }}>REP</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Taxonomy + meters */}
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span className="ro-eyebrow-mono" style={{ fontSize: 9 }}>TAXONOMY</span>
          <span className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.taxonomy}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
          <Meter label="Readiness" value={c.readiness} max={100} suffix="/100" color={c.readiness < 50 ? 'fail' : c.readiness < 70 ? 'warn' : 'ok'}/>
          <Meter label="Recovery" value={c.recovery} max={100} suffix="%" color={c.recovery < 50 ? 'fail' : 'ok'}/>
          <Meter label="Homogeneity" value={c.homo * 100} max={100} display={c.homo.toFixed(2)}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn is-sm is-primary" onClick={(event) => { event.stopPropagation(); onTab('scrub'); onAction(`Reviewing representative for ${c.label}`); }} style={{ flex: 1, justifyContent: 'center' }}>
            <Icon name="play" size={11}/> Review representative
          </button>
          <button className="ro-btn is-sm" onClick={(event) => { event.stopPropagation(); onAction(`Split queued for ${c.label}`); }} style={{ flex: 1, justifyContent: 'center' }}>Split</button>
          <button className="ro-btn is-sm" onClick={(event) => { event.stopPropagation(); onAction(`Merge mode enabled for ${c.label}`); }} style={{ flex: 1, justifyContent: 'center' }}>Merge</button>
          <button className="ro-btn is-sm is-ghost" onClick={(event) => { event.stopPropagation(); onAction(`Opened taxonomy details for ${c.label}`); }}><Icon name="chevron-right" size={12}/></button>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, max, suffix, display, color = 'accent' }) {
  const pct = (value / max) * 100;
  const fill = color === 'fail' ? 'var(--ro-fail)' : color === 'warn' ? 'var(--ro-warn)' : color === 'ok' ? 'var(--ro-ok)' : 'var(--ro-accent)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ro-ink-3)', marginBottom: 4, fontFamily: 'var(--ro-mono)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--ro-ink)', fontWeight: 600 }}>{display || `${Math.round(value)}${suffix || ''}`}</span>
      </div>
      <div style={{ position: 'relative', height: 5, background: 'var(--ro-paper-3)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: fill }}/>
      </div>
    </div>
  );
}

Object.assign(window, { FailuresScreen });
