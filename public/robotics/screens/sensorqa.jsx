// Robotics Studio Open · Sensor QA screen
// Layout: lab report — each check is a row with prose finding + sparkline evidence.

function SensorQAScreen() {
  const Icon = window.ROIcon;
  const checks = window.RO_QA_CHECKS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '22px 28px 16px', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>6 of 8 · pre-flight</div>
          <h1 className="ro-display" style={{ fontSize: 34, margin: 0 }}>
            What the <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>sensors</span> say.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 640 }}>
            Six automatic checks run on dataset open. Findings are written in plain language — drift, sync, continuity, monotonicity, and embodiment-card claims.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn"><Icon name="bolt" size={13}/> Re-run all</button>
          <button className="ro-btn is-primary"><Icon name="download" size={13}/> Export markdown</button>
        </div>
      </div>

      {/* Lab report sheet */}
      <div style={{ padding: '0 28px 26px', maxWidth: 980 }}>
        <div className="ro-card" style={{ padding: '22px 28px' }}>
          {/* Letterhead */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--ro-line)', marginBottom: 18, gap: 24 }}>
            <div>
              <div className="ro-eyebrow-mono" style={{ marginBottom: 4 }}>QA TARGET</div>
              <div className="ro-display" style={{ fontSize: 26, lineHeight: 1, marginBottom: 4 }}>so101_kitchen_v3</div>
              <div className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)' }}>~/datasets/so101_kitchen_v3 · LeRobot v3</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 24, textAlign: 'right' }}>
              <Tiny label="Episodes" value="96" sub="/ 12,847"/>
              <Tiny label="Readiness" value="75" sub="avg / 100" color="ok"/>
              <Tiny label="Failures" value="14" color="fail"/>
              <Tiny label="QA flags" value="30" color="warn"/>
            </div>
          </div>

          {/* Findings */}
          <div className="ro-eyebrow-mono" style={{ marginBottom: 12 }}>Findings · 6 checks</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {checks.map((c, i) => <QARow key={i} c={c}/>)}
          </div>

          {/* Embodiment validation */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--ro-line)' }}>
            <div className="ro-eyebrow-mono" style={{ marginBottom: 8 }}>Embodiment validation</div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ro-ink-2)', lineHeight: 1.55, fontFamily: 'var(--ro-display)' }}>
              <span style={{ fontSize: 18 }}>so101_kitchen_v3</span> claims <b>6 sensor streams</b> and <b>7 action dimensions</b>. Measured control frequency is <b style={{ color: 'var(--ro-warn-ink)' }}>49.8 Hz</b> against a <b>50 Hz</b> card claim — within tolerance, but worth a glance.
            </p>
          </div>

          {/* Signature */}
          <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px dashed var(--ro-line-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, color: 'var(--ro-ink-3)' }}>
            <span className="ro-mono">qa.run = 2026-05-14T10:41:41Z · validator = open-studio-platform / sensor_qa_v0.4.2</span>
            <span className="ro-display-it" style={{ fontSize: 16, color: 'var(--ro-ink-2)' }}>passes 3 · warns 2 · fails 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tiny({ label, value, sub, color }) {
  const valColor = color === 'fail' ? 'var(--ro-fail-ink)' : color === 'warn' ? 'var(--ro-warn-ink)' : color === 'ok' ? 'var(--ro-ok-ink)' : 'var(--ro-ink)';
  return (
    <div>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className="ro-display" style={{ fontSize: 26, color: valColor, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ro-ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function QARow({ c }) {
  const kind = c.kind;
  const accent = kind === 'pass' ? 'var(--ro-ok)' : kind === 'fail' ? 'var(--ro-fail)' : 'var(--ro-warn)';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr 120px',
      gap: 14, alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--ro-line-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, flex: '0 0 auto' }}/>
        <span className={`ro-pill is-${kind === 'pass' ? 'ok' : kind}`} style={{ height: 18, fontSize: 9.5 }}>{kind}</span>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ro-ink)' }}>{c.name}</span>
          <span style={{ fontSize: 13, color: 'var(--ro-ink-2)', fontFamily: 'var(--ro-display)', fontStyle: 'italic' }}>— {c.note}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ro-ink-3)' }}>{c.detail}</div>
      </div>
      <div>
        <QASpark kind={kind}/>
      </div>
    </div>
  );
}

function QASpark({ kind }) {
  // dummy distribution sparkline reflecting the check status
  const color = kind === 'pass' ? 'var(--ro-ok)' : kind === 'fail' ? 'var(--ro-fail)' : 'var(--ro-warn)';
  return (
    <svg viewBox="0 0 120 30" preserveAspectRatio="none" style={{ width: '100%', height: 30, display: 'block' }}>
      <line x1="0" y1="22" x2="120" y2="22" stroke="var(--ro-line-2)" strokeWidth="0.6"/>
      {Array.from({ length: 30 }).map((_, i) => {
        const h = kind === 'pass'
          ? 4 + Math.sin(i * 0.5) * 3
          : kind === 'warn'
            ? 5 + Math.abs(Math.sin(i * 0.5)) * 6 + (i > 18 ? 7 : 0)
            : 5 + Math.abs(Math.sin(i * 0.5)) * 4 + (i > 14 && i < 22 ? 14 : 0);
        return <rect key={i} x={i * 4} y={22 - h} width="2.5" height={h} fill={color} opacity={0.7 + (i % 3) * 0.1}/>;
      })}
    </svg>
  );
}

Object.assign(window, { SensorQAScreen });
