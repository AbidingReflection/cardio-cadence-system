/** Coordinates generic load-guidance visuals from normalized segment state. */
export class LoadGuidanceController {
  #progressionCircle;

  /** Creates load guidance for the supplied progression circle. */
  constructor(progressionCircle) {
    this.#progressionCircle = progressionCircle;
  }

  /** Renders the current normalized load-segment state. */
  render({ progress, valueText }) {
    validateProgress(progress);

    this.#progressionCircle.setMarkerPosition(progress === 1 ? 0 : progress);

    this.#progressionCircle.setProgress(progress);
    this.#progressionCircle.setValueText(valueText);
  }
}

/** Validates normalized load-segment progress in the closed interval [0, 1]. */
function validateProgress(progress) {
  if (
    typeof progress !== "number" ||
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 1
  ) {
    throw new RangeError(
      "Load guidance progress must be a finite number in [0, 1].",
    );
  }
}
