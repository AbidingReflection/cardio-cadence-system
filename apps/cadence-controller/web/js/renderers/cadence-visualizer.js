/**
 * Cadence visualizer responsibilities:
 * - Render normalized cadence-cycle phase.
 * - Keep cadence timing and playback state outside visual rendering.
 */

const FULL_ROTATION_DEGREES = 360;

/** Creates the cadence visualizer structure inside its owned container. */
export function initializeCadenceVisualizer(container) {
    container.innerHTML = `
    <div class="cadence-visualizer__track">
    <div class="cadence-visualizer__indicator"></div>
    </div>
    `;

    return {
        track: container.querySelector(".cadence-visualizer__track"),
        indicator: container.querySelector(".cadence-visualizer__indicator"),
    };
}

/** Renders one normalized cadence-cycle phase. */
export function renderCadenceVisualizer(visualizer, phase) {
    validatePhase(phase);

    const rotationDegrees = phase * FULL_ROTATION_DEGREES;

    visualizer.indicator.style.transform = `rotate(${rotationDegrees}deg)`;
}

/** Validates normalized cadence-cycle phase. */
function validatePhase(phase) {
    if (typeof phase !== "number" || !Number.isFinite(phase) || phase < 0 || phase >= 1) {
        throw new RangeError("Cadence visualizer phase must be within [0, 1).");
    }
}
