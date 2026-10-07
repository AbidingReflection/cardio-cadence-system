/**
 * Application element responsibilities:
 * - Resolve the Cadence Controller DOM elements required by application wiring.
 * - Fail immediately when required application elements are missing.
 */

/** Returns the required Cadence Controller application elements. */
export function getAppElements(root = document) {
    return {
        protocolTitle: requireElement(root, "#protocol-title"),

        playbackState: requireElement(root, "#playback-state"),
        countdown: requireElement(root, "#countdown"),

        elapsedTime: requireElement(root, "#elapsed-time"),
        remainingTime: requireElement(root, "#remaining-time"),
        phaseRemainingTime: requireElement(root, "#phase-remaining-time"),

        currentPhase: requireElement(root, "#current-phase"),
        currentBlock: requireElement(root, "#current-block"),
        nextPhase: requireElement(root, "#next-phase"),
        nextBlock: requireElement(root, "#next-block"),

        cadenceVisualizer: requireElement(root, "#cadence-visualizer"),

        loadVisualizer: requireElement(root, "#load-visualizer"),

        blockProgress: requireElement(root, "#block-progress"),
        workoutProgress: requireElement(root, "#workout-progress"),
        phaseProgress: requireElement(root, "#phase-progress"),

        startButton: requireElement(root, "#start-button"),
        pauseButton: requireElement(root, "#pause-button"),
        resumeButton: requireElement(root, "#resume-button"),
        stopButton: requireElement(root, "#stop-button"),
        changeWorkoutButton: requireElement(root, "#change-workout-button"),

        changeWorkoutPanel: requireElement(root, "#change-workout-panel"),
        skipBlockButton: requireElement(root, "#skip-block-button"),
        skipPhaseButton: requireElement(root, "#skip-phase-button"),
        cancelChangeWorkoutButton: requireElement(root, "#cancel-change-workout-button"),

        finishBlockSkipPhaseButton: requireElement(root, "#finish-block-skip-phase-button"),
        finishBlockEndWorkoutButton: requireElement(root, "#finish-block-end-workout-button"),
        cancelPendingActionButton: requireElement(root, "#cancel-pending-action-button"),
    };
}

/** Returns one required element or throws when the selector cannot be resolved. */
function requireElement(root, selector) {
    const element = root.querySelector(selector);

    if (element === null) {
        throw new Error(`Required Cadence Controller element not found: ${selector}`);
    }

    return element;
}
