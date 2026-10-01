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

        currentPhase: requireElement(root, "#current-phase"),
        currentBlock: requireElement(root, "#current-block"),
        nextPhase: requireElement(root, "#next-phase"),
        nextBlock: requireElement(root, "#next-block"),

        cadenceVisualizer: requireElement(root, "#cadence-visualizer"),

        startButton: requireElement(root, "#start-button"),
        pauseButton: requireElement(root, "#pause-button"),
        resumeButton: requireElement(root, "#resume-button"),
        stopButton: requireElement(root, "#stop-button"),
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
