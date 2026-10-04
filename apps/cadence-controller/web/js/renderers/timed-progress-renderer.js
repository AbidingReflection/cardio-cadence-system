import { ProgressTrack } from "../components/progress-track.js";
import { TimedProgressController } from "../controllers/timed-progress-controller.js";

/** Initializes a persistent timed progress scene. */
export function initializeTimedProgressRenderer(container) {
  const progressTrack = new ProgressTrack(container);

  const controller = new TimedProgressController(progressTrack);

  return {
    controller,
    progressTrack,
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
}
