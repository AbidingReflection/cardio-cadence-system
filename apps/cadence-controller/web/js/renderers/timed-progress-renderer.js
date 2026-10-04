import { formatDurationFixedMs } from "/packages/utils/format-duration.js";

import { ProgressTrack } from "../components/progress-track.js";
import { TimedProgressController } from "../controllers/timed-progress-controller.js";

/** Initializes a persistent timed progress scene. */
export function initializeTimedProgressRenderer(container) {
  const trackContainer = document.createElement("div");
  trackContainer.className = "timed-progress__track";

  const timeLabel = document.createElement("div");
  timeLabel.className = "timed-progress__time";

  const remainingTimeLabel = document.createElement("span");
  remainingTimeLabel.className = "timed-progress__remaining";

  const timeSeparator = document.createElement("span");
  timeSeparator.className = "timed-progress__separator";
  timeSeparator.textContent = "/";

  const durationLabel = document.createElement("span");
  durationLabel.className = "timed-progress__duration";

  timeLabel.append(remainingTimeLabel, timeSeparator, durationLabel);

  const percentLabel = document.createElement("div");
  percentLabel.className = "timed-progress__percent";

  container.replaceChildren(trackContainer, timeLabel, percentLabel);

  const progressTrack = new ProgressTrack(trackContainer);
  const controller = new TimedProgressController(progressTrack);

  return {
    controller,
    progressTrack,
    timeLabel,
    remainingTimeLabel,
    durationLabel,
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

  const remainingTimeMs = durationMs - elapsedTimeMs;

  visualizer.remainingTimeLabel.textContent = `-${formatDurationFixedMs(remainingTimeMs)}`;

  visualizer.durationLabel.textContent = formatDurationFixedMs(durationMs);

  visualizer.percentLabel.textContent = `${((elapsedTimeMs / durationMs) * 100).toFixed(1)}%`;
}
