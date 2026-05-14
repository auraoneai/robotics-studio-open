from __future__ import annotations

import html
from collections import Counter


def _escape(value: object) -> str:
    return html.escape(str(value), quote=True)


def _metric(label: str, value: object) -> str:
    return (
        '<div class="metric">'
        f'<span class="metric-value">{_escape(value)}</span>'
        f'<span class="metric-label">{_escape(label)}</span>'
        "</div>"
    )


def _case_card(case: dict) -> str:
    domain = _escape(case.get("domain", "case"))
    return (
        '<article class="case-card">'
        '<div class="case-topline">'
        f'<span class="case-domain">{domain}</span>'
        f'<span class="case-tool">{_escape(case["related_tool"])}</span>'
        "</div>"
        f'<h2>{_escape(case["title"])}</h2>'
        f'<p class="case-description">{_escape(case["description"])}</p>'
        '<dl class="case-facts">'
        "<div>"
        "<dt>Review label</dt>"
        f'<dd>{_escape(case["review_label"])}</dd>'
        "</div>"
        "<div>"
        "<dt>Expected finding</dt>"
        f'<dd>{_escape(case["expected_finding"])}</dd>'
        "</div>"
        "</dl>"
        f'<code>{_escape(case["reproduce_command"])}</code>'
        "</article>"
    )


def render_index(cases: list[dict]) -> str:
    sorted_cases = sorted(cases, key=lambda case: (case.get("domain", ""), case["title"]))
    domain_counts = Counter(case.get("domain", "case") for case in sorted_cases)
    tool_count = len({case["related_tool"] for case in sorted_cases})
    synthetic_count = sum(1 for case in sorted_cases if case.get("synthetic") is True)

    metrics = "\n".join(
        [
            _metric("failure cases", len(sorted_cases)),
            _metric("related tools", tool_count),
            _metric("agent cases", domain_counts.get("agent", 0)),
            _metric("robotics cases", domain_counts.get("robotics", 0)),
        ]
    )
    cards = "\n".join(_case_card(case) for case in sorted_cases)

    return (
        """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="AuraOne Failure Gallery publishes synthetic agent and robotics failures with reproducible local commands.">
  <title>AuraOne Failure Gallery</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050816;
      --ink: #f8fbff;
      --muted: rgba(232, 241, 255, 0.68);
      --line: rgba(255, 255, 255, 0.14);
      --panel: rgba(11, 18, 36, 0.68);
      --panel-strong: rgba(7, 12, 26, 0.82);
      --cyan: #67e8f9;
      --mint: #6ee7b7;
      --violet: #c4b5fd;
      --amber: #fcd34d;
      --radius: 18px;
    }

    * {
      box-sizing: border-box;
    }

    html {
      min-height: 100%;
      background: var(--bg);
    }

    body {
      min-height: 100%;
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 14% 4%, rgba(34, 211, 238, 0.24), transparent 28rem),
        radial-gradient(circle at 86% 8%, rgba(168, 85, 247, 0.22), transparent 30rem),
        radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.16), transparent 34rem),
        linear-gradient(180deg, #050816 0%, #07111f 52%, #040712 100%);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    body::before {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      content: "";
      opacity: 0.34;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: linear-gradient(180deg, black, transparent 78%);
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
    }

    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 24px 0;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-weight: 760;
    }

    .brand-mark {
      display: inline-grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border: 1px solid rgba(103, 232, 249, 0.32);
      border-radius: 12px;
      background:
        linear-gradient(135deg, rgba(103, 232, 249, 0.18), rgba(196, 181, 253, 0.12)),
        rgba(255, 255, 255, 0.06);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 18px 44px rgba(0, 0, 0, 0.32);
      color: var(--cyan);
    }

    .nav-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .nav-links a,
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0 14px;
      background: rgba(255, 255, 255, 0.055);
      color: rgba(255, 255, 255, 0.82);
      font-size: 0.86rem;
      font-weight: 660;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.13);
    }

    .nav-links a:hover,
    .button:hover {
      border-color: rgba(103, 232, 249, 0.45);
      background: rgba(103, 232, 249, 0.11);
      color: white;
    }

    .hero {
      padding: 36px 0 34px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
      gap: 18px;
      align-items: start;
    }

    .hero-copy,
    .glass-panel,
    .case-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.035)),
        var(--panel);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.18),
        0 28px 92px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(22px) saturate(150%);
    }

    .hero-copy {
      padding: clamp(24px, 4vw, 38px);
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(103, 232, 249, 0.28);
      border-radius: 999px;
      padding: 8px 12px;
      background: rgba(103, 232, 249, 0.10);
      color: var(--cyan);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      max-width: 850px;
      max-width: 760px;
      margin-top: 18px;
      font-size: clamp(2.6rem, 5vw, 5rem);
      line-height: 0.96;
      letter-spacing: 0;
    }

    .lead {
      max-width: 660px;
      margin-top: 18px;
      color: var(--muted);
      font-size: clamp(0.98rem, 1.4vw, 1.08rem);
      line-height: 1.62;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 22px;
    }

    .button.primary {
      border-color: rgba(103, 232, 249, 0.42);
      background: linear-gradient(135deg, rgba(103, 232, 249, 0.22), rgba(110, 231, 183, 0.14));
      color: white;
    }

    .stats-panel {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 18px;
    }

    .metric {
      min-height: 128px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.22);
    }

    .metric-value {
      display: block;
      color: white;
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 780;
      line-height: 1;
    }

    .metric-label {
      display: block;
      margin-top: 10px;
      color: rgba(255, 255, 255, 0.58);
      font-size: 0.8rem;
      font-weight: 720;
      text-transform: uppercase;
    }

    .section-head {
      display: grid;
      gap: 16px;
      margin: 36px 0 24px;
    }

    .section-head h2 {
      max-width: 820px;
      font-size: clamp(2rem, 4.5vw, 3.8rem);
      line-height: 1;
      letter-spacing: 0;
    }

    .section-head p {
      max-width: 760px;
      color: var(--muted);
      line-height: 1.7;
    }

    .case-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      padding-bottom: 60px;
    }

    .case-card {
      display: flex;
      min-height: 390px;
      flex-direction: column;
      justify-content: space-between;
      padding: 22px;
    }

    .case-topline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 18px;
    }

    .case-domain,
    .case-tool {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      border-radius: 999px;
      padding: 0 10px;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .case-domain {
      border: 1px solid rgba(110, 231, 183, 0.28);
      background: rgba(110, 231, 183, 0.10);
      color: var(--mint);
    }

    .case-tool {
      border: 1px solid rgba(196, 181, 253, 0.30);
      background: rgba(196, 181, 253, 0.10);
      color: var(--violet);
    }

    .case-card h2 {
      font-size: 1.23rem;
      line-height: 1.24;
      letter-spacing: 0;
    }

    .case-description {
      margin-top: 12px;
      color: var(--muted);
      font-size: 0.94rem;
      line-height: 1.62;
    }

    .case-facts {
      display: grid;
      gap: 10px;
      margin: 18px 0;
    }

    .case-facts div {
      border-left: 2px solid rgba(103, 232, 249, 0.38);
      padding-left: 12px;
    }

    dt {
      color: rgba(255, 255, 255, 0.46);
      font-size: 0.72rem;
      font-weight: 760;
      text-transform: uppercase;
    }

    dd {
      margin: 5px 0 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    code {
      display: block;
      overflow-x: auto;
      border: 1px solid rgba(110, 231, 183, 0.20);
      border-radius: 12px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.34);
      color: #bbf7d0;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.78rem;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .note {
      display: grid;
      gap: 10px;
      margin: 0 0 54px;
      padding: 22px;
    }

    .note strong {
      color: var(--amber);
    }

    .note p {
      color: var(--muted);
      line-height: 1.65;
    }

    @media (max-width: 920px) {
      .hero-grid,
      .case-grid {
        grid-template-columns: 1fr;
      }

      .hero {
        padding-top: 32px;
      }
    }

    @media (max-width: 640px) {
      .shell {
        width: min(100% - 24px, 1180px);
      }

      .nav {
        align-items: flex-start;
        flex-direction: column;
      }

      .nav-links {
        justify-content: flex-start;
      }

      .stats-panel {
        grid-template-columns: 1fr;
      }

      .hero-copy,
      .stats-panel,
      .case-card,
      .note {
        border-radius: 14px;
      }
    }
  </style>
</head>
<body>
  <nav class="shell nav" aria-label="Primary">
    <a class="brand" href="https://www.auraone.ai/open">
      <span class="brand-mark" aria-hidden="true">A1</span>
      <span>AuraOne Failure Gallery</span>
    </a>
    <div class="nav-links">
      <a href="https://www.auraone.ai/open/v2">Open v2</a>
      <a href="https://auraglass.auraone.ai/">AuraGlass</a>
      <a href="https://github.com/auraoneai/failure-gallery">GitHub</a>
    </div>
  </nav>

  <header class="shell hero">
    <div class="hero-grid">
      <section class="hero-copy">
        <span class="eyebrow">Synthetic cases · AuraGlass surface</span>
        <h1>Failures worth reviewing before they reach production.</h1>
        <p class="lead">
          A public gallery of synthetic agent and robotics failures with the label,
          expected finding, related AuraOne tool, and local command needed to
          reproduce the review path.
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#cases">Browse cases</a>
          <a class="button" href="https://pypi.org/project/failure-gallery/">Install from PyPI</a>
        </div>
      </section>

      <aside class="glass-panel stats-panel" aria-label="Gallery summary">
"""
        + metrics
        + f"""
      </aside>
    </div>
  </header>

  <main class="shell">
    <section class="section-head" id="cases">
      <span class="eyebrow">Case library</span>
      <h2>Agent loops, trace gaps, robot metadata drift, and VLA brittleness.</h2>
      <p>
        Every item is intentionally synthetic and designed for local diagnostics.
        {synthetic_count} of {len(sorted_cases)} cases are marked synthetic, so
        the page can be shared without implying private customer incidents,
        real lab data, or third-party endorsement.
      </p>
    </section>

    <section class="case-grid" aria-label="Failure cases">
"""
        + cards
        + """
    </section>

    <section class="glass-panel note">
      <strong>Built for public review, not leaderboard claims.</strong>
      <p>
        Use this gallery as reproducible review material for AuraOne Open v2
        tools. The page uses AuraGlass-inspired visual language to keep public
        OSS surfaces consistent with the AuraOne brand and readable for
        engineers, labs, and robotics data teams.
      </p>
    </section>
  </main>
</body>
</html>
"""
    )
