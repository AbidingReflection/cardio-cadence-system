/**
 * Cadence visualizer responsibilities:
 * - Render normalized cadence-cycle phase.
 * - Render the current cadence target.
 * - Render current left/right cycle-side emphasis.
 * - Keep cadence timing and playback state outside visual rendering.
 */

const FULL_ROTATION_DEGREES = 360;

/** Creates the cadence visualizer structure inside its owned container. */
export function initializeCadenceVisualizer(container) {
    container.innerHTML = `
    <div class="cadence-visualizer__cues">
    <div
    class="cadence-visualizer__cue cadence-visualizer__cue--left"
    data-active="false"
    >
    LEFT
    </div>

    <div
    class="cadence-visualizer__cue cadence-visualizer__cue--right"
    data-active="false"
    >
    RIGHT
    </div>
    </div>

    <div class="cadence-visualizer__track">
    <div class="cadence-visualizer__indicator"></div>

    <div class="cadence-visualizer__cadence">
    <span class="cadence-visualizer__cadence-value"></span>
    <span class="cadence-visualizer__cadence-unit">RPM</span>
    </div>
    </div>
    `;

    return {
        track: container.querySelector(
            ".cadence-visualizer__track",
        ),
        indicator: container.querySelector(
            ".cadence-visualizer__indicator",
        ),
        leftCue: container.querySelector(
            ".cadence-visualizer__cue--left",
        ),
        rightCue: container.querySelector(
            ".cadence-visualizer__cue--right",
        ),
        cadenceValue: container.querySelector(
            ".cadence-visualizer__cadence-value",
        ),
    };
}

/** Renders current cadence-cycle phase and cadence target. */
export function renderCadenceVisualizer(
    visualizer,
    { phase, cadenceRpm },
) {
    validatePhase(phase);
    validateCadence(cadenceRpm);

    const rotationDegrees =
    phase * FULL_ROTATION_DEGREES;

    visualizer.indicator.style.transform =
    `rotate(${rotationDegrees}deg)`;

    visualizer.cadenceValue.textContent =
    cadenceRpm.toFixed(1);

    const leftActive = phase < 0.5;

    visualizer.leftCue.dataset.active =
    String(leftActive);

    visualizer.rightCue.dataset.active =
    String(!leftActive);
}

/** Validates normalized cadence-cycle phase. */
function validatePhase(phase) {
    if (
        typeof phase !== "number" ||
        !Number.isFinite(phase) ||
        phase < 0 ||
        phase >= 1
    ) {
        throw new RangeError(
            "Cadence visualizer phase must be within [0, 1).",
        );
    }
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
