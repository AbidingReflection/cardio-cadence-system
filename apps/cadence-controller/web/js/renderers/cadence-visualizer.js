import { ProgressionCircle } from "../components/progression-circle.js";

import { SignalBank } from "../components/signal-bank.js";

import { CycleGuidanceController } from "../controllers/cycle-guidance-controller.js";

/**
 * Cadence visualizer responsibilities:
 * - Compose generic cycle-guidance visual components.
 * - Configure elliptical left/right cadence semantics.
 * - Format the current cadence target for display.
 * - Keep cadence timing and playback state outside visual rendering.
 */

const CADENCE_CUES = [
  {
    id: "left",
    label: "LEFT",
    position: 0,
  },
  {
    id: "right",
    label: "RIGHT",
    position: 0.5,
  },
];

/** Creates the cadence visualizer structure inside its owned container. */
export function initializeCadenceVisualizer(container) {
  const signalContainer = document.createElement("div");
  signalContainer.className = "cadence-visualizer__signals";

  const circleContainer = document.createElement("div");
  circleContainer.className = "cadence-visualizer__circle";

  container.replaceChildren(signalContainer, circleContainer);

  const progressionCircle = new ProgressionCircle(circleContainer);

  const signalBank = new SignalBank(signalContainer, CADENCE_CUES);

  progressionCircle.setLabelText("RPM");

  const controller = new CycleGuidanceController(
    progressionCircle,
    signalBank,
    CADENCE_CUES,
  );

  return {
    controller,
    progressionCircle,
    signalBank,
  };
}

/** Renders current cadence-cycle phase and cadence target. */
export function renderCadenceVisualizer(visualizer, { phase, cadenceRpm }) {
  validateCadence(cadenceRpm);

  visualizer.controller.render({
    phase,
    valueText: cadenceRpm.toFixed(1),
  });
}

/** Validates a current cadence target. */
function validateCadence(cadenceRpm) {
  if (
    typeof cadenceRpm !== "number" ||
    !Number.isFinite(cadenceRpm) ||
    cadenceRpm < 0
  ) {
    throw new RangeError(
      "Cadence visualizer RPM must be a non-negative finite number.",
    );
  }
}
