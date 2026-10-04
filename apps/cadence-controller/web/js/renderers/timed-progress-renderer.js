import { formatDuration } from "/packages/utils/format-duration.js";

import { ProgressTrack } from "../components/progress-track.js";
import { TimedProgressController } from "../controllers/timed-progress-controller.js";

/** Initializes a persistent timed progress scene. */
export function initializeTimedProgressRenderer(container) {
  const trackContainer = document.createElement("div");
  trackContainer.className = "timed-progress__track";

  const timeLabel = document.createElement("div");
  timeLabel.className = "timed-progress__time";

  const percentLabel = document.createElement("div");
  percentLabel.className = "timed-progress__percent";

  container.replaceChildren(trackContainer, timeLabel, percentLabel);

  const progressTrack = new ProgressTrack(trackContainer);
  const controller = new TimedProgressController(progressTrack);

  return {
    controller,
    progressTrack,
    timeLabel,
    percentLabel,
  };
}

/** Renders current progress within a timed interval. */
export function renderTimedProgress(
  visualizer,
  { elapsedTimeMs, durationMs, markerText },
) {
  visualizer.controller.render({
    elapsedTimeMs,
    durationMs,
    markerText,
  });

  visualizer.timeLabel.textContent = `${formatMilliseconds(elapsedTimeMs)} / ${formatMilliseconds(durationMs)}`;

  visualizer.percentLabel.textContent = `${((elapsedTimeMs / durationMs) * 100).toFixed(1)}%`;
}

/** Formats milliseconds as H:MM:SS or M:SS. */
function formatMilliseconds(timeMs) {
  return formatDuration(Math.floor(timeMs / 1000));
}
