const DEFAULT_EPISODE_URL = "../examples/teleop_review_mock_episode.json";
const $ = (id) => document.getElementById(id);

function showError(message) {
  const box = $("error-box");
  box.hidden = false;
  box.textContent = message;
}

function clearError() {
  const box = $("error-box");
  box.hidden = true;
  box.textContent = "";
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function validateEpisodeShape(episode) {
  for (const key of [
    "episode_id",
    "task",
    "timestamps",
    "segments",
    "interventions",
    "failure_annotations",
    "sensor_qa",
    "review",
    "training_readiness"
  ]) {
    if (!(key in episode)) throw new Error(`Missing required episode field: ${key}`);
  }
  if (!Array.isArray(episode.segments) || episode.segments.length === 0) {
    throw new Error("Episode must include at least one segment.");
  }
}

function pct(value, duration) {
  if (!duration) return 0;
  return Math.max(0, Math.min(100, (value / duration) * 100));
}

function renderSummary(episode) {
  $("episode-id").textContent = episode.episode_id;
  $("task-name").textContent = `${episode.task.name} (${episode.task.task_id})`;
  $("review-stage").textContent = episode.review.review_stage;
  $("training-readiness").textContent = `${episode.training_readiness.state}: ${episode.training_readiness.recommended_use}`;
  $("duration-label").textContent = `${episode.timestamps.start_s}s to ${episode.timestamps.end_s}s`;
  $("data-notice").textContent =
    episode.data_status === "synthetic_mock"
      ? "Synthetic/mock tutorial data only. Not expert-authored, not human-validated, not a benchmark, and not training data."
      : "Permissioned real data requires provenance, privacy review, and release controls before publication.";
}

function renderTimeline(episode) {
  const duration = episode.timestamps.end_s - episode.timestamps.start_s;
  const failuresBySegment = new Map();
  const interventionsBySegment = new Map();

  for (const failure of episode.failure_annotations) {
    const items = failuresBySegment.get(failure.segment_id) ?? [];
    items.push(failure);
    failuresBySegment.set(failure.segment_id, items);
  }
  for (const intervention of episode.interventions) {
    const items = interventionsBySegment.get(intervention.segment_id) ?? [];
    items.push(intervention);
    interventionsBySegment.set(intervention.segment_id, items);
  }

  $("timeline").innerHTML = episode.segments
    .map((segment) => {
      const left = pct(segment.start_s, duration);
      const width = Math.max(1, pct(segment.end_s - segment.start_s, duration));
      const failures = failuresBySegment.get(segment.segment_id) ?? [];
      const interventions = interventionsBySegment.get(segment.segment_id) ?? [];
      const markers = [
        ...failures.map((failure) => {
          const markerLeft = pct(failure.start_s, duration);
          return `<span class="marker failure" title="${escapeText(failure.taxonomy_id)} at ${failure.start_s}s" style="left:${markerLeft}%"></span>`;
        }),
        ...interventions.map((intervention) => {
          const markerLeft = pct(intervention.start_s, duration);
          return `<span class="marker intervention" title="${escapeText(intervention.ontology_id)} at ${intervention.start_s}s" style="left:${markerLeft}%"></span>`;
        })
      ].join("");

      return `
        <div class="timeline-row">
          <div class="timeline-label"><strong>${escapeText(segment.segment_id)}</strong><br />${escapeText(segment.phase)} ${segment.start_s}-${segment.end_s}s</div>
          <div class="track"><span class="bar" style="left:${left}%; width:${width}%"></span>${markers}</div>
        </div>`;
    })
    .join("");
}

function renderList(id, items, emptyText) {
  $(id).innerHTML = items.length ? items.join("") : `<p class="notes">${escapeText(emptyText)}</p>`;
}

function renderDetails(episode) {
  renderList(
    "failures",
    episode.failure_annotations.map(
      (failure) => `<article class="item"><strong>${escapeText(failure.taxonomy_id)}</strong><span class="pill">${escapeText(failure.severity)}</span><span class="pill">${escapeText(failure.segment_id)}</span><p>${escapeText(failure.reviewer_note)}</p></article>`
    ),
    "No failures annotated."
  );
  renderList(
    "interventions",
    episode.interventions.map(
      (intervention) => `<article class="item"><strong>${escapeText(intervention.ontology_id)}</strong><span class="pill">${escapeText(intervention.training_relevance ?? "review_required")}</span><span class="pill">${escapeText(intervention.segment_id)}</span><p>${escapeText(intervention.trigger)} ${escapeText(intervention.operator_action)}</p></article>`
    ),
    "No interventions annotated."
  );
  renderList(
    "sensor-qa",
    episode.sensor_qa.flags.map(
      (flag) => `<article class="item"><strong>${escapeText(flag.flag_id)}</strong><span class="pill">${escapeText(flag.severity)}</span><span class="pill">${escapeText(flag.recommended_action)}</span><p>${escapeText(flag.note ?? "")}</p></article>`
    ),
    "No sensor QA flags."
  );
  renderList(
    "sensors",
    episode.sensors.map(
      (sensor) => `<article class="item"><strong>${escapeText(sensor.sensor_id)}</strong><span class="pill">${escapeText(sensor.modality)}</span><span class="pill">${escapeText(sensor.frame_rate_hz)} Hz</span><span class="pill">${escapeText(sensor.calibration_status)}</span><p>${escapeText(sensor.notes ?? "No notes.")}</p></article>`
    ),
    "No sensors listed."
  );
  $("reviewer-notes").textContent = `${episode.review.reviewer_notes} ${episode.sensor_qa.reviewer_notes}`.trim();
}

function renderEpisode(episode) {
  clearError();
  validateEpisodeShape(episode);
  renderSummary(episode);
  renderTimeline(episode);
  renderDetails(episode);
}

async function loadDefaultEpisode() {
  try {
    const response = await fetch(DEFAULT_EPISODE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderEpisode(await response.json());
  } catch (error) {
    showError(`Unable to load default mock episode. Run through a local web server. ${error.message}`);
  }
}

$("episode-file").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    renderEpisode(JSON.parse(await file.text()));
  } catch (error) {
    showError(`Unable to render selected episode: ${error.message}`);
  }
});

loadDefaultEpisode();
