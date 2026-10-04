import { ProgressionCircle } from "../components/progression-circle.js";
import { LoadGuidanceController } from "../controllers/load-guidance-controller.js";

/** Initializes the persistent load-guidance visualizer scene. */
export function initializeLoadVisualizer(container) {
  const statusContainer = document.createElement("div");
  statusContainer.className = "load-visualizer__status";

  const circleContainer = document.createElement("div");
  circleContainer.className = "load-visualizer__circle";

  container.replaceChildren(statusContainer, circleContainer);

  const progressionCircle = new ProgressionCircle(circleContainer);

  progressionCircle.setLabelText("LOAD");

  const controller = new LoadGuidanceController(progressionCircle);

  return {
    controller,
    progressionCircle,
    statusContainer,
  };
}

/** Renders resolved load-segment guidance into the persistent visualizer. */
export function renderLoadVisualizer(visualizer, { value, progress }) {
  visualizer.controller.render({
    progress,
    valueText: String(value),
  });
}
