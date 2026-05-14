// Robotics Studio Open · Export screen (part 1: header + summary)

function ExportScreen() {
  const Icon = window.ROIcon;
  const [target, setTarget] = React.useState('auraone');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '22px 28px 16px', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="ro-eyebrow-mono" style={{ marginBottom: 4, color: 'var(--ro-accent-ink)' }}>7 of 8 · ship</div>
          <h1 className="ro-display" style={{ fontSize: 34, margin: 0 }}>
            Hand off a <span className="ro-display-it" style={{ color: 'var(--ro-accent-ink)' }}>clean</span> subset.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ro-ink-3)', maxWidth: 640 }}>
            96 reviewed episodes leave this machine as a signed manifest. Pick a destination — your disk, the Hugging Face Hub, our failure gallery, or AuraOne Programs intake.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ro-btn"><Icon name="download" size={13}/> Dry-run</button>
          <button className="ro-btn is-accent is-lg"><Icon name="send" size={13}/> Start export</button>
        </div>
      </div>

      <div style={{ padding: '0 28px 26px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 22 }}>
        <ExportTargets target={target} setTarget={setTarget}/>
        <ExportManifest target={target}/>
      </div>
    </div>
  );
}

const EXPORT_TARGETS = [
  { id: 'auraone', icon: 'send',     label: 'AuraOne Programs', sub: 'one-way intake · signed' },
  { id: 'hf',      icon: 'arrow-up-right', label: 'Hugging Face Hub', sub: 'public or org repo' },
  { id: 'disk',    icon: 'download', label: 'Local disk',     sub: 'parquet · mp4 · jsonl' },
  { id: 'card',    icon: 'shield',   label: 'Embodiment card',sub: 'machine + human readable' },
  { id: 'gallery', icon: 'flag',     label: 'Failure gallery',sub: 'contribute to research' },
];

function ExportTargets({ target, setTarget }) {
  const Icon = window.ROIcon;
  return (
    <div>
      <div className="ro-eyebrow-mono" style={{ marginBottom: 10 }}>Destination</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {EXPORT_TARGETS.map(t => {
          const on = t.id === target;
          return (
            <button key={t.id} onClick={() => setTarget(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '12px 14px',
              textAlign: 'left', cursor: 'pointer',
              borderRadius: 9,
              background: on ? 'var(--ro-accent-soft)' : 'var(--ro-paper)',
              border: '1px solid ' + (on ? 'var(--ro-accent-line)' : 'var(--ro-line)'),
              color: 'var(--ro-ink)',
              boxShadow: on ? '0 0 0 3px var(--ro-accent-soft)' : 'none',
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 7, flex: '0 0 auto',
                background: on ? 'var(--ro-accent)' : 'var(--ro-paper-3)',
                color: on ? 'oklch(0.18 0.01 200)' : 'var(--ro-ink-2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name={t.icon} size={14}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ro-ink-3)', marginTop: 1 }}>{t.sub}</div>
              </div>
              {on && <Icon name="check" size={14} style={{ color: 'var(--ro-accent-ink)' }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExportManifest({ target }) {
  const isAura = target === 'auraone';
  const targetLabel = (EXPORT_TARGETS.find(t => t.id === target) || {}).label || 'destination';
  return (
    <div className="ro-card" style={{ padding: 0, overflow: 'hidden' }}>
      <ManifestHeader targetLabel={targetLabel} isAura={isAura}/>
      <ManifestSummary/>
      <ManifestPayloads target={target}/>
      <ManifestFooter/>
    </div>
  );
}

Object.assign(window, { ExportManifest });

function ManifestHeader({ targetLabel, isAura }) {
  return (
    <div style={{
      padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px dashed var(--ro-line-strong)',
      background: 'var(--ro-paper-2)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: 'oklch(0.22 0.04 195)', color: 'var(--ro-accent)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--ro-mono)', fontWeight: 600, fontSize: 12,
      }}>v3</div>
      <div style={{ flex: 1 }}>
        <div className="ro-eyebrow-mono" style={{ marginBottom: 2 }}>SOURCE → {targetLabel.toUpperCase()}</div>
        <div className="ro-display" style={{ fontSize: 22, lineHeight: 1.05 }}>so101_kitchen_v3 · reviewed subset</div>
        <div className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)' }}>signed-by aura-trust-zone · format lerobot_v3</div>
      </div>
      <span className="ro-pill is-accent" style={{ height: 22, fontSize: 10 }}>
        <span className="ro-dot is-accent is-pulse" style={{ width: 5, height: 5 }}/> READY TO SIGN
      </span>
    </div>
  );
}

function ManifestSummary() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      borderBottom: '1px solid var(--ro-line)',
    }}>
      <SumCell label="Episodes" value="96" sub="of 12,847"/>
      <SumCell label="Interventions" value="190" sub="tagged"/>
      <SumCell label="Anomaly notes" value="96" sub="auto + human"/>
      <SumCell label="Failure tags" value="27" sub="across 4 clusters" last/>
    </div>
  );
}

function SumCell({ label, value, sub, last }) {
  return (
    <div style={{ padding: '14px 20px', borderRight: last ? 'none' : '1px solid var(--ro-line)' }}>
      <div className="ro-eyebrow-mono" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div className="ro-display" style={{ fontSize: 30, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ro-ink-3)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function ManifestPayloads({ target }) {
  const payloads = target === 'auraone' ? [
    { name: 'robotics_reviewed_subset_manifest', size: '8.4 KB',  kind: 'json' },
    { name: 'robotics_episode_reference',         size: '120 KB', kind: 'json' },
    { name: 'robotics_failure_cluster',           size: '32 KB',  kind: 'json' },
    { name: 'robotics_intervention_note',         size: '46 KB',  kind: 'json' },
    { name: 'robotics_embodiment_card',           size: '18 KB',  kind: 'md+json' },
    { name: 'robotics_sensor_qa_report',          size: '12 KB',  kind: 'md' },
  ] : target === 'hf' ? [
    { name: 'data/train-*.parquet',  size: '14.2 GB', kind: 'parquet' },
    { name: 'videos/*.mp4',          size: '32.1 GB', kind: 'mp4' },
    { name: 'meta/episodes.jsonl',   size: '120 KB',  kind: 'jsonl' },
    { name: 'meta/embodiment.md',    size: '18 KB',   kind: 'md' },
    { name: 'README.md',             size: '4 KB',    kind: 'md' },
  ] : [
    { name: 'parquet/*.parquet',     size: '14.2 GB', kind: 'parquet' },
    { name: 'videos/*.mp4',          size: '32.1 GB', kind: 'mp4' },
    { name: 'meta/episodes.jsonl',   size: '120 KB',  kind: 'jsonl' },
  ];

  return (
    <div style={{ padding: '18px 22px' }}>
      <div className="ro-eyebrow-mono" style={{ marginBottom: 10 }}>Payloads · {payloads.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payloads.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 6,
            background: 'var(--ro-paper-2)',
            border: '1px solid var(--ro-line)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, background: 'var(--ro-accent)',
            }}/>
            <span className="ro-mono" style={{ fontSize: 11.5, color: 'var(--ro-ink)', fontWeight: 500, flex: 1 }}>{p.name}</span>
            <span className="ro-pill is-outline" style={{ height: 18, fontSize: 9.5, fontFamily: 'var(--ro-mono)' }}>{p.kind}</span>
            <span className="ro-mono" style={{ fontSize: 11, color: 'var(--ro-ink-3)', width: 70, textAlign: 'right' }}>{p.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManifestFooter() {
  return (
    <div style={{
      padding: '14px 22px',
      borderTop: '1px dashed var(--ro-line-strong)',
      background: 'var(--ro-paper-2)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span className="ro-mono" style={{ fontSize: 10.5, color: 'var(--ro-ink-3)' }}>
        sha256 c8f3…a91d · key fingerprint ED25519:VLPS…6yqA · time 2026-05-14T10:48Z
      </span>
      <span style={{ flex: 1 }}/>
      <button className="ro-btn is-sm">View dry-run</button>
      <button className="ro-btn is-sm is-primary">Sign &amp; ship</button>
    </div>
  );
}

Object.assign(window, { ManifestHeader, ManifestSummary, SumCell, ManifestPayloads, ManifestFooter });
