// Robotics Studio Open · VLA probe screen
// Layout: editorial "experiment log" — config strip + run cards + console-style report

function ProbeScreen({ dataset, onAction, onTab }) {
  const Icon = window.ROIcon;
  const [runs, setRuns] = React.useState(window.RO_PROBE_RUNS);
  const name = dataset?.name || 'so101_kitchen_v3';
  const visible = dataset?.visible ?? 96;
  const output = dataset?.output || '~/robostudio/probes/so101';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', overflow: 'visible' }}>
      <div style={{ padding: '22px 28px 16px', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>5 of 8 · robustness</div>
          <h1 className="ro-display" style={{ fontSize: 34, margin: 0 }}>
            Probe the policy where it <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>thinks</span>.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 640 }}>
            Run <span className="ro-mono" style={{ fontSize: 12 }}>vla-robustness-kit</span> with mock or BYO weights. Stream JSON progress, cross-link failures into clusters, and convert findings into next-batch tasks.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn" onClick={() => onAction(`Saved probe config for ${name}`)}><Icon name="commit" size={13}/> Save config</button>
          <button className="ro-btn is-accent" onClick={() => {
            setRuns(current => current.map((run, index) => index === 3 ? { ...run, status: 'running', ms: 0 } : run));
            onAction(`Started VLA probe for ${name}`);
          }}><Icon name="play" size={13}/> Run probe</button>
        </div>
      </div>

      {/* Config strip */}
      <div style={{ padding: '0 28px 16px', flex: '0 0 auto' }}>
        <div className="ro-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', alignItems: 'center', gap: 0 }}>
          <ConfigCell label="Policy" value="mock-vla-base" mono/>
          <ConfigCell label="Target dataset" value={`${name} · ${visible} visible episodes`}/>
          <ConfigCell label="Trials" value="16" mono/>
          <ConfigCell label="Seed" value="42" mono/>
          <ConfigCell label="Output" value={output} mono last/>
        </div>
      </div>

      {/* Two-col main */}
      <div style={{ padding: '0 28px 26px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* Run list */}
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Active runs</span>
            <span style={{ flex: 1, height: 1, background: 'var(--ro-line)' }}/>
            <span className="ro-mono" style={{ color: 'var(--ro-ink-3)', textTransform: 'none', letterSpacing: 0 }}>4 of 16 · 25%</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map((r, i) => <ProbeRunRow key={i} r={r}/>)}
            {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
              <ProbeRunRow key={'q' + i} r={{ tag: ['language', 'vision', 'embodiment', 'task-phase'][i % 4], name: queuedNames[i % queuedNames.length], ms: null, status: 'queued' }} faint/>
            ))}
          </div>
        </div>

        {/* Inline report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ro-card" style={{ padding: 16 }}>
            <div className="ro-eyebrow-mono" style={{ marginBottom: 10 }}>Probe-so-far</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ProbeStat label="Pass" value="2" color="ok"/>
              <ProbeStat label="Fail" value="1" color="fail"/>
              <ProbeStat label="Running" value="1" color="accent"/>
              <ProbeStat label="Queued" value="12"/>
            </div>
          </div>

          <div className="ro-card" style={{ padding: 16 }}>
            <div className="ro-eyebrow-mono" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkle" size={12}/> Inline report
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ro-ink-2)', lineHeight: 1.55 }}>
              <span style={{ fontFamily: 'var(--ro-display)', fontStyle: 'italic', fontSize: 16, color: 'var(--ro-ink)' }}>“Vision is the weak link.”</span>
              {' '}Lighting drop to 40 lux causes a 31% drop in pick success. Recommend collecting <b>200 more episodes</b> with lighting variation under 50 lux and adding <b>gripper-slip counterexamples</b> to the next training mix.
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="ro-btn is-sm" onClick={() => onTab('compare')}>Open failing trials</button>
              <button className="ro-btn is-sm" onClick={() => onTab('failures')}>Link to cluster · gripper_slip:glass</button>
              <button className="ro-btn is-sm is-accent" onClick={() => onAction('Added 200 lighting-variation episodes to next collection batch')}>Add to next batch</button>
            </div>
          </div>

          <div className="ro-card" style={{ padding: 16, background: 'oklch(0.18 0.01 60)', color: 'oklch(0.94 0.005 75)', borderColor: 'oklch(0.28 0.01 60)' }}>
            <div className="ro-eyebrow-mono" style={{ marginBottom: 10, color: 'oklch(0.7 0.06 195)' }}>JSON stream</div>
            <pre style={{
              margin: 0, fontFamily: 'var(--ro-mono)', fontSize: 11, lineHeight: 1.55,
              color: 'oklch(0.86 0.005 75)', whiteSpace: 'pre-wrap',
            }}>
{`{"run":"language.paraphrase","status":"pass","ms":42,
 "delta_success":-0.03,"trials":16,"seed":42}
{"run":"vision.lighting_40lx","status":"fail","ms":58,
 "delta_success":-0.31,"failing_cluster":"gripper_slip:glass"}
{"run":"embodiment.gripper_+8","status":"running",
 "progress":0.62,"current_trial":10}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const queuedNames = [
  'Swap align and approach phase labels',
  'Apply 80 lux glare from upper-left',
  'Replace cup with thin-walled glass',
  'Inject 80 ms latency on wrist camera',
  'Increase joint-state noise by 0.02 rad',
  'Replace ‘apple’ with ‘tomato’ in instruction',
  'Perturb camera intrinsics by ±5%',
  'Shuffle object positions ±10cm',
  'Replace gripper with parallel-jaw 0.06m',
  'Translate instruction to French',
  'Mask 30% of wrist camera with black square',
  'Reverse order of approach / align phases',
];

function ConfigCell({ label, value, mono, last }) {
  return (
    <div style={{ padding: '12px 16px', borderRight: last ? 'none' : '1px solid var(--ro-line)' }}>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className={mono ? 'ro-mono' : ''} style={{ fontSize: mono ? 12 : 13, color: 'var(--ro-ink)', fontWeight: mono ? 500 : 600 }}>{value}</div>
    </div>
  );
}

function ProbeRunRow({ r, faint }) {
  const Icon = window.ROIcon;
  const statusKind = r.status === 'pass' ? 'ok' : r.status === 'fail' ? 'fail' : r.status === 'running' ? 'accent' : 'outline';
  return (
    <div className="ro-card" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      opacity: faint ? 0.55 : 1,
      borderColor: r.status === 'running' ? 'var(--ro-accent-line)' : 'var(--ro-line)',
      background: r.status === 'running' ? 'var(--ro-accent-soft)' : 'var(--ro-paper)',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 76, height: 22, borderRadius: 4,
        background: 'var(--ro-paper-2)', border: '1px solid var(--ro-line-strong)',
        fontFamily: 'var(--ro-mono)', fontSize: 10, color: 'var(--ro-ink-2)',
        flex: '0 0 auto',
      }}>{r.tag}</span>
      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ro-ink)' }}>{r.name}</span>
      <span className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)', minWidth: 44, textAlign: 'right' }}>
        {r.ms ? `${r.ms} ms` : '—'}
      </span>
      <span className={`ro-pill is-${statusKind}`} style={{ height: 20, fontSize: 9.5 }}>
        {r.status === 'running' && <span className="ro-dot is-accent is-pulse" style={{ width: 5, height: 5 }}/>}
        {r.status}
      </span>
    </div>
  );
}

function ProbeStat({ label, value, color }) {
  const valColor = color === 'fail' ? 'var(--ro-fail-ink)' : color === 'warn' ? 'var(--ro-warn-ink)' : color === 'ok' ? 'var(--ro-ok-ink)' : color === 'accent' ? 'var(--ro-accent-ink)' : 'var(--ro-ink)';
  return (
    <div>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className="ro-display" style={{ fontSize: 28, color: valColor, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ProbeScreen });
