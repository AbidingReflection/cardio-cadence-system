import { ProgressionCircle } from "../components/progression-circle.js";
import { LoadGuidanceController } from "../controllers/load-guidance-controller.js";

/** Initializes the persistent load-guidance visualizer scene. */
export function initializeLoadVisualizer(container) {
  const progressionCircle = new ProgressionCircle(container);

  progressionCircle.setLabelText("LOAD");

  const controller = new LoadGuidanceController(progressionCircle);

  return {
    controller,
    progressionCircle,
  };
}

/** Renders resolved load-segment guidance into the persistent visualizer. */
export function renderLoadVisualizer(visualizer, { value, progress }) {
  visualizer.controller.render({
    progress,
    valueText: String(value),
  });
}
