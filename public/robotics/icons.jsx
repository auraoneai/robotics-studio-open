// Robotics Studio Open · icon set (tiny inline SVGs)

function Icon({ name, size = 14, stroke = 1.5, style, ...rest }) {
  const s = { width: size, height: size, display: 'block', flex: '0 0 auto', ...(style || {}) };
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'grid':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.6"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="0.6"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="0.6"/><rect x="9" y="9" width="4.5" height="4.5" rx="0.6"/></g></svg>);
    case 'play':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><polygon points="5,3 13,8 5,13" fill="currentColor"/></g></svg>);
    case 'flag':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M3.5 14V3.5h7l-1.4 2.4 1.4 2.4H3.5"/></g></svg>);
    case 'split':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><rect x="2" y="3" width="5.5" height="10" rx="1"/><rect x="8.5" y="3" width="5.5" height="10" rx="1"/></g></svg>);
    case 'wand':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M3 13l8-8"/><path d="M9.5 3.5l3 3"/><path d="M5 2v2M14 5v2M2 5h2M13 8h2" strokeWidth={stroke - 0.2}/></g></svg>);
    case 'wave':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M1.5 8 H3 L4.5 4 L6 12 L7.5 6 L9 10 L10.5 8 H14.5"/></g></svg>);
    case 'send':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M14 2L2 7l5 2 2 5 5-12z"/><path d="M14 2L7 9"/></g></svg>);
    case 'gear':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><circle cx="8" cy="8" r="2.3"/><path d="M8 2v1.6M8 12.4V14M14 8h-1.6M3.6 8H2M12.2 3.8l-1.1 1.1M4.9 11.1L3.8 12.2M12.2 12.2l-1.1-1.1M4.9 4.9L3.8 3.8"/></g></svg>);
    case 'plus':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M8 3v10M3 8h10"/></g></svg>);
    case 'search':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><circle cx="7" cy="7" r="4.2"/><path d="M10.5 10.5l3 3"/></g></svg>);
    case 'filter':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M2 3.5h12M4 7.5h8M6 11.5h4"/></g></svg>);
    case 'bookmark':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M4 2.5h8v11l-4-3-4 3z"/></g></svg>);
    case 'sun':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><circle cx="8" cy="8" r="2.6"/><path d="M8 1.6v1.6M8 12.8V14.4M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4L3.5 12.5M12.5 12.5l-1.1-1.1M4.6 4.6L3.5 3.5"/></g></svg>);
    case 'moon':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5 6 6 0 1 0 13.5 9.5Z"/></g></svg>);
    case 'check':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M3 8.5L6.5 12 13 4.5"/></g></svg>);
    case 'cross':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M4 4l8 8M12 4l-8 8"/></g></svg>);
    case 'chevron-down':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M4 6l4 4 4-4"/></g></svg>);
    case 'chevron-right':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M6 4l4 4-4 4"/></g></svg>);
    case 'arrow-right':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M3 8h10M9 4l4 4-4 4"/></g></svg>);
    case 'arrow-up-right':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M5 11L11 5M6 5h5v5"/></g></svg>);
    case 'download':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M8 2v9M4 7l4 4 4-4M3 13.5h10"/></g></svg>);
    case 'shield':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M8 2L3 4v4c0 3 2 5 5 6 3-1 5-3 5-6V4z"/><path d="M6 8.2l1.6 1.6L10.2 7"/></g></svg>);
    case 'sparkle':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M8 2v3M8 11v3M2 8h3M11 8h3M5 5l1.5 1.5M9.5 9.5L11 11M11 5L9.5 6.5M5 11l1.5-1.5"/></g></svg>);
    case 'pause':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><rect x="5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor"/><rect x="9" y="3.5" width="2" height="9" rx="0.5" fill="currentColor"/></g></svg>);
    case 'skip-prev':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><polygon points="12,4 6,8 12,12" fill="currentColor"/><line x1="5" y1="4" x2="5" y2="12"/></g></svg>);
    case 'skip-next':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><polygon points="4,4 10,8 4,12" fill="currentColor"/><line x1="11" y1="4" x2="11" y2="12"/></g></svg>);
    case 'camera':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><rect x="2" y="4" width="12" height="9" rx="1.4"/><circle cx="8" cy="8.5" r="2.4"/><path d="M5.5 4l1-1.5h3l1 1.5"/></g></svg>);
    case 'wrench':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M11 3a3 3 0 1 0 2 5l1.5 1.5-3 3L10 11l-7 0v-2l7-3z"/></g></svg>);
    case 'database':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><ellipse cx="8" cy="3.5" rx="5" ry="1.6"/><path d="M3 3.5v9c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6v-9"/><path d="M3 7.5c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6"/></g></svg>);
    case 'bolt':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><path d="M9 2L4 9h3l-1 5 5-7H8z" fill="currentColor"/></g></svg>);
    case 'commit':
      return (<svg viewBox="0 0 16 16" style={s} {...rest}><g {...p}><circle cx="8" cy="8" r="2.6"/><path d="M2 8h3.4M10.6 8H14"/></g></svg>);
    default: return null;
  }
}

// Logo lockup
function RSMark({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: 'linear-gradient(135deg, oklch(0.26 0.07 205), oklch(0.48 0.14 165) 58%, oklch(0.68 0.14 70))',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: 'oklch(0.96 0.02 100)',
      boxShadow: 'inset 0 0 0 1px oklch(0.9 0.05 150 / 0.36), 0 1px 0 oklch(0.99 0.005 75)',
      fontFamily: 'var(--ro-mono)', fontWeight: 800, fontSize: size * 0.34,
      letterSpacing: '0.04em',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <span style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(140deg, transparent 0 34%, oklch(0.86 0.13 165 / 0.24) 34% 38%, transparent 38% 100%)',
      }}/>
      RS
    </div>
  );
}

// Sparkline (used in episode cards)
function Sparkline({ values, height = 16, color = 'var(--ro-accent)', dim = false }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 100;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = height - ((v - min) / (max - min || 1)) * (height - 2) - 1;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" opacity={dim ? 0.6 : 1}/>
    </svg>
  );
}

// Readiness bar — gradient 0..100
function ReadinessBar({ value = 50, height = 4 }) {
  return (
    <div style={{ position: 'relative', height, background: 'var(--ro-paper-3)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${value}%`,
        background: `linear-gradient(90deg, var(--ro-fail) 0%, var(--ro-warn) 50%, var(--ro-ok) 100%)`,
        backgroundSize: `${10000 / Math.max(value, 1)}% 100%`,
      }}/>
    </div>
  );
}

// Tiny sensor stream marker (used in compare)
function StreamBars({ count = 6, color = 'var(--ro-accent)', height = 14 }) {
  return (
    <svg viewBox="0 0 60 14" style={{ width: 60, height, display: 'block' }}>
      {Array.from({ length: count }).map((_, i) => {
        const h = 4 + Math.sin(i * 1.7) * 4 + Math.cos(i * 0.5) * 3;
        return <rect key={i} x={i * 10} y={(14 - Math.abs(h)) / 2} width="6" height={Math.max(2, Math.abs(h))} rx="1.5" fill={color} opacity={0.6 + (i % 3) * 0.13}/>;
      })}
    </svg>
  );
}

Object.assign(window, { ROIcon: Icon, RSMark, Sparkline, ReadinessBar, StreamBars });
