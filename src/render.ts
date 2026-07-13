import { commandPaletteIndex } from "./commands.js";
import type { StudioState } from "./contracts.js";

export function renderStudio(state: StudioState): string {
  const tab = state.tabs.find((candidate) => candidate.id === state.activeTabId) ?? state.tabs[0];
  const selected = tab?.episodes.find((episode) => episode.episodeId === tab.selectedEpisodeId) ?? tab?.episodes[0];
  return `
    <section class="studio-shell" data-theme="${state.theme}">
      <aside aria-label="Datasets">${state.tabs.map((item) => `<button>${escape(item.title)}</button>`).join("")}</aside>
      <main>
        <header>
          <h1>Robotics Studio Open</h1>
          <p>${tab ? `${escape(tab.adapter)} · ${tab.indexedEpisodes} indexed episodes` : "No dataset open"}</p>
        </header>
        ${tab ? renderGrid(tab.episodes) : renderEmpty()}
        ${selected ? renderScrubber(selected.episodeId, state.timelineCursorS, selected.durationS) : ""}
        ${selected ? renderSensorPanels(selected.sensors.filter((sensor) => sensor.visible).map((sensor) => sensor.name)) : ""}
        ${renderClusters(state)}
        ${renderQA(state)}
        ${renderProbe(state)}
      </main>
      <nav aria-label="Command palette">${commandPaletteIndex()
        .map((command) => `<button data-command="${command.id}">${escape(command.label)} <kbd>${escape(command.shortcut)}</kbd></button>`)
        .join("")}</nav>
    </section>`;
}

function renderGrid(episodes: Array<{ episodeId: string; task: string; success: boolean | null; failureModes: string[] }>): string {
  if (!episodes.length) return renderEmpty();
  return `<section aria-label="Virtualized episode grid">${episodes
    .map(
      (episode) =>
        `<article><strong>${escape(episode.episodeId)}</strong><span>${escape(episode.task)}</span><span>${episode.success === false ? "Needs review" : "Ready"}</span><small>${escape(episode.failureModes.join(", ") || "none")}</small></article>`,
    )
    .join("")}</section>`;
}

function renderEmpty(): string {
  return `<section role="status"><h2>No dataset open</h2><p>Open a JSON manifest or JSONL episode metadata file.</p></section>`;
}

function renderScrubber(episodeId: string, cursorS: number, durationS: number): string {
  const pct = Math.round((cursorS / Math.max(durationS, 0.001)) * 100);
  return `<section aria-label="Episode scrubber"><h2>${escape(episodeId)}</h2><progress value="${pct}" max="100">${pct}%</progress></section>`;
}

function renderSensorPanels(names: string[]): string {
  return `<section aria-label="Sensor streams">${names.map((name) => `<figure><figcaption>${escape(name)}</figcaption></figure>`).join("")}</section>`;
}

function renderClusters(state: StudioState): string {
  return `<section aria-label="Failure clusters">${state.clusters
    .map((cluster) => `<button>${escape(cluster.label)} <span>${cluster.episodeIds.length}</span></button>`)
    .join("")}</section>`;
}

function renderQA(state: StudioState): string {
  return `<section aria-label="Sensor QA"><strong>${state.sensorQA.status}</strong><span>${state.sensorQA.findings.length} findings</span></section>`;
}

function renderProbe(state: StudioState): string {
  return `<section aria-label="VLA probe"><strong>${state.vlaProbe.status}</strong><progress value="${state.vlaProbe.progress}" max="1"></progress></section>`;
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
